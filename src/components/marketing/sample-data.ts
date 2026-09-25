// Sample data for the landing page. Nothing here is fetched or belongs to a real account.

// o = operational, d = degraded, x = outage, . = never checked
export type Cell = "o" | "d" | "x" | ".";

export const STATE_META: Record<Cell, { label: string; text: string; bg: string; dot: string }> = {
  o: { label: "OPERATIONAL", text: "text-success", bg: "bg-success", dot: "bg-success" },
  d: { label: "DEGRADED", text: "text-warning", bg: "bg-warning", dot: "bg-warning" },
  x: { label: "OUTAGE", text: "text-error", bg: "bg-error", dot: "bg-error" },
  ".": {
    label: "AWAITING_CHECK",
    text: "text-foreground/40",
    bg: "bg-foreground/15",
    dot: "bg-foreground/30",
  },
};

export const ok = (n: number) => "o".repeat(n);

// Hero instrument: each cycle is one scheduled check of every service that has been checked.
export interface InstrumentService {
  name: string;
  endpoint: string;
  base: string; // 30 cells, ending at cycle 0
  state: Cell;
  http: string;
  latencies: number[]; // one per cycle
}

export const CYCLE_TIMES = ["10:35:02", "10:40:01", "10:45:03", "10:50:02", "10:55:02", "11:00:01", "11:05:03"];

export const INSTRUMENT_SERVICES: InstrumentService[] = [
  {
    name: "ORDERS_API",
    endpoint: "api.example.com/orders/health",
    base: ok(30),
    state: "o",
    http: "200",
    latencies: [117, 121, 114, 119, 116, 122, 118],
  },
  {
    name: "PAYMENTS_API",
    endpoint: "pay.example.com/status",
    base: ok(22) + "d".repeat(8),
    state: "d",
    http: "429",
    latencies: [842, 815, 860, 831, 849, 822, 838],
  },
  {
    name: "AUTH_API",
    endpoint: "auth.example.com/health",
    base: ok(13) + "d" + ok(16),
    state: "o",
    http: "200",
    latencies: [94, 97, 92, 99, 95, 93, 96],
  },
  {
    name: "WEBHOOK_INGEST",
    endpoint: "hooks.example.com/ping",
    base: ".".repeat(30),
    state: ".",
    http: "",
    latencies: [],
  },
];

export const CHECK_LOG = [
  { time: "10:35:02", result: "HTTP 200", latency: "118ms", state: "o" as Cell },
  { time: "10:30:01", result: "HTTP 200", latency: "124ms", state: "o" as Cell },
  { time: "10:25:02", result: "HTTP 200", latency: "109ms", state: "o" as Cell },
  { time: "10:20:01", result: "HTTP timeout", latency: "3001ms", state: "x" as Cell },
  { time: "10:15:02", result: "HTTP 200", latency: "121ms", state: "o" as Cell },
];

// Lifecycle: ORDERS_API on a 09:00:00 → 09:22:30 axis
export const LIFECYCLE_SEGMENTS: { from: number; to: number; state: Cell }[] = [
  { from: 0, to: 904 / 1350, state: "o" },
  { from: 904 / 1350, to: 1216 / 1350, state: "x" },
  { from: 1216 / 1350, to: 1, state: "o" },
];

export const LIFECYCLE_STEPS: {
  label: string;
  time: string;
  state: Cell;
  result?: string;
  detail: string;
}[] = [
  { label: "Service_Health", time: "09:00:03", state: "o", result: "HTTP 200 • 118ms", detail: "Checks pass and the service is operational." },
  { label: "Check_Fails", time: "09:15:04", state: "x", result: "HTTP timeout • 3001ms", detail: "The state becomes outage." },
  { label: "Incident_Opens", time: "09:15:04", state: "x", result: "CRITICAL", detail: "Outage detected: Service unavailable. Opened automatically." },
  { label: "Service_Recovers", time: "09:20:16", state: "o", result: "HTTP 200 • 118ms", detail: "A later check succeeds." },
  { label: "Incident_Resolves", time: "09:20:16", state: "o", result: "Duration 5m 12s", detail: "Service recovered and incident automatically resolved." },
];
