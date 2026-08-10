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
import { logger } from "../utils/logger.js";
import type { RuleEngineRule } from "../types/rule-engine.js";
import type { PostJobResolution } from "./post-mapping.service.js";

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
  const res = await fetchImpl(url, init);
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

/**
 * Sends a public reply to an Instagram comment via the Meta Graph API:
 *   POST https://graph.facebook.com/{version}/{comment_id}/replies
 *     ?message=...&access_token=...
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
  opts: { dryRun?: boolean; fetchImpl?: typeof fetch; ctaUrl?: string | null } = {},
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
    const { ok, status, json } = await fetchJson(fetchImpl, url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    });

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
    jobLink: input.resolution.jobUrl ?? "",
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

function extractDmCta(message: string): { text: string; label: string | null } {
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

  // Native URL button: one structured message. Meta documents Button Template
  // for the Instagram Send API at /{ig_user_id}/messages with recipient.id.
  if (cta.label && ctaUrl) {
    const buttonPayload = {
      recipient: { id: recipientId },
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
                title: ctaLabel.slice(0, 20),
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

      // IMPORTANT: Do NOT fall back to a plain URL message. The product
      // contract here is a native "View Job & Apply" button. A fallback
      // private-reply would make behaviour inconsistent across users and can
      // also consume the one comment-triggered private reply.
      return {
        success: false,
        externalId: null,
        error: `button_template_rejected_${buttonResult.status}:${safeMetaError(
          buttonResult.json,
          accessToken,
          `meta_http_${buttonResult.status}`,
        )}`,
        dryRun: false,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_network_error";
      return { success: false, externalId: null, error: msg, dryRun: false };
    }
  }

  // No CTA marker: send a documented Private Reply using the originating
  // comment id. This is the safe comment-to-DM path.
  if (!opts.commentId) {
    return { success: false, externalId: null, error: "comment_id_missing", dryRun: false };
  }

  const privateReplyPayload = {
    recipient: { comment_id: opts.commentId },
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

  const render = renderCommentReply(dmText, {
    commentReplyText: dmText,
    username: input.username ?? "",
    company: input.resolution.company ?? "",
    title: input.resolution.jobTitle ?? input.resolution.title ?? "",
    location: input.resolution.location ?? "",
    jobLink: input.resolution.jobUrl,
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

  const dm = await sendDirectMessage(input.recipientId, render.rendered, input.accessToken, {
    dryRun: input.dryRun,
    fetchImpl: deps.fetchImpl,
    ctaUrl: input.resolution.jobUrl,
    commentId: input.commentId,
    instagramBusinessId: env.meta.instagramBusinessId,
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
