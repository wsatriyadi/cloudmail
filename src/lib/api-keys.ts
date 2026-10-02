// Shared API key limits. Imported by both server routes and client components,
// so this module must stay free of Node/db imports.

export const RATE_LIMIT_MIN = 1;
export const RATE_LIMIT_MAX = 100000;

export function parseRateLimit(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isInteger(num)) return null;
  if (num < RATE_LIMIT_MIN || num > RATE_LIMIT_MAX) return null;
  return num;
}

export const RATE_LIMIT_ERROR = `Rate limit harus bilangan bulat antara ${RATE_LIMIT_MIN} dan ${RATE_LIMIT_MAX}`;
