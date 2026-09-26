import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

/**
 * Destination safety for monitored URLs.
 *
 * Users control `endpointUrl` and the server requests it, so every destination is validated by
 * the ADDRESS IT RESOLVES TO (not by hostname strings) and again on every redirect hop. Validation
 * happens inside the socket's DNS lookup, so the address that is checked is the address that is
 * connected to (no resolve-then-connect gap for DNS rebinding).
 */

export const MONITOR_USER_AGENT = "RuntimeHQ-Monitor/1.0";

/** Maximum monitors per user. Keeps the scheduled outbound request volume bounded. */
export const MAX_SERVICES_PER_USER = 25;

export type FailureKind =
  | "TIMEOUT"
  | "DNS_FAILURE"
  | "NETWORK_ERROR"
  | "BLOCKED_DESTINATION"
  | "TOO_MANY_REDIRECTS";

export class GuardedRequestError extends Error {
  constructor(public readonly kind: FailureKind) {
    super(kind);
    this.name = "GuardedRequestError";
  }
}

const blocked = new net.BlockList();

const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT (also Alibaba metadata 100.100.100.200)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

const BLOCKED_V6: Array<[string, number]> = [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64
  ["100::", 64], // discard
  ["2001::", 32], // Teredo
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["fc00::", 7], // unique local (includes AWS fd00:ec2::254 metadata)
  ["fe80::", 10], // link-local
  ["ff00::", 8], // multicast
];

for (const [addr, prefix] of BLOCKED_V4) blocked.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of BLOCKED_V6) blocked.addSubnet(addr, prefix, "ipv6");

function unwrapMappedV4(address: string): string | null {
  const lower = address.toLowerCase();
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return null;
}

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    const mapped = unwrapMappedV4(address);
    if (mapped) return blocked.check(mapped, "ipv4");
    return blocked.check(address, "ipv6");
  }
  return true; // not an IP: never trust
}

function stripBrackets(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

export type UrlValidation = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Save-time validation (create/update). The connection-time guard below stays authoritative,
 * because DNS can change after a URL is saved.
 */
export async function validateMonitoringUrl(raw: string): Promise<UrlValidation> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Enter a valid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http:// and https:// URLs can be monitored" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs with embedded credentials are not supported" };
  }

  const host = stripBrackets(url.hostname).replace(/\.$/, "").toLowerCase();
  if (!host) return { ok: false, reason: "Enter a valid URL" };

  const denied = { ok: false, reason: "This address is not allowed. Only public hosts can be monitored" } as const;

  if (net.isIP(host)) {
    return isBlockedAddress(host) ? denied : { ok: true, url };
  }
  if (host === "localhost" || host.endsWith(".localhost")) return denied;

  try {
    const addresses = await dns.promises.lookup(host, { all: true, verbatim: true });
    if (addresses.some((entry) => isBlockedAddress(entry.address))) return denied;
  } catch {
    // Not resolvable right now: allowed (it will simply be reported as an outage).
    // The address is re-validated at connection time on every check.
  }
  return { ok: true, url };
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string | dns.LookupAddress[],
  family?: number,
) => void;

function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: LookupCallback,
): void {
  dns.lookup(hostname, { ...options, all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((entry) => isBlockedAddress(entry.address))) {
      return callback(new GuardedRequestError("BLOCKED_DESTINATION") as unknown as NodeJS.ErrnoException);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

interface Hop {
  status: number;
  location?: string;
}

function requestOnce(url: URL, deadline: number): Promise<Hop> {
  return new Promise<Hop>((resolve, reject) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return reject(new GuardedRequestError("TIMEOUT"));

    const host = stripBrackets(url.hostname);
    if (net.isIP(host) && isBlockedAddress(host)) {
      return reject(new GuardedRequestError("BLOCKED_DESTINATION"));
    }

    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: "GET",
        headers: { "user-agent": MONITOR_USER_AGENT, accept: "*/*" },
        lookup: guardedLookup as unknown as net.LookupFunction,
        agent: false,
      },
      (res) => {
        clearTimeout(timer);
        const hop: Hop = { status: res.statusCode ?? 0, location: res.headers.location };
        res.on("error", () => {});
        res.destroy(); // headers are enough; never download the body
        resolve(hop);
      },
    );

    const timer = setTimeout(() => req.destroy(new GuardedRequestError("TIMEOUT")), remaining);
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    req.end();
  });
}

function classify(err: unknown): GuardedRequestError {
  if (err instanceof GuardedRequestError) return err;
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || code === "ENODATA") {
    return new GuardedRequestError("DNS_FAILURE");
  }
  if (code === "ETIMEDOUT") return new GuardedRequestError("TIMEOUT");
  return new GuardedRequestError("NETWORK_ERROR");
}

export interface GuardedResponse {
  status: number;
  latencyMs: number;
  redirects: number;
}

export interface GuardedRequestOptions {
  timeoutMs?: number;
  maxRedirects?: number;
}

/**
 * GET a URL with SSRF protection. Redirects are followed manually so every hop is validated
 * with the same rules; the whole exchange shares one time budget.
 */
export async function guardedRequest(
  rawUrl: string,
  { timeoutMs = 3000, maxRedirects = 5 }: GuardedRequestOptions = {},
): Promise<GuardedResponse> {
  const started = Date.now();
  const deadline = started + timeoutMs;

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new GuardedRequestError("NETWORK_ERROR");
  }
  if (current.protocol !== "http:" && current.protocol !== "https:") {
    throw new GuardedRequestError("BLOCKED_DESTINATION");
  }

  for (let redirects = 0; ; redirects++) {
    let hop: Hop;
    try {
      hop = await requestOnce(current, deadline);
    } catch (err) {
      throw classify(err);
    }

    if (REDIRECT_STATUSES.has(hop.status) && hop.location) {
      if (redirects >= maxRedirects) throw new GuardedRequestError("TOO_MANY_REDIRECTS");
      let next: URL;
      try {
        next = new URL(hop.location, current);
      } catch {
        throw new GuardedRequestError("NETWORK_ERROR");
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new GuardedRequestError("BLOCKED_DESTINATION");
      }
      current = next;
      continue;
    }

    return { status: hop.status, latencyMs: Date.now() - started, redirects };
  }
}
