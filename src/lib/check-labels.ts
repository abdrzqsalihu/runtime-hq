export interface CheckLike {
  httpStatus: number | null;
  latencyMs: number | null;
  message?: string | null;
  status?: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
}

// Why a check with no HTTP response failed (ServiceCheck.message). Older rows stored "CHECK_FAILED".
const FAILURE_LABELS: Record<string, string> = {
  TIMEOUT: "HTTP TIMEOUT",
  DNS_FAILURE: "DNS FAILURE",
  NETWORK_ERROR: "NETWORK ERROR",
  BLOCKED_DESTINATION: "BLOCKED DESTINATION",
  TOO_MANY_REDIRECTS: "TOO MANY REDIRECTS",
};

/** "HTTP 200", "HTTP TIMEOUT", "DNS FAILURE", ... */
export function checkResultLabel(check: CheckLike): string {
  if (check.httpStatus !== null && check.httpStatus !== undefined) return `HTTP ${check.httpStatus}`;
  return FAILURE_LABELS[check.message ?? ""] ?? "NO RESPONSE";
}

/** "HTTP 200 • 118ms" / "HTTP TIMEOUT • 3001ms" */
export function checkSummary(check: CheckLike): string {
  const latency = check.latencyMs !== null && check.latencyMs !== undefined ? `${check.latencyMs}ms` : "—";
  return `${checkResultLabel(check)} • ${latency}`;
}
