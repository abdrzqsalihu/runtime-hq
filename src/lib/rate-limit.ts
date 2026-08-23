/**
 * Rate limiting for health checks.
 *
 * STORAGE LAYER: Process-local in-memory Map
 * This implementation stores cooldown state in Node.js process memory.
 * It is suitable for the current single-instance development deployment.
 *
 * LIMITATIONS:
 * - Cooldown state is lost on server restart
 * - Cooldown does NOT persist across multiple server instances (load-balanced environments)
 * - For multi-instance production deployments, this layer should be replaced with a
 *   shared store (Redis, database, etc.)
 *
 * REPLACING THIS IMPLEMENTATION:
 * To use Redis or database-backed storage later:
 * 1. Replace the internal storage mechanism (Map → redis.get/set or database queries)
 * 2. Keep the function signatures identical (no changes needed to consumers)
 * 3. The API endpoint and frontend will continue to work without modification
 *
 * CONSUMERS: POST /api/services/:serviceId/check endpoint
 * The check endpoint calls: canCheckNow(), getRemainingCooldown(), markCheckInProgress(), recordCheckComplete()
 * It does NOT depend on how the state is stored internally.
 */

interface CheckTimeEntry {
  timestamp: number;
  inProgress: boolean;
}

const checkTimes = new Map<string, CheckTimeEntry>();

const COOLDOWN_MS = 45000; // 45 seconds

/**
 * Get the remaining cooldown time in milliseconds for a service.
 * Returns -1 if a check is currently in progress (special value).
 * Returns 0 if cooldown has expired or service has never been checked.
 */
export function getRemainingCooldown(serviceId: string): number {
  const entry = checkTimes.get(serviceId);
  if (!entry) return 0;

  if (entry.inProgress) {
    return -1; // Special value indicating a check is in progress
  }

  const elapsed = Date.now() - entry.timestamp;
  const remaining = COOLDOWN_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Check if a service can be checked now (cooldown expired and no check in progress).
 * Enforced server-side; cannot be bypassed by page refresh, multiple tabs, or direct API calls
 * within the same server instance.
 */
export function canCheckNow(serviceId: string): boolean {
  const entry = checkTimes.get(serviceId);
  if (!entry) return true;
  if (entry.inProgress) return false;
  const elapsed = Date.now() - entry.timestamp;
  return elapsed >= COOLDOWN_MS;
}

/**
 * Record that a check is starting for a service.
 * Prevents concurrent checks and marks the service as "checking".
 */
export function markCheckInProgress(serviceId: string): void {
  checkTimes.set(serviceId, { timestamp: Date.now(), inProgress: true });
}

/**
 * Record that a check has completed for a service.
 * Starts the cooldown period; subsequent checks will be rate-limited until COOLDOWN_MS expires.
 */
export function recordCheckComplete(serviceId: string): void {
  checkTimes.set(serviceId, { timestamp: Date.now(), inProgress: false });
}
