// Manual outreach for the admin: find a person's comment on a post (straight
// from Instagram, so comments the webhook never delivered are found too), see
// what the automation logged for that person, and send the job DM, a custom DM
// or a custom public reply by hand.
//
// What Instagram allows (cannot be bypassed):
//   - a DM to someone who has NOT messaged you is only possible as the one
//     "private reply" to one of their comments, within about 7 days of the comment;
//   - a DM straight to a person needs them to have messaged you in the last 24 hours.

import type { RawLog } from "./firebase-admin.service.js";

const GRAPH = "https://graph.instagram.com/v24.0";

export interface PostComment {
  commentId: string;
  text: string;
  username: string;
  userId: string | null;
  /** Unix ms. */
  timestamp: number;
}

export interface CommentStatus {
  reply: "success" | "failed" | "none";
  dm: "success" | "failed" | "none";
  lastError: string | null;
}

export interface TimelineEntry {
  at: number;
  type: string;
  detail: string | null;
  error: string | null;
  mediaId: string | null;
  commentStatus: string | null;
  dmStatus: string | null;
}

/**
 * Reads comments of one media item from Instagram (up to `maxPages` pages of 50).
 * Only follows paging links that stay on graph.instagram.com.
 */
export async function fetchPostComments(opts: {
  mediaId: string;
  token: string;
  ownUserId?: string;
  username?: string;
  fetchImpl?: typeof fetch;
  maxPages?: number;
}): Promise<{ comments: PostComment[]; error: string | null }> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const wanted = (opts.username ?? "").trim().replace(/^@/, "").toLowerCase();
  const out: PostComment[] = [];
  let url: string | null = `${GRAPH}/${encodeURIComponent(opts.mediaId)}/comments?fields=id,text,username,timestamp,from&limit=50`;

  for (let page = 0; url && page < (opts.maxPages ?? 3); page += 1) {
    let res: Response;
    try {
      res = await fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${opts.token}` } });
    } catch {
      return { comments: out, error: "network_error" };
    }
    const json = (await res.json().catch(() => null)) as {
      data?: { id?: string; text?: string; username?: string; timestamp?: string; from?: { id?: string } }[];
      paging?: { next?: string };
      error?: { message?: string };
    } | null;
    if (!res.ok || !json) {
      const msg = json?.error?.message;
      return { comments: out, error: typeof msg === "string" ? msg.slice(0, 160) : `meta_http_${res.status}` };
    }
    for (const c of json.data ?? []) {
      if (!c.id) continue;
      const username = c.username ?? "";
      if (opts.ownUserId && c.from?.id === opts.ownUserId) continue;
      if (wanted && !username.toLowerCase().includes(wanted)) continue;
      const ts = c.timestamp ? Date.parse(c.timestamp) : NaN;
      out.push({ commentId: c.id, text: c.text ?? "", username, userId: c.from?.id ?? null, timestamp: Number.isFinite(ts) ? ts : 0 });
    }
    const next: string | undefined = json.paging?.next;
    url = next && next.startsWith("https://graph.instagram.com/") ? next : null;
  }
  return { comments: out.sort((a, b) => b.timestamp - a.timestamp), error: null };
}

/** Per-comment outcome derived from the reply / DM log entries that carry a commentId. */
export function commentStatuses(commentIds: string[], logs: RawLog[]): Map<string, CommentStatus> {
  const result = new Map<string, CommentStatus>();
  for (const id of commentIds) result.set(id, { reply: "none", dm: "none", lastError: null });

  const latest = new Map<string, { reply: RawLog | null; dm: RawLog | null }>();
  for (const log of logs) {
    if (!log.commentId || log.dryRun || !result.has(log.commentId)) continue;
    const slot = latest.get(log.commentId) ?? { reply: null, dm: null };
    if (log.type === "comment_sent" && (!slot.reply || log.timestamp >= slot.reply.timestamp)) slot.reply = log;
    if (log.type === "dm_sent" && (!slot.dm || log.timestamp >= slot.dm.timestamp)) slot.dm = log;
    latest.set(log.commentId, slot);
  }
  for (const [id, slot] of latest) {
    const status = result.get(id)!;
    if (slot.reply?.commentStatus === "success") status.reply = "success";
    else if (slot.reply?.commentStatus === "failed") status.reply = "failed";
    if (slot.dm?.dmStatus === "success") status.dm = "success";
    else if (slot.dm?.dmStatus === "failed") status.dm = "failed";
    status.lastError =
      (status.dm === "failed" ? slot.dm?.error : null) ?? (status.reply === "failed" ? slot.reply?.error : null) ?? null;
  }
  return result;
}

/** Everything the automation logged for one username, newest first. */
export function userTimeline(logs: RawLog[], username: string, limit = 30): TimelineEntry[] {
  const wanted = username.trim().replace(/^@/, "").toLowerCase();
  if (!wanted) return [];
  return logs
    .filter((l) => (l.username ?? "").toLowerCase() === wanted)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map((l) => ({
      at: l.timestamp,
      type: l.type,
      detail: l.detail,
      error: l.error,
      mediaId: l.mediaId,
      commentStatus: l.commentStatus,
      dmStatus: l.dmStatus,
    }));
}

export const MAX_DM_CHARS = 1000;
export const MAX_COMMENT_CHARS = 2200;

export function validateCustomText(kind: "dm" | "reply", raw: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "text_required" };
  const text = raw.trim();
  if (!text) return { ok: false, error: "text_required" };
  const max = kind === "dm" ? MAX_DM_CHARS : MAX_COMMENT_CHARS;
  if (text.length > max) return { ok: false, error: `text_too_long_max_${max}` };
  return { ok: true, text };
}
