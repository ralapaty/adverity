export const SIGN_IN_LIMIT = 8;
export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
export const HSTS_VALUE = "max-age=15552000";

export function hstsValue(env: { NODE_ENV?: string }): string | null {
  return env.NODE_ENV === "production" ? HSTS_VALUE : null;
}

export function signInBlocked(failureTimes: number[], now: number): boolean {
  const cutoff = now - SIGN_IN_WINDOW_MS;
  return failureTimes.filter((time) => time > cutoff).length >= SIGN_IN_LIMIT;
}

export function retentionDays(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return 90;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) return 90;
  return parsed;
}

export function retentionCutoff(days: number, now: number): string | null {
  if (days === 0) return null;
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export function clientAddress(header: string | null): string {
  const first = header?.split(",")[0]?.trim() ?? "";
  if (!first) return "unknown";
  return first.slice(0, 80);
}
