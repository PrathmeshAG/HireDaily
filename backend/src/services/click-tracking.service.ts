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
