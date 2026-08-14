export type JobDateState = {
  postedAt: number | null;
  updatedAt: number | null;
  applyBy: string | null;
  applyByTime: number | null;
  expired: boolean;
  closesToday: boolean;
  relativePosted: string | null;
};

function validTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function validDateOnly(value?: string | null): number | null {
  if (!value?.trim()) return null;

  const normalized = value.trim();
  const parsed = new Date(`${normalized}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function formatRelativeTime(deltaMs: number): string | null {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return null;

  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export function getJobDateState(
  createdAt?: number,
  updatedAt?: number,
  lastDate?: string | null,
  now = Date.now(),
): JobDateState {
  const postedAt = validTimestamp(createdAt);
  const updated = validTimestamp(updatedAt);
  const applyByTime = validDateOnly(lastDate);

  const expired = applyByTime !== null && applyByTime < now;
  const closesToday =
    applyByTime !== null &&
    !expired &&
    new Date(applyByTime).toDateString() === new Date(now).toDateString();

  // Never produce a misleading "X ago" value for a future postedAt.
  const relativePosted =
    postedAt === null || postedAt > now
      ? null
      : formatRelativeTime(now - postedAt);

  return {
    postedAt,
    updatedAt: updated,
    applyBy: lastDate?.trim() || null,
    applyByTime,
    expired,
    closesToday,
    relativePosted,
  };
}

export function formatJobDate(value?: string | number | null): string | null {
  if (value === null || value === undefined || value === "") return null;

  const date =
    typeof value === "number"
      ? new Date(value)
      : new Date(`${value.trim()}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
