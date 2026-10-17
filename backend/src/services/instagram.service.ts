// Phase 5 Checkpoint 3 — Instagram public comment reply service.
//
// This module is deliberately split into a pure, framework-free core and a
// thin production binding so it can be unit-tested with mocks/in-memory data
// (no Firebase, no real Meta network calls, no secrets). The production
// bindings (readCommentTemplateText / writeCommentReplyLog / env / fetch) are
// injected by the caller (server.ts) or by the default `processCommentReply`
// export.
//
// Scope: PUBLIC Instagram comment replies ONLY.
//   - No DM sending.
//   - No follow verification.
//   - No user analytics.
//   - No follow gating.
//
// Safety:
//   - Uses the actual Instagram comment id from the normalized webhook event
//     (never userId/mediaId/eventId as the comment id).
//   - Never logs or exposes META_ACCESS_TOKEN / META_APP_SECRET / Firebase
//     private key / authorization headers.
//   - META_DRY_RUN=true builds + validates the request but NEVER calls the
//     real Meta API and returns a simulated success.
//   - Production defaults to the real path ONLY when explicitly configured
//     (a real META_ACCESS_TOKEN and META_DRY_RUN != "true").

import { env } from "../config/env.js";
import { isTransientHttpStatus, retryTransient } from "../utils/retry.js";
import { logger } from "../utils/logger.js";
import type { RuleEngineRule } from "../types/rule-engine.js";
import type { PostJobResolution } from "./post-mapping.service.js";
import { buildTrackedUrl, getVerifiedTrackingBase } from "./click-tracking.service.js";
import {
  buildLinksBlock,
  buildNamesBlock,
  buttonTitle,
  clipText,
  BUTTON_TEXT_MAX,
  BUTTON_TITLE_MAX,
  MAX_BUTTON_TEMPLATE_LINKS,
  type ResolvedLink,
} from "./job-links.js";

/** Meta Graph API version used by this backend for comment replies. */
export const META_GRAPH_VERSION = "v24.0";

/** Data needed to render a comment reply template. */
export interface ReplyTemplateData {
  /** The rule's comment template text (with {{variables}}). */
  commentReplyText: string;
  /** Commenter username from the webhook event. */
  username: string;
  /** Job company name (from jobs/{jobId}). */
  company: string;
  /** Job title (from jobs/{jobId}). */
  title: string;
  /** Job location (from jobs/{jobId}). */
  location: string;
  /** Public Hire Daily job URL (from Checkpoint 2 resolver). */
  jobLink: string;
}

/**
 * Renders a comment reply template by substituting supported variables:
 *   {{username}} {{company}} {{title}} {{location}} {{jobLink}}
 *
 * If a variable is referenced but its value is missing/empty, the render is
 * considered failed (returns a validation/error result) so we never send a
 * misleading reply with raw {{variables}} or incorrect data.
 */
export function renderCommentReply(
  template: string,
  data: ReplyTemplateData,
): { rendered: string; ok: boolean; error: string | null } {
  const substitutions: Array<[string, string]> = [
    ["{{username}}", data.username],
    ["{{company}}", data.company],
    ["{{title}}", data.title],
    ["{{location}}", data.location],
    ["{{jobLink}}", data.jobLink],
  ];

  let rendered = template;
  for (const [token, value] of substitutions) {
    if (template.includes(token) && !value) {
      return {
        rendered: "",
        ok: false,
        error: `Template variable ${token} could not be resolved`,
      };
    }
    rendered = rendered.split(token).join(value);
  }

  // Any leftover {{...}} tokens mean an unsupported/missing variable.
  const leftover = rendered.match(/\{\{[^}]+\}\}/g);
  if (leftover) {
    return {
      rendered: "",
      ok: false,
      error: `Unresolved template variable(s): ${leftover.join(", ")}`,
    };
  }

  return { rendered, ok: true, error: null };
}

/**
 * When TRACKING_BASE_URL is set, DM button URLs go through the backend click
 * redirect (which counts the click). Otherwise links stay direct, unchanged.
 * The plain-text fallback and public comments always use the direct URL.
 */
function trackUrl(base: string | null, mediaId: string | null | undefined, index: number, url: string | null): string | null {
  if (!base || !mediaId || !url) return url;
  return buildTrackedUrl(base, mediaId, index);
}

function trackLinks(base: string | null, mediaId: string | null | undefined, links: ResolvedLink[] | undefined): ResolvedLink[] | undefined {
  if (!links) return links;
  return links.map((l, i) => ({ ...l, url: trackUrl(base, mediaId, i, l.url) ?? l.url }));
}

/**
 * One card of the 4-5 link carousel: "Role - Company" as the title, "Option i of n"
 * as the subtitle and a single button. An optional https image (DM_CARD_IMAGE_URL,
 * shown square by Instagram) is added to every card when configured.
 */
export function cardElement(
  link: ResolvedLink,
  index: number,
  total: number,
  values: NodeJS.ProcessEnv = process.env,
): { title: string; subtitle: string; image_url?: string; buttons: { type: "web_url"; url: string; title: string }[] } {
  const image = values.DM_CARD_IMAGE_URL?.trim();
  return {
    title: clipText(link.label, 80),
    subtitle: clipText(`Option ${index + 1} of ${total} · tap to view & apply`, 80),
    ...(image && /^https:\/\//i.test(image) ? { image_url: image } : {}),
    buttons: [{ type: "web_url", url: link.url, title: clipText("View & Apply", BUTTON_TITLE_MAX) }],
  };
}

/**
 * Value for the {{jobLink}} template variable. Single-link posts keep the
 * exact job URL (legacy behavior). Multi-link posts render a named list,
 * one link below another, so the person can tell which link is which.
 */
export function jobLinkValue(resolution: { jobUrl: string | null; links?: { label: string; url: string }[] }): string {
  const links = resolution.links ?? [];
  if (links.length > 1) return buildLinksBlock(links);
  return resolution.jobUrl ?? "";
}

/** Structured result of a Meta reply attempt. */
export interface ReplyResult {
  success: boolean;
  externalId: string | null;
  error: string | null;
  dryRun: boolean;
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const method = (init.method ?? "GET").toUpperCase();
  const res = await retryTransient(() => fetchImpl(url, init), {
    retries: method === "GET" ? 2 : 0,
    shouldRetry: () => method === "GET",
    shouldRetryResult: (response) => method === "GET" && isTransientHttpStatus(response.status),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

/** True for Meta errors that are worth one more attempt (5xx, is_transient, code 1/2). */
export function isTransientMetaError(status: number, json: unknown): boolean {
  if (status >= 500) return true;
  const err = (json as { error?: { code?: number; is_transient?: boolean } } | null)?.error;
  return err?.is_transient === true || err?.code === 1 || err?.code === 2;
}

/**
 * Looks for a reply already posted by this account under a comment. `known` is
 * false when the lookup itself failed (then nothing is retried, to avoid duplicates).
 */
export async function findOwnReply(
  fetchImpl: typeof fetch,
  commentId: string,
  accessToken: string,
  ownId: string = env.meta.instagramBusinessId,
): Promise<{ known: boolean; id: string | null }> {
  if (!ownId) return { known: false, id: null };
  try {
    const res = await fetchImpl(
      `https://graph.instagram.com/${META_GRAPH_VERSION}/${encodeURIComponent(commentId)}/replies?fields=id,from&limit=25`,
      { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { known: false, id: null };
    const json = (await res.json().catch(() => null)) as { data?: { id?: string; from?: { id?: string } }[] } | null;
    if (!json || !Array.isArray(json.data)) return { known: false, id: null };
    const mine = json.data.find((r) => r.from?.id === ownId);
    return { known: true, id: mine?.id ?? null };
  } catch {
    return { known: false, id: null };
  }
}

/**
 * Sends a public reply to an Instagram comment via the Meta Graph API:
 *   POST https://graph.facebook.com/{version}/{comment_id}/replies
 *     Authorization: Bearer <token>
 *
 * The Meta network call is injected so tests substitute a mock and never hit
 * the real API. When `dryRun` is true no network call happens at all.
 *
 * Never exposes the access token in logs/errors.
 */
export async function replyToComment(
  commentId: string,
  message: string,
  accessToken: string,
  opts: { dryRun?: boolean; fetchImpl?: typeof fetch; ctaUrl?: string | null; retryDelayMs?: number } = {},
): Promise<ReplyResult> {
  const dryRun = opts.dryRun ?? false;
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (!commentId) {
    return { success: false, externalId: null, error: "comment_id_missing", dryRun };
  }
  if (!message) {
    return { success: false, externalId: null, error: "message_empty", dryRun };
  }
  if (!accessToken) {
    return { success: false, externalId: null, error: "meta_access_token_missing", dryRun };
  }

  if (dryRun) {
    // Build + validate the request payload, but NEVER call the real Meta API.
    return { success: true, externalId: `dry-run-${commentId}`, error: null, dryRun: true };
  }

  // Instagram Login uses the Instagram Graph host. Keep the access token
  // in the Authorization header and send the reply as JSON.
  const url =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/${encodeURIComponent(commentId)}/replies`;

  try {
    const post = () =>
      fetchJson(fetchImpl, url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
      });
    let { ok, status, json } = await post();

    // Meta sometimes answers a reply with a transient "An unknown error has
    // occurred" (code 1/2, is_transient) even though the service is fine.
    // A POST is never retried blindly (it could create a duplicate public reply),
    // so: wait a moment, check that no reply from the account exists yet, and
    // only then try once more.
    if (!ok && isTransientMetaError(status, json)) {
      await new Promise((resolve) => setTimeout(resolve, opts.retryDelayMs ?? 1500));
      const existing = await findOwnReply(fetchImpl, commentId, accessToken);
      if (existing.known && existing.id) {
        return { success: true, externalId: existing.id, error: null, dryRun: false };
      }
      if (existing.known) {
        ({ ok, status, json } = await post());
      }
    }

    if (ok) {
      const id = (json as { id?: string } | null)?.id ?? null;
      return { success: true, externalId: id ?? null, error: null, dryRun: false };
    }

    // Extract a safe error message (never the token).
    let safeError = `meta_http_${status}`;
    if (json && typeof json === "object") {
      const err = (json as { error?: { message?: unknown } }).error?.message;
      if (typeof err === "string" && !err.includes(accessToken)) {
        safeError = err.slice(0, 200);
      }
    }
    return { success: false, externalId: null, error: safeError, dryRun: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_network_error";
    return { success: false, externalId: null, error: msg, dryRun: false };
  }
}

/** Comment status persisted to Firebase for a reply attempt. */
export type CommentStatus = "pending" | "success" | "failed";

/** Data persisted for a reply attempt (safe fields only — no secrets). */
export interface CommentReplyLogData {
  userId: string | null;
  username: string | null;
  mediaId: string | null;
  commentId: string | null;
  jobId: string | null;
  ruleId: string | null;
  keyword: string | null;
  commentStatus: CommentStatus;
  error: string | null;
  dryRun: boolean;
  /** Meta id of the public reply created by the bot; used only for self-loop suppression. */
  externalId?: string | null;
  timestamp: number;
}

/** Read-only data-access contract for the comment-reply orchestrator. */
export interface ReplyDataReader {
  getCommentTemplateText(rule: RuleEngineRule): Promise<string | null>;
}

/** Logger contract so tests can capture (and assert on) safe log entries. */
export interface ReplyLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const noopLogger: ReplyLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Orchestrates a single public comment reply for a matched rule:
 *   1. resolve the post mapping → job (jobId + jobUrl + job data)
 *   2. read + render the comment reply template
 *   3. send the reply (or dry-run)
 *   4. return the safe Firebase log data
 *
 * The reply is NOT sent when:
 *   - no rule matched
 *   - cooldown/deduplication rejected the event (handled by caller)
 *   - no post mapping exists
 *   - the job does not exist
 *   - commentReplyText is empty
 *   - comment ID is missing
 *   - template rendering fails
 */
export async function processCommentReply(
  input: {
    commentId: string | null;
    mediaId: string | null;
    userId: string | null;
    username: string | null;
    rule: RuleEngineRule;
    matchedKeyword: string | null;
    resolution: PostJobResolution;
    accessToken: string;
    dryRun: boolean;
    logger?: ReplyLogger;
  },
  deps: {
    reader: ReplyDataReader;
    fetchImpl?: typeof fetch;
  },
): Promise<CommentReplyLogData> {
  const log = input.logger ?? noopLogger;
  const timestamp = Date.now();

  // No/can't reply without a real comment id.
  if (!input.commentId) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: null,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: "failed",
      error: "comment_id_missing",
      dryRun: input.dryRun,
      timestamp,
    };
  }

  // Post mapping must resolve.
  if (!input.resolution.mapped) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: "failed",
      error: input.resolution.reason,
      dryRun: input.dryRun,
      timestamp,
    };
  }

  const template = await deps.reader.getCommentTemplateText(input.rule);
  if (!template) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: "failed",
      error: "comment_reply_text_empty",
      dryRun: input.dryRun,
      timestamp,
    };
  }

  const render = renderCommentReply(template, {
    commentReplyText: template,
    username: input.username ?? "",
    company: input.resolution.company ?? "",
    title: input.resolution.jobTitle ?? input.resolution.title ?? "",
    location: input.resolution.location ?? "",
    jobLink: jobLinkValue(input.resolution),
  });

  if (!render.ok) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: "failed",
      error: render.error,
      dryRun: input.dryRun,
      timestamp,
    };
  }

  const reply = await replyToComment(input.commentId, render.rendered, input.accessToken, {
    dryRun: input.dryRun,
    fetchImpl: deps.fetchImpl,
  });

  if (reply.success) {
    log.info("Comment reply sent", {
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      dryRun: reply.dryRun,
    });
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: "success",
      error: null,
      dryRun: input.dryRun,
      externalId: reply.externalId,
      timestamp,
    };
  }

  log.error("Comment reply failed", {
    commentId: input.commentId,
    jobId: input.resolution.jobId,
    ruleId: input.rule.id,
    error: reply.error,
    dryRun: reply.dryRun,
  });
  return {
    userId: input.userId,
    username: input.username,
    mediaId: input.mediaId,
    commentId: input.commentId,
    jobId: input.resolution.jobId,
    ruleId: input.rule.id,
    keyword: input.matchedKeyword,
    commentStatus: "failed",
    error: reply.error,
    dryRun: input.dryRun,
    timestamp,
  };
}

/**
 * Production binding: processes a comment reply using real Firebase reads and
 * the configured META_ACCESS_TOKEN / META_DRY_RUN. Never touches `jobs/*`
 * (jobs stays READ-ONLY). If the real Meta API cannot be safely verified with
 * the current credentials, callers should set META_DRY_RUN=true so no real
 * reply is sent.
 */
export async function processCommentReplyProduction(
  input: {
    commentId: string | null;
    mediaId: string | null;
    userId: string | null;
    username: string | null;
    rule: RuleEngineRule;
    matchedKeyword: string | null;
    resolution: PostJobResolution;
  },
): Promise<CommentReplyLogData> {
  const { readCommentTemplateText } = await import("./firebase-admin.service.js");
  const dryRun = env.meta.dryRun;
  const accessToken = env.meta.accessToken;

  return processCommentReply(
    {
      commentId: input.commentId,
      mediaId: input.mediaId,
      userId: input.userId,
      username: input.username,
      rule: input.rule,
      matchedKeyword: input.matchedKeyword,
      resolution: input.resolution,
      accessToken,
      dryRun,
      logger,
    },
    {
      reader: {
        getCommentTemplateText: async (rule) => readCommentTemplateText(rule),
      },
    },
  );
}

// ===========================================================================
// Checkpoint 4 — Instagram Automatic DM + Job Link
// ===========================================================================
//
// Sends a private DM containing the EXACT mapped Hire Daily job detail URL
// to the commenter, after the comment has passed rule matching, cooldown,
// post mapping, and job resolution. The DM is independent from the public
// comment reply (each is tracked by its own status).
//
// Meta capability note (REPORTED, not invented):
//   Real Instagram DMs via the Graph API require the `instagram_manage_messages`
//   permission on an app that is the Business/Professional account that owns
//   the posts, plus a user/system user access token with that permission. The
//   current environment does NOT confirm this permission, so real sending is
//   kept strictly behind META_DRY_RUN=false AND is never claimed as verified.
//   The dry-run path renders + validates everything and never hits the API.

/** DM status persisted to Firebase for a DM attempt. */
export type DmStatus = "pending" | "success" | "failed";

/** Data persisted for a DM attempt (safe fields only — no secrets). */
export interface DmLogData {
  userId: string | null;
  username: string | null;
  mediaId: string | null;
  commentId: string | null;
  jobId: string | null;
  ruleId: string | null;
  keyword: string | null;
  commentStatus: CommentStatus | "skipped";
  dmStatus: DmStatus | "skipped";
  error: string | null;
  dryRun: boolean;
  timestamp: number;
}

export function extractDmCta(message: string): { text: string; label: string | null } {
  const match = message.match(/\[\[CTA:([^\]]{1,40})\]\]/i);
  if (!match) return { text: message.trim(), label: null };
  const label = match[1].trim();
  const text = message.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, label: label || "View Job & Apply" };
}

function safeMetaError(json: unknown, accessToken: string, fallback: string): string {
  if (json && typeof json === "object") {
    const message = (json as { error?: { message?: unknown } }).error?.message;
    if (typeof message === "string" && !message.includes(accessToken)) {
      return message.slice(0, 200);
    }
  }
  return fallback;
}

/**
 * Fallback resolver for webhook payloads where `from.id` is absent.
 *
 * Instagram comment webhooks normally include the commenter id, but the
 * payload is not guaranteed to contain every identity field in every setup.
 * When it is missing, read the comment once and use its `from.id` for the
 * Send API recipient. This keeps the DM flow independent from the username.
 */
export async function resolveCommenterId(
  commentId: string | null,
  accessToken: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<string | null> {
  const normalizedCommentId = commentId?.trim() || "";
  if (!normalizedCommentId || !accessToken) return null;

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/` +
    `${encodeURIComponent(normalizedCommentId)}?fields=from`;

  try {
    const result = await fetchJson(fetchImpl, url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!result.ok || !result.json || typeof result.json !== "object") {
      return null;
    }

    const from = (result.json as { from?: { id?: unknown } }).from;
    return typeof from?.id === "string" && from.id.trim()
      ? from.id.trim()
      : null;
  } catch {
    return null;
  }
}

async function sendInstagramJson(
  fetchImpl: typeof fetch,
  url: string,
  accessToken: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return fetchJson(fetchImpl, url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Sends exactly one Instagram DM for a comment-triggered automation.
 *
 * CTA mode: send one native Instagram Button Template using recipient.id.
 * There is intentionally NO plain-link fallback: if Meta rejects the button
 * request, the function fails and the exact safe Meta error is logged. This
 * keeps the product behaviour deterministic instead of giving some users a
 * button and others a plain URL.
 *
 * The caller claims the DM action atomically in Firebase before invoking this
 * function, preventing concurrent Vercel instances from sending duplicates.
 */
export async function sendDirectMessage(
  recipientId: string,
  message: string,
  accessToken: string,
  opts: {
    dryRun?: boolean;
    fetchImpl?: typeof fetch;
    ctaUrl?: string | null;
    ctaLabel?: string | null;
    commentId?: string | null;
    instagramBusinessId?: string | null;
    /** Plain-text DM may fall back to recipient.id when no comment id exists (multi-link DMs after the follow gate). */
    allowDirectRecipient?: boolean;
    /**
     * 2-5 links to deliver as native buttons in ONE message: up to 3 as a
     * button template, 4-5 as a carousel. `message` is then the plain-text
     * fallback (names + URLs) used if Meta rejects the structured message.
     */
    linkButtons?: ResolvedLink[];
    /** Text shown above the buttons (names only, no URLs). */
    buttonText?: string;
  } = {},
): Promise<ReplyResult> {
  const dryRun = opts.dryRun ?? false;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const cta = extractDmCta(message);
  const ctaUrl = opts.ctaUrl?.trim() || null;
  const ctaLabel = opts.ctaLabel?.trim() || cta.label || "View Job & Apply";
  const instagramBusinessId = opts.instagramBusinessId?.trim() || null;

  if (!recipientId) {
    return { success: false, externalId: null, error: "recipient_id_missing", dryRun };
  }
  if (!cta.text && !cta.label) {
    return { success: false, externalId: null, error: "message_empty", dryRun };
  }
  if (!accessToken) {
    return { success: false, externalId: null, error: "meta_access_token_missing", dryRun };
  }
  if (cta.label && !ctaUrl) {
    return { success: false, externalId: null, error: "cta_url_missing", dryRun };
  }

  if (dryRun) {
    return {
      success: true,
      externalId: `dry-run-dm-${opts.commentId ?? recipientId}`,
      error: null,
      dryRun: true,
    };
  }

  if (!instagramBusinessId) {
    return {
      success: false,
      externalId: null,
      error: "instagram_business_id_missing",
      dryRun: false,
    };
  }

  const messagesUrl =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/` +
    `${encodeURIComponent(instagramBusinessId)}/messages`;

  // Multi-link: ONE message with native buttons (one per link), falling back
  // to a plain-text list if Meta rejects the structured message.
  if (opts.linkButtons && opts.linkButtons.length > 1) {
    const links = opts.linkButtons.slice(0, 5);
    const recipient = opts.commentId ? { comment_id: opts.commentId } : { id: recipientId };
    const attachment =
      links.length <= MAX_BUTTON_TEMPLATE_LINKS
        ? {
            type: "template",
            payload: {
              template_type: "button",
              text: clipText(opts.buttonText?.trim() || buildNamesBlock(links), BUTTON_TEXT_MAX),
              buttons: links.map((l, i) => ({
                type: "web_url",
                url: l.url,
                title: buttonTitle(i, l.label),
              })),
            },
          }
        : {
            type: "template",
            payload: {
              template_type: "generic",
              elements: links.map((l, i) => cardElement(l, i, links.length)),
            },
          };

    try {
      const structured = await sendInstagramJson(fetchImpl, messagesUrl, accessToken, {
        recipient,
        message: { attachment },
      });
      if (structured.ok) {
        const id = (structured.json as { message_id?: string } | null)?.message_id ?? null;
        return { success: true, externalId: id, error: null, dryRun: false };
      }

      const structuredError = safeMetaError(structured.json, accessToken, `meta_http_${structured.status}`);

      // Preserve delivery: retry as plain text (names + URLs). A rejected
      // request does not consume the private reply.
      if (opts.commentId || opts.allowDirectRecipient) {
        try {
          const fallback = await sendInstagramJson(fetchImpl, messagesUrl, accessToken, {
            recipient,
            message: { text: cta.text },
          });
          if (fallback.ok) {
            const id = (fallback.json as { message_id?: string } | null)?.message_id ?? null;
            return { success: true, externalId: id, error: null, dryRun: false };
          }
        } catch {
          // report the original structured-message error below
        }
      }
      return {
        success: false,
        externalId: null,
        error: `multi_link_template_rejected_${structured.status}:${structuredError}`,
        dryRun: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_network_error";
      return { success: false, externalId: null, error: msg, dryRun: false };
    }
  }

  // Native URL button: one structured message. Meta documents Button Template
  // for the Instagram Send API at /{ig_user_id}/messages with recipient.id.
  if (cta.label && ctaUrl) {
    // A comment-triggered DM must use the originating comment as the
    // recipient. Sending a button template to recipient.id uses the normal
    // messaging window and can fail with:
    //   403 ... This message is sent outside of allowed window.
    // A fresh commenter may have no existing DM conversation yet. Meta's
    // Private Reply mechanism is keyed by comment_id and is allowed for the
    // comment-triggered window (up to 7 days).
    const buttonPayload = {
      recipient: opts.commentId
        ? { comment_id: opts.commentId }
        : { id: recipientId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: cta.text || "Here is the job you requested.",
            buttons: [
              {
                type: "web_url",
                url: ctaUrl,
                title: clipText(ctaLabel, BUTTON_TITLE_MAX),
              },
            ],
          },
        },
      },
    };

    try {
      const buttonResult = await sendInstagramJson(
        fetchImpl,
        messagesUrl,
        accessToken,
        buttonPayload,
      );

      if (buttonResult.ok) {
        const id = (buttonResult.json as { message_id?: string } | null)?.message_id ?? null;
        return { success: true, externalId: id, error: null, dryRun: false };
      }

      const buttonError = safeMetaError(
        buttonResult.json,
        accessToken,
        `meta_http_${buttonResult.status}`,
      );

      // If Meta rejects the structured button for this account, preserve the
      // core comment-to-DM workflow by retrying the same Private Reply with
      // the job URL as plain text. This retry is still addressed by
      // comment_id, so it does not depend on the recipient's 24-hour
      // messaging window. A failed API request does not consume the private
      // reply; a successful retry does.
      if (opts.commentId) {
        const fallbackText = cta.text
          ? `${cta.text}\n\nApply here: ${ctaUrl}`
          : `Here is the job you requested.\n\nApply here: ${ctaUrl}`;
        const fallbackPayload = {
          recipient: { comment_id: opts.commentId },
          message: { text: fallbackText },
        };

        try {
          const fallbackResult = await sendInstagramJson(
            fetchImpl,
            messagesUrl,
            accessToken,
            fallbackPayload,
          );
          if (fallbackResult.ok) {
            const id =
              (fallbackResult.json as { message_id?: string } | null)?.message_id ??
              null;
            return {
              success: true,
              externalId: id,
              error: null,
              dryRun: false,
            };
          }
        } catch {
          // Return the original button error below; logging keeps the failure
          // actionable without masking Meta's original response.
        }
      }

      return {
        success: false,
        externalId: null,
        error: `button_template_rejected_${buttonResult.status}:${buttonError}`,
        dryRun: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_network_error";
      return { success: false, externalId: null, error: msg, dryRun: false };
    }
  }

  // No CTA marker: send a documented Private Reply using the originating
  // comment id. This is the safe comment-to-DM path.
  if (!opts.commentId && !opts.allowDirectRecipient) {
    return { success: false, externalId: null, error: "comment_id_missing", dryRun: false };
  }

  const privateReplyPayload = {
    recipient: opts.commentId ? { comment_id: opts.commentId } : { id: recipientId },
    message: { text: cta.text },
  };

  try {
    const result = await sendInstagramJson(fetchImpl, messagesUrl, accessToken, privateReplyPayload);
    if (result.ok) {
      const id = (result.json as { message_id?: string } | null)?.message_id ?? null;
      return { success: true, externalId: id, error: null, dryRun: false };
    }

    return {
      success: false,
      externalId: null,
      error: safeMetaError(result.json, accessToken, `meta_http_${result.status}`),
      dryRun: false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_network_error";
    return { success: false, externalId: null, error: msg, dryRun: false };
  }
}

export const FOLLOW_GATE_PAYLOAD = "HIREDAILY_FOLLOW_CHECK_V1";
export const HIRE_DAILY_INSTAGRAM_URL = "https://www.instagram.com/hire_daily/";

export type FollowApiStatus = "verified" | "not_verified" | "unsupported" | "unknown";

export interface FollowApiResult {
  status: FollowApiStatus;
  reason: string | null;
  /** Username returned by Meta for the same IGSID/profile request, when available. */
  username: string | null;
}

/**
 * Verifies the relationship for an Instagram-scoped user ID using Meta's
 * official Instagram User Profile API. A true result is only returned when
 * Meta explicitly returns is_user_follow_business=true.
 */
export async function checkInstagramUserFollow(
  instagramUserId: string,
  opts: { accessToken?: string; fetchImpl?: typeof fetch } = {},
): Promise<FollowApiResult> {
  const userId = instagramUserId?.trim() || "";
  const accessToken = opts.accessToken?.trim() || env.meta.accessToken;
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (!userId) return { status: "unknown", reason: "instagram_user_id_missing", username: null };
  if (!accessToken) return { status: "unknown", reason: "meta_access_token_missing", username: null };

  // The same profile request used for the follow relationship also returns
  // username after the user has interacted with the professional account.
  // This is important for the existing Job DM template, which may contain
  // {{username}}. Do not make the caller depend on a username being present
  // in the messaging webhook itself.
  const url =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/${encodeURIComponent(userId)}` +
    `?fields=is_user_follow_business,username`;

  try {
    const result = await fetchJson(fetchImpl, url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!result.ok || !result.json || typeof result.json !== "object") {
      const reason = safeMetaError(result.json, accessToken, `meta_http_${result.status}`);
      // Permission/consent/capability errors are intentionally not treated as
      // either following or not following.
      return { status: "unknown", reason, username: null };
    }

    const profile = result.json as {
      is_user_follow_business?: unknown;
      username?: unknown;
    };
    const username =
      typeof profile.username === "string" && profile.username.trim()
        ? profile.username.trim().replace(/^@/, "")
        : null;
    const value = profile.is_user_follow_business;
    if (value === true) return { status: "verified", reason: null, username };
    if (value === false) return { status: "not_verified", reason: null, username };
    return { status: "unknown", reason: "follow_field_missing", username };
  } catch (error) {
    return {
      status: "unknown",
      reason: error instanceof Error ? error.message.slice(0, 200) : "follow_check_network_error",
      username: null,
    };
  }
}

/** Sends the two-button Follow Gate. The existing production DM transport is
 * reused; only the message payload is new. */
export async function sendFollowGateMessage(
  recipientId: string,
  accessToken: string,
  opts: {
    commentId?: string | null;
    dryRun?: boolean;
    fetchImpl?: typeof fetch;
    instagramBusinessId?: string | null;
  } = {},
): Promise<ReplyResult> {
  const dryRun = opts.dryRun ?? false;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const instagramBusinessId = opts.instagramBusinessId?.trim() || null;

  if (!recipientId) return { success: false, externalId: null, error: "recipient_id_missing", dryRun };
  if (!accessToken) return { success: false, externalId: null, error: "meta_access_token_missing", dryRun };
  if (!instagramBusinessId) return { success: false, externalId: null, error: "instagram_business_id_missing", dryRun };

  if (dryRun) {
    return {
      success: true,
      externalId: `dry-run-follow-gate-${opts.commentId ?? recipientId}`,
      error: null,
      dryRun: true,
    };
  }

  const messagesUrl =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/` +
    `${encodeURIComponent(instagramBusinessId)}/messages`;

  const recipient = opts.commentId?.trim()
    ? { comment_id: opts.commentId.trim() }
    : { id: recipientId };

  const payload = {
    recipient,
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Follow @hire_daily to unlock the job application link 👇",
          buttons: [
            {
              type: "web_url",
              url: HIRE_DAILY_INSTAGRAM_URL,
              title: "Follow @hire_daily",
            },
            {
              type: "postback",
              title: "I've Followed ✅",
              payload: FOLLOW_GATE_PAYLOAD,
            },
          ],
        },
      },
    },
  };

  try {
    const result = await sendInstagramJson(fetchImpl, messagesUrl, accessToken, payload);
    if (!result.ok) {
      const error = safeMetaError(result.json, accessToken, `meta_http_${result.status}`);
      // Meta's documented Private Reply contract guarantees text replies via
      // comment_id. If the structured two-button payload is rejected for a
      // fresh commenter, do not fake a successful gate. Use the documented
      // text Private Reply as the safest supported fallback.
      if (opts.commentId) {
        const fallback = await sendInstagramJson(fetchImpl, messagesUrl, accessToken, {
          recipient: { comment_id: opts.commentId },
          message: {
            text:
              "Follow @hire_daily to unlock the job application link 👇\n\n" +
              HIRE_DAILY_INSTAGRAM_URL +
              "\n\nAfter following, reply: I've Followed",
          },
        });
        if (fallback.ok) {
          const id = (fallback.json as { message_id?: string } | null)?.message_id ?? null;
          return { success: true, externalId: id, error: null, dryRun: false };
        }
      }

      return {
        success: false,
        externalId: null,
        error: `follow_gate_rejected_${result.status}:${error}`,
        dryRun: false,
      };
    }
    const id = (result.json as { message_id?: string } | null)?.message_id ?? null;
    return { success: true, externalId: id, error: null, dryRun: false };
  } catch (error) {
    return {
      success: false,
      externalId: null,
      error: error instanceof Error ? error.message.slice(0, 200) : "follow_gate_network_error",
      dryRun: false,
    };
  }
}

/** Read-only data-access contract for the DM orchestrator. */
export interface DmDataReader {
  getDmTemplateText(rule: RuleEngineRule): Promise<string | null>;
}

/**
 * Orchestrates a single DM for a matched rule. The DM is NOT sent when:
 *   - recipient ID is missing
 *   - post mapping is missing
 *   - the job does not exist
 *   - the job URL is missing
 *   - dmText is empty
 *   - a required template variable cannot be resolved
 *   - cooldown/dedupe rejected the event (handled by the caller)
 */
export async function processDirectMessage(
  input: {
    recipientId: string | null;
    userId: string | null;
    username: string | null;
    mediaId: string | null;
    commentId: string | null;
    rule: RuleEngineRule;
    matchedKeyword: string | null;
    resolution: PostJobResolution;
    commentStatus: CommentStatus | "skipped";
    accessToken: string;
    dryRun: boolean;
    logger?: ReplyLogger;
  },
  deps: {
    reader: DmDataReader;
    fetchImpl?: typeof fetch;
  },
): Promise<DmLogData> {
  const log = input.logger ?? noopLogger;
  const timestamp = Date.now();

  // Recipient must be the actual commenter user id (never mediaId/commentId/jobId).
  if (!input.recipientId) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
      error: "recipient_id_missing",
      dryRun: input.dryRun,
      timestamp,
    };
  }

  // Post mapping must resolve.
  if (!input.resolution.mapped) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
      error: input.resolution.reason,
      dryRun: input.dryRun,
      timestamp,
    };
  }

  // The exact mapped job URL is required — never a generic /jobs fallback.
  if (!input.resolution.jobUrl) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
      error: "job_url_missing",
      dryRun: input.dryRun,
      timestamp,
    };
  }

  const dmText = await deps.reader.getDmTemplateText(input.rule);
  if (!dmText) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
      error: "dm_text_empty",
      dryRun: input.dryRun,
      timestamp,
    };
  }

  // Multi-link posts (2-5 links) go out as ONE plain-text message: each link
  // is preceded by its name, one below another. Native URL buttons only
  // support a single link here, so the legacy button path is used only when
  // the post has exactly one link.
  const multiLink = (input.resolution.links?.length ?? 0) > 1;

  const render = renderCommentReply(dmText, {
    commentReplyText: dmText,
    username: input.username ?? "",
    company: input.resolution.company ?? "",
    title: input.resolution.jobTitle ?? input.resolution.title ?? "",
    location: input.resolution.location ?? "",
    jobLink: multiLink ? buildLinksBlock(input.resolution.links ?? []) : input.resolution.jobUrl,
  });

  if (!render.ok) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
      error: render.error,
      dryRun: input.dryRun,
      timestamp,
    };
  }

  // Tracked links only when TRACKING_BASE_URL is set AND verified to be this
  // backend. A wrong address would 404 every button, so it falls back to the
  // direct job link instead.
  const trackingBase = await getVerifiedTrackingBase();

  let dmMessage = render.rendered;
  let buttonText: string | undefined;
  if (multiLink) {
    const links = input.resolution.links ?? [];
    // Plain-text fallback: template text with the full "name + URL" list.
    dmMessage = extractDmCta(dmMessage).text;
    if (!dmText.includes("{{jobLink}}")) {
      dmMessage = `${dmMessage}\n\n${buildLinksBlock(links)}`.trim();
    }
    // Text above the buttons: same template, but names only (the URLs live
    // in the buttons themselves).
    const namesRender = renderCommentReply(dmText, {
      commentReplyText: dmText,
      username: input.username ?? "",
      company: input.resolution.company ?? "",
      title: input.resolution.jobTitle ?? input.resolution.title ?? "",
      location: input.resolution.location ?? "",
      jobLink: buildNamesBlock(links),
    });
    buttonText = extractDmCta(namesRender.ok ? namesRender.rendered : dmMessage).text;
    if (!dmText.includes("{{jobLink}}")) {
      buttonText = `${buttonText}\n\n${buildNamesBlock(links)}`.trim();
    }
  }

  const dm = await sendDirectMessage(input.recipientId, dmMessage, input.accessToken, {
    dryRun: input.dryRun,
    fetchImpl: deps.fetchImpl,
    ctaUrl: multiLink ? null : trackUrl(trackingBase, input.resolution.mediaId, 0, input.resolution.jobUrl),
    commentId: input.commentId,
    instagramBusinessId: env.meta.instagramBusinessId,
    allowDirectRecipient: multiLink,
    linkButtons: multiLink ? trackLinks(trackingBase, input.resolution.mediaId, input.resolution.links) : undefined,
    buttonText,
  });

  if (dm.success) {
    log.info("DM sent", {
      recipientId: input.recipientId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      dryRun: dm.dryRun,
    });
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "success",
      error: null,
      dryRun: input.dryRun,
      timestamp,
    };
  }

  log.error("DM failed", {
    recipientId: input.recipientId,
    jobId: input.resolution.jobId,
    ruleId: input.rule.id,
    error: dm.error,
    dryRun: dm.dryRun,
  });
  return {
    userId: input.userId,
    username: input.username,
    mediaId: input.mediaId,
    commentId: input.commentId,
    jobId: input.resolution.jobId,
    ruleId: input.rule.id,
    keyword: input.matchedKeyword,
    commentStatus: input.commentStatus,
    dmStatus: "failed",
    error: dm.error,
    dryRun: input.dryRun,
    timestamp,
  };
}

/**
 * Production binding: processes a DM using real Firebase reads and the
 * configured META_ACCESS_TOKEN / META_DRY_RUN. Never touches `jobs/*`
 * (jobs stays READ-ONLY). Real sending is only attempted when META_DRY_RUN is
 * NOT true; otherwise the request is fully validated and simulated.
 */
export async function processDirectMessageProduction(
  input: {
    recipientId: string | null;
    userId: string | null;
    username: string | null;
    mediaId: string | null;
    commentId: string | null;
    rule: RuleEngineRule;
    matchedKeyword: string | null;
    resolution: PostJobResolution;
    commentStatus: CommentStatus | "skipped";
  },
): Promise<DmLogData> {
  const { readDmTemplateText } = await import("./firebase-admin.service.js");
  const dryRun = env.meta.dryRun;
  const accessToken = env.meta.accessToken;

  return processDirectMessage(
    {
      recipientId: input.recipientId,
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: input.commentId,
      rule: input.rule,
      matchedKeyword: input.matchedKeyword,
      resolution: input.resolution,
      commentStatus: input.commentStatus,
      accessToken,
      dryRun,
      logger,
    },
    {
      reader: {
        getDmTemplateText: async (rule) => readDmTemplateText(rule),
      },
    },
  );
}
