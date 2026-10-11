// Link click tracking (opt-in).
//
// When TRACKING_BASE_URL is set (the public URL of THIS backend), DM buttons
// point to `${TRACKING_BASE_URL}/r/{mediaId}/{linkIndex}`. That route looks the
// destination up from the post mapping on the server (so it can never be used
// as an open redirect), counts the click and redirects. Without the env var
// everything keeps linking directly, exactly as before.

import { dateKey } from "./user-analytics.service.js";
import type { DailyClicks } from "./firebase-admin.service.js";

export function trackingBaseUrl(values: NodeJS.ProcessEnv = process.env): string | null {
  const raw = values.TRACKING_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

export function buildTrackedUrl(base: string, mediaId: string, index: number): string {
  return `${base}/r/${encodeURIComponent(mediaId)}/${index}`;
}

/** Link-preview bots would inflate counts. Real people in Instagram's in-app browser are NOT matched. */
export function isCrawlerUserAgent(ua: string | undefined | null): boolean {
  if (!ua) return false;
  return /facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|bot\b|crawler|spider|preview|curl\/|wget\//i.test(ua);
}

export function lastDates(days: number, now: number = Date.now()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dateKey(now - i * 24 * 60 * 60 * 1000));
  return out;
}

export interface ClickSummary {
  total: number;
  daily: { date: string; clicks: number }[];
  byPost: { mediaId: string; label: string; clicks: number; byLink: { index: number; clicks: number }[] }[];
}

export function summarizeClicks(daily: DailyClicks[], labels: Map<string, string>): ClickSummary {
  const perPost = new Map<string, Map<number, number>>();
  const days = daily.map((d) => {
    let clicks = 0;
    for (const [mediaId, links] of Object.entries(d.byPost)) {
      for (const [idx, n] of Object.entries(links)) {
        clicks += n;
        const post = perPost.get(mediaId) ?? new Map<number, number>();
        post.set(Number(idx), (post.get(Number(idx)) ?? 0) + n);
        perPost.set(mediaId, post);
      }
    }
    return { date: d.date, clicks };
  });

  const byPost = [...perPost.entries()]
    .map(([mediaId, links]) => ({
      mediaId,
      label: labels.get(mediaId) ?? `Instagram post ${mediaId}`,
      clicks: [...links.values()].reduce((a, b) => a + b, 0),
      byLink: [...links.entries()].map(([index, clicks]) => ({ index, clicks })).sort((a, b) => a.index - b.index),
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return { total: days.reduce((a, d) => a + d.clicks, 0), daily: days, byPost };
}

// ---------------------------------------------------------------------------
// Self-check: TRACKING_BASE_URL must point at THIS backend. If it points anywhere
// else (for example at the website) every DM button would 404, so the system
// verifies the address and silently falls back to direct job links.
// ---------------------------------------------------------------------------

export interface TrackingCheck {
  ok: boolean;
  /** Short machine-readable reason when ok is false. */
  problem: "points_to_website" | "not_this_backend" | "unreachable" | null;
  detail: string | null;
  checkedAt: number;
}

const DEFAULT_SITE_HOSTS = ["hire-daily.vercel.app"];

export async function verifyTrackingBase(
  base: string,
  opts: { fetchImpl?: typeof fetch; siteHosts?: string[]; now?: number } = {},
): Promise<TrackingCheck> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now();
  let host = "";
  try {
    host = new URL(base).host.toLowerCase();
  } catch {
    return { ok: false, problem: "unreachable", detail: "TRACKING_BASE_URL is not a valid URL", checkedAt: now };
  }
  const siteHosts = (opts.siteHosts ?? DEFAULT_SITE_HOSTS).map((h) => h.toLowerCase());
  if (siteHosts.includes(host)) {
    return { ok: false, problem: "points_to_website", detail: `${host} is the website, not the backend`, checkedAt: now };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // Index 9 is out of range, so the route redirects home without counting anything.
    const res = await fetchImpl(`${base}/r/healthcheck/9`, { redirect: "manual", signal: controller.signal });
    const isRoute = res.headers.get("x-hd-click-route") === "1";
    if (isRoute && res.status >= 300 && res.status < 400) {
      return { ok: true, problem: null, detail: null, checkedAt: now };
    }
    return { ok: false, problem: "not_this_backend", detail: `${host} answered ${res.status} without the click route`, checkedAt: now };
  } catch {
    return { ok: false, problem: "unreachable", detail: `Could not reach ${host}`, checkedAt: now };
  } finally {
    clearTimeout(timer);
  }
}

let trackingCheckCache: { base: string; check: TrackingCheck } | null = null;

/** Cached verification: 10 minutes when conclusive, 1 minute when the network failed. */
export async function getTrackingCheck(
  opts: { values?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; siteHosts?: string[]; now?: number } = {},
): Promise<{ base: string | null; check: TrackingCheck | null }> {
  const base = trackingBaseUrl(opts.values);
  if (!base) return { base: null, check: null };
  const now = opts.now ?? Date.now();
  const cached = trackingCheckCache;
  if (cached && cached.base === base) {
    const ttl = cached.check.problem === "unreachable" ? 60_000 : 10 * 60_000;
    if (now - cached.check.checkedAt < ttl) return { base, check: cached.check };
  }
  const check = await verifyTrackingBase(base, { fetchImpl: opts.fetchImpl, siteHosts: opts.siteHosts, now });
  trackingCheckCache = { base, check };
  return { base, check };
}

/** The base URL to use for tracked links, or null when tracking is off or misconfigured. */
export async function getVerifiedTrackingBase(): Promise<string | null> {
  try {
    const { base, check } = await getTrackingCheck({ siteHosts: siteHostsFromEnv() });
    return base && check?.ok ? base : null;
  } catch {
    return null;
  }
}

export function siteHostsFromEnv(values: NodeJS.ProcessEnv = process.env): string[] {
  const hosts = [...DEFAULT_SITE_HOSTS];
  for (const key of ["PUBLIC_APP_URL", "VITE_PUBLIC_APP_URL", "SITE_URL"]) {
    try {
      const v = values[key]?.trim();
      if (v) hosts.push(new URL(v).host);
    } catch {
      // ignore malformed values
    }
  }
  return hosts;
}

/** Test helper. */
export function resetTrackingCheckCache(): void {
  trackingCheckCache = null;
}
