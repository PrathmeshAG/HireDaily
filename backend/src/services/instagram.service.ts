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
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v24.0";

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
  commentStatus: CommentStatus;
  dmStatus: DmStatus;
  error: string | null;
  dryRun: boolean;
  timestamp: number;
}



function extractDmCta(message: string): { text: string; label: string | null } {
  const match = message.match(/\[\[CTA:([^\]]{1,40})\]\]/i);
  if (!match) return { text: message, label: null };

  const label = match[1].trim();
  const text = message
    .replace(match[0], "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    text,
    label: label || "Apply Now",
  };
}

/**
 * Sends an Instagram Private Reply to the commenter via the Meta Graph API
 * messaging endpoint. The network call is injected so tests substitute a mock and never
 * hit the real API. When `dryRun` is true no network call happens at all.
 *
 * Endpoint used (Instagram Private Replies):
 *   POST https://graph.instagram.com/{version}/{ig_user_id}/messages
 *     { recipient: { comment_id }, message: { text } }
 *
 * Never exposes the access token in logs/errors.
 */
export async function sendDirectMessage(
  commentId: string,
  message: string,
  accessToken: string,
  opts: {
    dryRun?: boolean;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<ReplyResult> {
  const dryRun = opts.dryRun ?? false;
  const fetchImpl = opts.fetchImpl ?? fetch;

  if (!commentId) {
    return {
      success: false,
      externalId: null,
      error: "comment_id_missing",
      dryRun,
    };
  }

  if (!message.trim()) {
    return {
      success: false,
      externalId: null,
      error: "message_empty",
      dryRun,
    };
  }

  if (!accessToken) {
    return {
      success: false,
      externalId: null,
      error: "meta_access_token_missing",
      dryRun,
    };
  }

  const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID?.trim();

  if (!instagramBusinessId) {
    return {
      success: false,
      externalId: null,
      error: "instagram_business_id_missing",
      dryRun,
    };
  }

  if (dryRun) {
    // Validate everything but never call Meta.
    return {
      success: true,
      externalId: `dry-run-private-reply-${commentId}`,
      error: null,
      dryRun: true,
    };
  }

  const url =
    `https://graph.instagram.com/${META_GRAPH_VERSION}/` +
    `${encodeURIComponent(instagramBusinessId)}/messages`;

  // IMPORTANT: A comment-triggered private reply is one message.
  // The recipient MUST be the original comment_id.
  // We intentionally send the job URL as part of this single message.
  // Do not make a second /messages call here: Meta limits a private reply
  // to one message for the commenter.
  const payload = {
    recipient: {
      comment_id: commentId,
    },
    message: {
      text: message.trim(),
    },
  };

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok) {
      let safeError = `meta_http_${response.status}`;

      if (json && typeof json === "object") {
        const errorMessage =
          "error" in json &&
          typeof (json as { error?: { message?: unknown } }).error?.message ===
            "string"
            ? (json as { error: { message: string } }).error.message
            : null;

        if (errorMessage && !errorMessage.includes(accessToken)) {
          safeError = errorMessage.slice(0, 200);
        }
      }

      return {
        success: false,
        externalId: null,
        error: safeError,
        dryRun: false,
      };
    }

    const externalId =
      (json as { message_id?: string } | null)?.message_id ?? null;

    return {
      success: true,
      externalId,
      error: null,
      dryRun: false,
    };
  } catch (error) {
    return {
      success: false,
      externalId: null,
      error: error instanceof Error ? error.message : "unknown_network_error",
      dryRun: false,
    };
  }
}

/**
 * Builds the production-safe DM text from a rendered template.
 *
 * Example:
 *   "Here is the job [[CTA:View Job & Apply]]"
 *
 * becomes:
 *   "Here is the job
 *
 *    View Job & Apply: https://hiredaily.app/jobs/..."
 *
 * The URL is the exact mapped Hire Daily job URL.
 */
export function buildDmMessage(
  renderedTemplate: string,
  jobUrl: string,
): string {
  const cta = extractDmCta(renderedTemplate);
  let message = cta.text.trim();

  if (cta.label && jobUrl) {
    if (!message.includes(jobUrl)) {
      message = `${message}\n\n${cta.label}: ${jobUrl}`.trim();
    }
  }

  return message;
}

/** Read-only data-access contract for the DM orchestrator. */
export interface DmDataReader {
  getDmTemplateText(rule: RuleEngineRule): Promise<string | null>;
}

/**
 * Orchestrates a single Instagram Private Reply for a matched rule. The
 * private message is addressed using the original comment ID (ManyChat-style
 * comment → private reply flow). The DM is NOT sent when:
 *   - comment ID is missing
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
    rule: RuleEngineRule;
    commentId: string | null;
    matchedKeyword: string | null;
    resolution: PostJobResolution;
    commentStatus: CommentStatus;
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

  // Private Replies are addressed by the original comment ID.
  // The commenter user ID is retained only for safe logging/analytics.
  if (!input.commentId) {
    return {
      userId: input.userId,
      username: input.username,
      mediaId: input.mediaId,
      commentId: null,
      jobId: input.resolution.jobId,
      ruleId: input.rule.id,
      keyword: input.matchedKeyword,
      commentStatus: input.commentStatus,
      dmStatus: "failed",
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

  // Build ONE private-reply message.
  // The CTA marker is converted into the exact mapped Hire Daily URL.
  // Do not make a second /messages call for the button: Meta allows only one
  // private reply for the original comment.
  const dmMessage = buildDmMessage(
    render.rendered,
    input.resolution.jobUrl,
  );

  const dm = await sendDirectMessage(
    input.commentId,
    dmMessage,
    input.accessToken,
    {
      dryRun: input.dryRun,
      fetchImpl: deps.fetchImpl,
    },
  );

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
    commentStatus: CommentStatus;
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
