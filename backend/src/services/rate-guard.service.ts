// Hourly send caps + a small random pause between the public reply and the DM,
// so the account behaves less like a bot. Both are env-configurable.
//
//   AUTOMATION_MAX_COMMENTS_PER_HOUR  (default 0 = unlimited)
//   AUTOMATION_MAX_DMS_PER_HOUR       (default 0 = unlimited)
// The caps count the WHOLE account (all posts together), not one post.
// They are opt-in: nothing is limited unless you set them.
//   AUTOMATION_DELAY_MIN_MS / AUTOMATION_DELAY_MAX_MS (default 800 / 2500, 0/0 = off)

import { reserveHourlySlot } from "./firebase-admin.service.js";

function intEnv(values: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = values[key]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export function capsFromEnv(values: NodeJS.ProcessEnv = process.env): { comment: number; dm: number } {
  return {
    comment: intEnv(values, "AUTOMATION_MAX_COMMENTS_PER_HOUR", 0),
    dm: intEnv(values, "AUTOMATION_MAX_DMS_PER_HOUR", 0),
  };
}

export function delayRangeFromEnv(values: NodeJS.ProcessEnv = process.env): { min: number; max: number } {
  const min = Math.min(intEnv(values, "AUTOMATION_DELAY_MIN_MS", 800), 5000);
  const max = Math.min(Math.max(intEnv(values, "AUTOMATION_DELAY_MAX_MS", 2500), min), 5000);
  return { min, max };
}

export function randomDelayMs(min: number, max: number, rnd: () => number = Math.random): number {
  if (max <= 0) return 0;
  return Math.round(min + rnd() * (max - min));
}

export async function pauseBetweenActions(dryRun: boolean): Promise<number> {
  if (dryRun) return 0;
  const { min, max } = delayRangeFromEnv();
  const ms = randomDelayMs(min, max);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
  return ms;
}

/** Reserves one send in the current hour. Dry-run never counts or blocks. */
export async function reserveSend(kind: "comment" | "dm", dryRun: boolean): Promise<{ allowed: boolean; cap: number }> {
  const cap = capsFromEnv()[kind];
  if (dryRun || cap <= 0) return { allowed: true, cap };
  try {
    const slot = await reserveHourlySlot(kind, cap);
    return { allowed: slot.allowed, cap };
  } catch {
    // Never block a real reply because the counter could not be read.
    return { allowed: true, cap };
  }
}
