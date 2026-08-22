interface CheckTimeEntry {
  timestamp: number;
  inProgress: boolean;
}

const checkTimes = new Map<string, CheckTimeEntry>();

const COOLDOWN_MS = 45000; // 45 seconds

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

export function canCheckNow(serviceId: string): boolean {
  const entry = checkTimes.get(serviceId);
  if (!entry) return true;
  if (entry.inProgress) return false;
  const elapsed = Date.now() - entry.timestamp;
  return elapsed >= COOLDOWN_MS;
}

export function markCheckInProgress(serviceId: string): void {
  checkTimes.set(serviceId, { timestamp: Date.now(), inProgress: true });
}

export function recordCheckComplete(serviceId: string): void {
  checkTimes.set(serviceId, { timestamp: Date.now(), inProgress: false });
}
