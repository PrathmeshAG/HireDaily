import "dotenv/config";

import express from "express";

import { parseWebhookEvents } from "./utils/webhook-parser.js";
import {
  writeAutomationLog,
  isFirebaseAdminConfigured,
  readActiveRules,
  writeRuleMatchLog,
  readAllRules,
  writeRule,
  
  deleteRule as deleteRuleRecord,
  readAllTemplates,
  writeTemplate,
  deleteTemplate as deleteTemplateRecord,
readAllPostMappings,
  readJob,
  readPostMapping,
  writePostMapping,
  deletePostMapping,
  readAllUsers,
  readAllLogs,
  readRecentAnalytics,
  writeInstagramMediaCache,
  readAllInstagramMedia,
  claimInstagramActionOnce,
  isKnownBotComment,
  rememberBotComment,
} from "./services/firebase-admin.service.js";
import { evaluateComment,explainRuleEvaluation, } from "./services/rule-engine.service.js";
import { cooldownService } from "./services/cooldown.service.js";
import { resolvePostJob } from "./services/post-mapping.service.js";
import {
  processCommentReplyProduction,
  resolveCommenterId,
} from "./services/instagram.service.js";
import { writeCommentReplyLog, writeDmLog } from "./services/firebase-admin.service.js";
import {
  makeFirebaseUserStore,
  makeFirebaseAnalyticsStore,
  applyTracking,
  incrementDailyAnalytics,
  dateKey,
  type UserStore,
  type AnalyticsStore,
} from "./services/user-analytics.service.js";
import type { RuleEvaluationContext } from "./types/rule-engine.js";
import { logger } from "./utils/logger.js";
import { validateEnvironment, env } from "./config/env.js";
import { requestContext } from "./utils/request-context.js";
import { corsMiddleware } from "./middleware/cors.js";
import { requireFirebaseAuth } from "./middleware/firebase-auth.js";
import { requireAdmin } from "./middleware/rbac.js";
import { requireMetaWebhookSignature, captureRawBody } from "./middleware/webhook-security.js";
import { apiRateLimiter } from "./middleware/rate-limit.js";
import { errorMonitor } from "./utils/error-monitor.js";
import { fetchInstagramMedia } from "./services/instagram-media.service.js";
import {
  handleFollowGateInteraction,
  processCommentWithFollowGate,
} from "./services/follow-gate.service.js";

validateEnvironment();

const app = express();

/**
 * Instagram webhook safety guards.
 *
 * Meta can deliver the same webhook more than once and it also delivers
 * webhook events for replies made by our own Instagram account. Those own
 * replies must NEVER be fed back into the automation rule engine, otherwise
 * "Check Your DM" can trigger another "Check Your DM" reply.
 *
 * The Firebase claim below remains the cross-instance/idempotency guard.
 * These in-memory guards additionally stop duplicate processing while two
 * deliveries are being handled by the same server instance at the same time.
 */
const IN_FLIGHT_COMMENT_TTL_MS = 10 * 60 * 1000;
const inFlightCommentActions = new Map<string, number>();

function cleanupInFlightCommentActions(now = Date.now()): void {
  for (const [commentId, expiresAt] of inFlightCommentActions.entries()) {
    if (expiresAt <= now) {
      inFlightCommentActions.delete(commentId);
    }
  }
}

function claimLocalCommentProcessing(commentId: string): boolean {
  const now = Date.now();
  cleanupInFlightCommentActions(now);

  if (inFlightCommentActions.has(commentId)) {
    return false;
  }

  inFlightCommentActions.set(commentId, now + IN_FLIGHT_COMMENT_TTL_MS);
  return true;
}

let resolvedOwnInstagramIdentity: {
  id: string | null;
  username: string | null;
} | null = null;


async function resolveOwnInstagramIdentity(): Promise<{
  id: string | null;
  username: string | null;
}> {
  if (resolvedOwnInstagramIdentity) {
    return resolvedOwnInstagramIdentity;
  }

  const configuredId =
    process.env.INSTAGRAM_BUSINESS_ID?.trim() ||
    process.env.INSTAGRAM_USER_ID?.trim() ||
    process.env.META_INSTAGRAM_USER_ID?.trim() ||
    "";

  const configuredUsername =
    process.env.INSTAGRAM_USERNAME?.trim().replace(/^@/, "").toLowerCase() || "";

  const accessToken = process.env.META_ACCESS_TOKEN?.trim() || "";

  // Prefer explicit environment values. If the username/id is not complete,
  // ask Meta once and cache the safe identity fields.
  let id = configuredId || null;
  let username = configuredUsername || null;

  if (accessToken && (id || !configuredId)) {
    try {
      const graphTarget = id ? encodeURIComponent(id) : "me";
      const url =
        `https://graph.facebook.com/v24.0/${graphTarget}` +
        "?fields=id,username";

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = (await response.json()) as {
          id?: string;
          username?: string;
        };

        id = typeof data.id === "string" ? data.id : id;
        username =
          typeof data.username === "string"
            ? data.username.trim().replace(/^@/, "").toLowerCase()
            : username;
      }
    } catch (error) {
      logger.warn("Failed to resolve own Instagram identity", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  resolvedOwnInstagramIdentity = { id, username };
  return resolvedOwnInstagramIdentity;
}

async function isOwnInstagramComment(event: {
  eventType: string;
  userId: string | null;
  username: string | null;
  commentId?: string | null;
  parentId?: string | null;
}): Promise<boolean> {
  if (event.eventType !== "comment") {
    return false;
  }

  // Durable guard for comments created by our own public-reply API call.
  // This prevents the self-reply loop even if Meta's `from` identity is
  // missing or the configured Instagram id cannot be resolved.
  if (event.commentId && (await isKnownBotComment(event.commentId))) {
    return true;
  }

  const identity = await resolveOwnInstagramIdentity();

  const eventUserId = event.userId?.trim() || "";
  const eventUsername =
    event.username?.trim().replace(/^@/, "").toLowerCase() || "";

  return (
    (!!identity.id && !!eventUserId && eventUserId === identity.id) ||
    (!!identity.username &&
      !!eventUsername &&
      eventUsername === identity.username)
  );
}

app.use(requestContext);
app.use(corsMiddleware);

// IMPORTANT: Meta signs the exact request bytes. Use route-scoped raw parsers
// for webhook endpoints so req.body is the original Buffer until signature
// verification has completed. Normal application APIs keep express.json().
app.use(
  "/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
    verify: captureRawBody,
  }),
);
app.use(
  "/webhooks/instagram",
  express.raw({
    type: "application/json",
    limit: "1mb",
    verify: captureRawBody,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Meta webhook traffic is authenticated by X-Hub-Signature-256 rather than
// by the admin API auth layer. Never rate-limit webhook ingestion here: Meta
// may legitimately redeliver events during transient failures.
app.use("/webhook", requireMetaWebhookSignature);
app.use("/webhooks/instagram", requireMetaWebhookSignature);

// All automation management endpoints are admin-only. Firebase ID tokens are
// verified server-side; the browser's email/UI gate is never trusted here.
app.use("/api/automation", apiRateLimiter, requireFirebaseAuth, requireAdmin);

/** GET /health — cheap liveness/connectivity probe. */
app.get("/health", (_req, res) => {
  // firebaseAdmin reports Firebase Admin *initialization* success: true only
  // when the Admin SDK was configured with valid env credentials. No Admin
  // credentials are ever exposed here or to the frontend.
  const firebaseAdmin = isFirebaseAdminConfigured();
  res.status(200).json({
    status: firebaseAdmin ? "ok" : "degraded",
    service: "hiredaily-backend",
    firebaseAdmin,
    timestamp: new Date().toISOString(),
  });
});

/** GET /webhook — Meta subscription verification (hub.challenge). */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN ?? "";
  const verified = mode === "subscribe" && !!token && token === expectedToken;
  if (verified) {
    logger.info("Webhook verified");
    res.status(200).send(challenge);
    return;
  }
  // Never log the raw verify_token (or WEBHOOK_VERIFY_TOKEN) — only booleans.
  logger.warn("Webhook verification failed", {
    mode,
    tokenPresent: !!token,
    verificationSucceeded: false,
  });
  res.status(403).send("Forbidden");
});

/**
 * GET /webhooks/instagram — Meta webhook subscription verification callback.
 *
 * Meta calls this during webhook setup to confirm the callback URL. It uses
 * the standard hub.mode / hub.verify_token / hub.challenge handshake:
 *   1. hub.mode === "subscribe"
 *   2. hub.verify_token matches process.env.META_VERIFY_TOKEN
 *   3. → respond 200 with hub.challenge
 *   otherwise → 403
 *
 * This is the verification counterpart to the existing POST /webhooks/instagram
 * event-ingestion route (which is left unchanged).
 */
app.get("/webhooks/instagram", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

const expectedToken = process.env.META_VERIFY_TOKEN ?? "";
  const verificationSucceeded = mode === "subscribe" && !!token && token === expectedToken;
  if (verificationSucceeded) {
    logger.info("Instagram webhook verified");
    res.status(200).send(challenge);
    return;
  }
  // Never log the raw verify_token (or META_VERIFY_TOKEN) — only booleans.
  logger.warn("Instagram webhook verification failed", {
    mode,
    tokenPresent: !!token,
    verificationSucceeded: false,
  });
  res.status(403).send("Forbidden");
});

/** Builds the RuleEngine input context from a normalized webhook event. */
function toRuleContext(event: {
  commentText: string | null;
  mediaId: string | null;
  userId: string | null;
  username: string | null;
  commentId: string | null;
}): RuleEvaluationContext {
  return {
    commentText: event.commentText ?? "",
    mediaId: event.mediaId,
    userId: event.userId,
    username: event.username,
    commentId: event.commentId,
    receivedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Phase 5 Checkpoint 5 — user + analytics tracking stores (lazy, best-effort)
// ---------------------------------------------------------------------------

let userStorePromise: Promise<UserStore> | null = null;
let analyticsStorePromise: Promise<AnalyticsStore> | null = null;

function trackingStores(): { user: Promise<UserStore>; analytics: Promise<AnalyticsStore> } {
  userStorePromise ??= makeFirebaseUserStore();
  analyticsStorePromise ??= makeFirebaseAnalyticsStore();
  return { user: userStorePromise, analytics: analyticsStorePromise };
}

/**
 * Phase 5 Checkpoint 1 — evaluate one event against the active ruleset and
 * apply cooldown/duplicate suppression, then persist a keyword_matched /
 * error log. This NEVER sends a Meta reply or DM (that's later Phase 5 work).
 * Best-effort: a failure here must not break Phase 4 logging, so it is
 * wrapped and swallowed (the outer try/catch in ingestWebhook still returns
 * 200 so Meta doesn't retry).
 */
async function runRuleEngine(event: {
  eventType: string;
  commentText: string | null;
  mediaId: string | null;
  userId: string | null;
  username: string | null;
  commentId: string | null;
  parentId: string | null;
  eventId: string;
  interactionPayload?: string | null;
  interactionTitle?: string | null;
  isEcho?: boolean;
  isSelf?: boolean;
}): Promise<void> {
  try {
    if (event.eventType === "message_interaction") {
      if (event.isEcho || event.isSelf) return;
      await handleFollowGateInteraction({
        eventId: event.eventId,
        userId: event.userId,
        username: event.username,
        payload: event.interactionPayload ?? null,
      });
      return;
    }

    if (event.eventType === "message" && !event.isEcho && !event.isSelf && event.interactionPayload) {
      await handleFollowGateInteraction({
        eventId: event.eventId,
        userId: event.userId,
        username: event.username,
        payload: event.interactionPayload,
      });
      return;
    }

    if (event.eventType !== "comment") return;

    // IMPORTANT: Instagram sends webhook events for comments/replies made by
    // our own account too. Never feed those events into the rule engine, or
    // the bot will match its own "Check Your DM" reply and create another
    // public reply (self-comment loop).
    //
    // The identity check uses both configured values and a one-time Graph API
    // lookup, so this still works when the webhook payload does not include
    // our username but does include our user id (or vice versa).
    const isOwnComment = await isOwnInstagramComment(event);

    if (isOwnComment) {
      logger.info("Ignoring own Instagram comment", {
        eventId: event.eventId,
        commentId: event.commentId,
        userId: event.userId,
        username: event.username,
      });
      return;
    }

    // A webhook can be delivered twice before the first delivery finishes.
    // Claim the comment locally BEFORE rule evaluation/external side effects.
    // Firebase claimInstagramActionOnce remains the durable cross-instance
    // protection immediately before the actual Meta calls.
    if (event.eventType === "comment" && event.commentId) {
      const locallyClaimed = claimLocalCommentProcessing(event.commentId);

      if (!locallyClaimed) {
        logger.info("Ignoring duplicate in-flight Instagram comment webhook", {
          eventId: event.eventId,
          commentId: event.commentId,
          userId: event.userId,
        });
        return;
      }
    }

    const now = Date.now();
    const activeRules = await readActiveRules(now);
    if (activeRules.length === 0) return;

    const context = toRuleContext(event);
    const result = evaluateComment(activeRules, context, now);

console.log("🔥 RULE ENGINE RESULT", {
  matched: result.matched,
  ruleId: result.ruleId,
  matchedKeyword: result.matchedKeyword,
  reason: result.reason,
  mediaId: context.mediaId,
  commentText: context.commentText,
});

console.log(
  "🔎 RULE ENGINE DIAGNOSTICS",
  explainRuleEvaluation(
    activeRules,
    context,
    now,
  ),
);;

    // Phase 5 Checkpoint 5 — dry-run flag + follow-verification capability.
    const dryRun = process.env.META_DRY_RUN === "true";

    if (result.matched && result.rule) {
      let followStatusForTracking: "verified" | "not_verified" | "unsupported" | "unknown" | null = null;
      const decision = cooldownService.shouldFire(context, result.rule, now);
      result.cooldownApplied = decision.cooldownApplied;
      result.duplicate = decision.duplicate;
      if (decision.allowed) {
        cooldownService.record(context, result.rule, now);
      }

// Phase 5 Checkpoint 2 — resolve the Instagram post to the Hire Daily
      // job. Only runs for a matched rule with a mediaId. It reads the
      // mapping + job (READ-ONLY) and builds the public job URL.
      //
      // Checkpoint 4 integration fix: the whole reply/DM/analytics flow is
      // gated on `decision.allowed`. When cooldown/dedupe rejected the event
      // (duplicate commentId or same user/rule/post within cooldown), we must
      // NOT send a comment reply or DM, and must NOT double-count analytics.
      // The matched rule is still recorded below via writeRuleMatchLog with
      // the duplicate/cooldownApplied flags so the Logs page reflects the
      // suppression.
      if (decision.allowed && event.mediaId) {
        try {
          const resolution = await resolvePostJob(event.mediaId);
          logger.info("Post job resolution", {
            eventId: event.eventId,
            mediaId: event.mediaId,
            mapped: resolution.mapped,
            jobId: resolution.jobId,
            reason: resolution.reason,
          });

          // Phase 5 Checkpoint 3 — send a PUBLIC comment reply (only for a
          // comment event with a real comment id). Best-effort: a failure
          // here must NOT break the Phase 4 webhook 200 response. The
          // commentStatus (pending/success/failed) is persisted to Firebase,
          // and any error is stored safely (never the token).
          if (event.eventType === "comment" && event.commentId) {
            let commentStatus: "pending" | "success" | "failed" | "skipped" = "pending";
            let dmStatus: "pending" | "success" | "failed" | "skipped" = "pending";
            try {
              const claimed = await claimInstagramActionOnce(event.commentId, "comment_reply");
              if (!claimed) {
                commentStatus = "skipped";
                logger.info("Skipping duplicate Instagram comment reply", {
                  eventId: event.eventId,
                  commentId: event.commentId,
                });
                await writeCommentReplyLog({
                  userId: event.userId,
                  username: event.username,
                  mediaId: event.mediaId,
                  commentId: event.commentId,
                  jobId: resolution.jobId,
                  ruleId: result.rule.id,
                  keyword: result.matchedKeyword,
                  commentStatus: "skipped",
                  error: "duplicate_suppressed",
                  dryRun,
                  timestamp: Date.now(),
                });
              } else {
                const replyData = await processCommentReplyProduction({
                  commentId: event.commentId,
                  mediaId: event.mediaId,
                  userId: event.userId,
                  username: event.username,
                  rule: result.rule,
                  matchedKeyword: result.matchedKeyword,
                  resolution,
                });
                commentStatus = replyData.commentStatus;
                await writeCommentReplyLog(replyData);
                if (replyData.externalId && !replyData.dryRun) {
                  await rememberBotComment(replyData.externalId);
                }
              }
            } catch (replyError) {
              commentStatus = "failed";
              logger.error("Comment reply flow failed", {
                eventId: event.eventId,
                commentId: event.commentId,
                error: replyError,
              });
              await writeCommentReplyLog({
                userId: event.userId,
                username: event.username,
                mediaId: event.mediaId,
                commentId: event.commentId,
                jobId: resolution.jobId,
                ruleId: result.rule.id,
                keyword: result.matchedKeyword,
                commentStatus: "failed",
                error: "comment_reply_flow_failed",
                dryRun,
                timestamp: Date.now(),
              }).catch((e) => logger.error("Failed to write reply log", e));
            }

            // Phase 6 — Follow Gate controls access to the existing Job DM.
            // The public comment reply above is unchanged. If the user is a
            // returning user, the follow relationship is freshly verified;
            // otherwise the first matched comment receives the Follow Gate.
            try {
              const dmResult = await processCommentWithFollowGate({
                userId: event.userId ?? (await resolveCommenterId(event.commentId, process.env.META_ACCESS_TOKEN?.trim() ?? "")),
                username: event.username,
                mediaId: event.mediaId,
                commentId: event.commentId,
                rule: result.rule,
                matchedKeyword: result.matchedKeyword,
                commentStatus,
                dryRun,
              });
              dmStatus = dmResult.dm.dmStatus;
              followStatusForTracking = dmResult.followStatus;
              // The Follow Gate service writes its own DM log so the existing
              // logging schema remains unchanged.
            } catch (dmError) {
              dmStatus = "failed";
              logger.error("Follow Gate / DM flow failed", {
                eventId: event.eventId,
                commentId: event.commentId,
                error: dmError,
              });
              await writeDmLog({
                userId: event.userId,
                username: event.username,
                mediaId: event.mediaId,
                commentId: event.commentId,
                jobId: resolution.jobId,
                ruleId: result.rule.id,
                keyword: result.matchedKeyword,
                commentStatus,
                dmStatus: "failed",
                error: "follow_gate_flow_failed",
                dryRun,
                timestamp: Date.now(),
              }).catch((e) => logger.error("Failed to write Follow Gate log", e));
            }

            // Phase 5 Checkpoint 5 — analytics + user tracking for the matched
            // comment event. followStatus is unsupported (no confirmed Meta
            // capability), which increments followUnsupported. Best-effort:
            // never blocks the webhook 200. Dry-run is honored (no fake sends).
            try {
              const { user: userStoreP, analytics: analyticsStoreP } = trackingStores();
              await applyTracking(await userStoreP, await analyticsStoreP, {
                userId: event.userId,
                username: event.username,
                now: Date.now(),
                commentReceived: true,
                matched: true,
                commentReplyStatus: commentStatus,
                dmStatus,
                followStatus: followStatusForTracking,
                automationError: false,
                dryRun,
              });
            } catch (trackErr) {
              logger.error("Analytics tracking failed", { eventId: event.eventId, error: trackErr });
            }
          }
        } catch (resolveError) {
          logger.error("Post job resolution failed", {
            eventId: event.eventId,
            mediaId: event.mediaId,
            error: resolveError,
          });
        }
      }
    }

    await writeRuleMatchLog(result, {
      username: event.username,
      mediaId: event.mediaId,
      eventId: event.eventId,
    });
  } catch (error) {
    // Phase 5 Checkpoint 5 — count unexpected automation errors.
    try {
      const { analytics } = trackingStores();
      await incrementDailyAnalytics(await analytics, dateKey(Date.now()), "automationErrors");
} catch (e) {
      logger.error("Failed to increment automationErrors", { error: e });
    }
    logger.error("Rule engine evaluation failed", { eventId: event.eventId, error });
  }
}

/** Meta event ingestion handler — shared by /webhook and /webhooks/instagram. */
async function ingestWebhook(req: express.Request, res: express.Response): Promise<void> {
  // Webhook routes use express.raw() so signature verification receives the
  // exact bytes Meta signed. Only after the security middleware has called
  // next() do we parse the Buffer into the JSON object expected by the
  // existing webhook parser.
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
    } catch (error) {
      logger.error("Failed to parse verified Instagram webhook JSON", {
        error: error instanceof Error ? error.message : "unknown_error",
        requestId: req.requestId,
      });
      res.status(400).json({ error: "invalid_webhook_json" });
      return;
    }
  }

  const events = parseWebhookEvents(req.body);
  for (const event of events) {
    try {
      await writeAutomationLog(event, "received");
    } catch (error) {
      logger.error("Failed to write automation log", { eventId: event.eventId, error });
      await writeAutomationLog(event, "error").catch((e) => logger.error("Failed to write error log", e));
    }

    // Phase 5 Checkpoint 1 — Rule Engine (best-effort, non-blocking).
    // Duplicate protection is applied atomically immediately before each
    // external side effect (comment reply / DM), so concurrent Vercel
    // instances cannot both send the same action.
    await runRuleEngine(event);
  }
  // Always 200 so Meta doesn't retry/resend events that we already parsed.
  res.status(200).json({ received: events.length });
}

/** POST /webhook — Meta event ingestion (original Phase 4 route, kept for backward compatibility). */
app.post("/webhook", ingestWebhook);

/** POST /webhooks/instagram — Meta event ingestion alias used by the Phase 4 test runner. */
app.post("/webhooks/instagram", ingestWebhook);

// ===========================================================================
// Phase 6 Checkpoint 2 — Automation management API.
//
// These routes let the existing Phase 2 frontend manage rules, templates and
// post mappings through the backend. All privileged access (Firebase Admin)
// stays backend-only; the API returns safe JSON with no secrets. Jobs remain
// READ-ONLY — nothing here writes to `jobs/*`.
// ===========================================================================

/** GET /api/automation/rules — list all rules (management view). */
app.get("/api/automation/rules", async (_req, res) => {
  try {
    const rules = await readAllRules();
    res.status(200).json({ rules });
  } catch (e) {
    logger.error("Failed to list rules", { error: e });
    res.status(500).json({ error: "failed_to_list_rules" });
  }
});

/** POST /api/automation/rules — create a rule. */
app.post("/api/automation/rules", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id: string = typeof body.id === "string" && body.id ? body.id : `rule_${Date.now()}`;
    // Validate channel is instagram (the only supported channel).
    if (body.channel && body.channel !== "instagram") {
      res.status(400).json({ error: "invalid_channel" });
      return;
    }
    // Validate keywords for keyword-mode rules.
    const mode = body.mode === "any_comment" ? "any_comment" : "keyword";
    if (mode === "keyword") {
      const keywords = Array.isArray(body.keywords) ? body.keywords.filter((k) => typeof k === "string") : [];
      if (keywords.length === 0) {
        res.status(400).json({ error: "keywords_required" });
        return;
      }
    }
    const now = Date.now();
    await writeRule(id, {
      id,
      channel: "instagram",
      mode,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      matchType: body.matchType === "exact" ? "exact" : "contains",
      scope: body.scope === "specific_post" ? "specific_post" : "all_posts",
      postId: typeof body.postId === "string" ? body.postId : null,
      postLabel: typeof body.postLabel === "string" ? body.postLabel : null,
      commentTemplateId: typeof body.commentTemplateId === "string" ? body.commentTemplateId : null,
      dmTemplateId: typeof body.dmTemplateId === "string" ? body.dmTemplateId : null,
      replyMode:
        body.replyMode === "comment_only" || body.replyMode === "dm_only" || body.replyMode === "comment_and_dm"
          ? body.replyMode
          : "comment_and_dm",
      cooldownMinutes: typeof body.cooldownMinutes === "number" ? body.cooldownMinutes : 0,
      activeFrom: typeof body.activeFrom === "number" ? body.activeFrom : null,
      activeUntil: typeof body.activeUntil === "number" ? body.activeUntil : null,
      active: body.active !== false,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ id });
  } catch (e) {
    logger.error("Failed to create rule", { error: e });
    res.status(500).json({ error: "failed_to_create_rule" });
  }
});

/** PATCH /api/automation/rules/:id — update a rule (partial). */
app.patch("/api/automation/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = (await readAllRules()).find((r) => r.id === id);
    if (!existing) {
      res.status(404).json({ error: "rule_not_found" });
      return;
    }
    const merged: Record<string, unknown> = {
      ...existing,
      ...body,
      id,
      channel: "instagram",
      updatedAt: Date.now(),
    };
    await writeRule(id, merged);
    res.status(200).json({ id });
  } catch (e) {
    logger.error("Failed to update rule", { error: e });
    res.status(500).json({ error: "failed_to_update_rule" });
  }
});

/** DELETE /api/automation/rules/:id — delete a rule. */
app.delete("/api/automation/rules/:id", async (req, res) => {
  try {
    await deleteRuleRecord(req.params.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    logger.error("Failed to delete rule", { error: e });
    res.status(500).json({ error: "failed_to_delete_rule" });
  }
});

/** GET /api/automation/templates — list all templates. */
app.get("/api/automation/templates", async (_req, res) => {
  try {
    const templates = await readAllTemplates();
    res.status(200).json({ templates });
  } catch (e) {
    logger.error("Failed to list templates", { error: e });
    res.status(500).json({ error: "failed_to_list_templates" });
  }
});

/** POST /api/automation/templates — create a template. */
app.post("/api/automation/templates", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const id: string = typeof body.id === "string" && body.id ? body.id : `tpl_${Date.now()}`;
    if (typeof body.name !== "string" || !body.name.trim() || typeof body.text !== "string" || !body.text.trim()) {
      res.status(400).json({ error: "name_and_text_required" });
      return;
    }
    const now = Date.now();
    await writeTemplate(id, {
      id,
      kind: body.kind === "dm" ? "dm" : "comment",
      channel: body.channel === "whatsapp" || body.channel === "telegram" || body.channel === "hiremind" ? body.channel : "instagram",
      name: body.name,
      text: body.text,
      updatedAt: now,
    });
    res.status(201).json({ id });
  } catch (e) {
    logger.error("Failed to create template", { error: e });
    res.status(500).json({ error: "failed_to_create_template" });
  }
});

/** PATCH /api/automation/templates/:id — update a template (partial). */
app.patch("/api/automation/templates/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = (await readAllTemplates()).find((t) => t.id === id);
    if (!existing) {
      res.status(404).json({ error: "template_not_found" });
      return;
    }
    await writeTemplate(id, {
      ...existing,
      ...body,
      id,
      updatedAt: Date.now(),
    });
    res.status(200).json({ id });
  } catch (e) {
    logger.error("Failed to update template", { error: e });
    res.status(500).json({ error: "failed_to_update_template" });
  }
});

/** DELETE /api/automation/templates/:id — delete a template. */
app.delete("/api/automation/templates/:id", async (req, res) => {
  try {
    await deleteTemplateRecord(req.params.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    logger.error("Failed to delete template", { error: e });
    res.status(500).json({ error: "failed_to_delete_template" });
  }
});

/**
 * GET /api/automation/instagram/media — fetch latest Instagram media and
 * refresh the safe Firebase media cache. This never returns the access token.
 */
app.get("/api/automation/instagram/media", async (req, res) => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const parsed = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : 30;
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 30;

    try {
      const media = await fetchInstagramMedia(limit);
      await writeInstagramMediaCache(
        media.map((item) => ({ ...item, syncedAt: Date.now() })),
      );
      res.status(200).json({ media, source: "instagram" });
      return;
    } catch (liveError) {
      logger.warn("Instagram media sync failed; serving cache", {
        error: liveError instanceof Error ? liveError.message : "unknown_error",
      });

      const cached = await readAllInstagramMedia();
      if (cached.length > 0) {
        res.status(200).json({
          media: cached.slice(0, limit).map(({ syncedAt: _syncedAt, ...item }) => item),
          source: "cache",
          warning: "instagram_media_sync_failed",
        });
        return;
      }

      throw liveError;
    }
  } catch (e) {
    logger.error("Failed to load Instagram media", { error: e });
    res.status(502).json({ error: "failed_to_load_instagram_media" });
  }
});

/**
 * POST /api/automation/instagram/media/sync — explicit admin refresh.
 * Reuses the same live Meta fetch + Firebase cache behavior as the GET route.
 */
app.post("/api/automation/instagram/media/sync", async (req, res) => {
  try {
    const rawLimit = Array.isArray(req.body?.limit) ? req.body.limit[0] : req.body?.limit;
    const parsed = typeof rawLimit === "number" ? rawLimit : Number.parseInt(String(rawLimit ?? "50"), 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;

    const media = await fetchInstagramMedia(limit);
    await writeInstagramMediaCache(
      media.map((item) => ({ ...item, syncedAt: Date.now() })),
    );
    res.status(200).json({ media, source: "instagram" });
  } catch (e) {
    logger.error("Failed to sync Instagram media", { error: e });
    res.status(502).json({ error: "failed_to_sync_instagram_media" });
  }
});

/** GET /api/automation/post-mappings — list all post mappings. */
app.get("/api/automation/post-mappings", async (_req, res) => {
  try {
    const mappings = await readAllPostMappings();
    res.status(200).json({ mappings });
  } catch (e) {
    logger.error("Failed to list post mappings", { error: e });
    res.status(500).json({ error: "failed_to_list_post_mappings" });
  }
});

/** POST /api/automation/post-mappings — create a mapping (keyed by mediaId). */
app.post("/api/automation/post-mappings", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const mediaId = typeof body.mediaId === "string" ? body.mediaId.trim() : "";
    const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
    if (!mediaId || !jobId) {
      res.status(400).json({ error: "mediaId_and_jobId_required" });
      return;
    }

    const existing = await readPostMapping(mediaId);
    if (existing) {
      res.status(409).json({ error: "post_mapping_already_exists", mediaId });
      return;
    }

    const instagramPostUrl =
      typeof body.instagramPostUrl === "string"
        ? body.instagramPostUrl.trim()
        : "";

    if (!instagramPostUrl) {
      res.status(400).json({ error: "instagram_post_url_required" });
      return;
    }

    await writePostMapping(mediaId, {
  jobId,
  jobTitleCache:
    typeof body.jobTitleCache === "string"
      ? body.jobTitleCache.trim()
      : null,

  instagramPostUrl,

  mappedAt: Date.now(),
  updatedAt: Date.now(),
});
    res.status(201).json({ id: mediaId, mediaId, jobId });
  } catch (e) {
    logger.error("Failed to create post mapping", { error: e });
    res.status(500).json({ error: "failed_to_create_post_mapping" });
  }
});

/** PATCH /api/automation/post-mappings/:mediaId — update a mapping. */
/** PATCH /api/automation/post-mappings/:mediaId — update a mapping. */
app.patch("/api/automation/post-mappings/:mediaId", async (req, res) => {
  try {
    const mediaId = req.params.mediaId.trim();

    if (!mediaId) {
      res.status(400).json({ error: "mediaId_required" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    const existing = await readPostMapping(mediaId);

    if (!existing) {
      res.status(404).json({
        error: "post_mapping_not_found",
        mediaId,
      });
      return;
    }

    const jobId =
      typeof body.jobId === "string" && body.jobId.trim()
        ? body.jobId.trim()
        : existing.jobId;

    const jobTitleCache =
      typeof body.jobTitleCache === "string"
        ? body.jobTitleCache.trim()
        : existing.jobTitleCache;

    // Keep the Instagram post URL if the frontend sends it.
    const instagramPostUrl =
      typeof body.instagramPostUrl === "string"
        ? body.instagramPostUrl.trim()
        : existing.instagramPostUrl;

    await writePostMapping(mediaId, {
      ...existing,

      jobId,
      jobTitleCache,
      instagramPostUrl,

      // Preserve original mapping time.
      mappedAt: existing.mappedAt ?? Date.now(),

      // Useful for debugging/admin UI.
      updatedAt: Date.now(),
    });

    res.status(200).json({
      ok: true,
      id: mediaId,
      mediaId,
      jobId,
      jobTitleCache,
      instagramPostUrl,
    });
  } catch (e) {
    logger.error("Failed to update post mapping", {
      mediaId: req.params.mediaId,
      error: e,
    });

    res.status(500).json({
      error: "failed_to_update_post_mapping",
    });
  }
});

/** DELETE /api/automation/post-mappings/:mediaId — delete a mapping. */
app.delete("/api/automation/post-mappings/:mediaId", async (req, res) => {
  try {
    await deletePostMapping(req.params.mediaId);
    res.status(200).json({ ok: true });
  } catch (e) {
    logger.error("Failed to delete post mapping", { error: e });
    res.status(500).json({ error: "failed_to_delete_post_mapping" });
  }
});

// ===========================================================================
// Phase 6 Checkpoint 3 — Read-only automation API.
//
// These routes expose read-only data (users, logs, analytics, summary,
// settings status) to the existing Phase 2 frontend. Firebase Admin stays
// backend-only — the browser never sees any secret/token/credential value,
// only safe status booleans and counters. All reads come from `automation/*`
// only; `jobs/*` is never written here.
// ===========================================================================

/** GET /api/automation/users — list all automation users (most recent first). */
app.get("/api/automation/users", async (_req, res) => {
  try {
    const users = await readAllUsers();
    res.status(200).json({ users });
  } catch (e) {
    logger.error("Failed to list users", { error: e });
    res.status(500).json({ error: "failed_to_list_users" });
  }
});

/**
 * GET /api/automation/logs — list the most recent automation logs.
 * Optional ?limit=N (default 200). Returns safe, frontend-compatible log
 * entries with no secrets.
 */
app.get("/api/automation/logs", async (req, res) => {
  try {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const parsed = typeof rawLimit === "string" ? Number.parseInt(rawLimit, 10) : Number.NaN;
    const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 200;
    const logs = await readAllLogs(limit);
    res.status(200).json({ logs });
  } catch (e) {
    logger.error("Failed to list logs", { error: e });
    res.status(500).json({ error: "failed_to_list_logs" });
  }
});

/**
 * GET /api/automation/analytics — last 14 days of daily analytics counters.
 * Returns { users, daily, topKeywords, topPosts }. topKeywords/topPosts are
 * derived from the same Phase 5 analytics data (keyword/post counts are not
 * stored separately yet, so keyword aggregates are derived from matched
 * keyword logs and post aggregates from post-mapping labels). Safe, read-only.
 */
app.get("/api/automation/analytics", async (_req, res) => {
  try {
    const daily = await readRecentAnalytics(14);
    const logs = await readAllLogs(500);
    const rules = await readAllRules();
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

    // Keyword counts from keyword_matched logs. Older log records can have a
    // missing ruleKeyword even though the human-readable detail contains the
    // matched keyword, so use that detail as a backward-compatible fallback.
    const keywordCounts = new Map<string, number>();
    // Top-post counts come from matched-rule logs keyed by the real Instagram
    // mediaId, then resolve the existing post mapping/job for a human label.
    const postCounts = new Map<string, { mediaId: string; triggers: number; jobId: string }>();

    for (const log of logs) {
      if (log.type !== "keyword_matched") continue;

      let keyword = log.ruleKeyword?.trim() || null;
      if (!keyword && log.detail) {
        const detailMatch = log.detail.match(/matched keyword\s+[\"]([^\"]+)[\"]\s*$/i);
        if (detailMatch?.[1]) keyword = detailMatch[1].trim();
      }

      // If a legacy log has no keyword in either field, only infer it when
      // the matched rule had exactly one keyword. Never invent a keyword for
      // an any-comment rule or a multi-keyword rule.
      if (!keyword && log.ruleId) {
        const rule = rulesById.get(log.ruleId);
        if (rule?.mode === "keyword" && rule.keywords.length === 1) {
          keyword = rule.keywords[0];
        }
      }

      if (keyword) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
      }

      if (log.mediaId) {
        const mapping = await readPostMapping(log.mediaId);
        if (mapping?.jobId) {
          const current = postCounts.get(log.mediaId);
          postCounts.set(log.mediaId, {
            mediaId: log.mediaId,
            triggers: (current?.triggers ?? 0) + 1,
            jobId: mapping.jobId,
          });
        }
      }
    }

    const topKeywords = [...keywordCounts.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const postEntries = [...postCounts.values()]
      .sort((a, b) => b.triggers - a.triggers)
      .slice(0, 10);

    const topPosts = (await Promise.all(
      postEntries.map(async ({ mediaId, triggers, jobId }) => {
        const job = await readJob(jobId);
        const postLabel = [job?.jobTitle, job?.company].filter(Boolean).join(" — ") || `Instagram post ${mediaId}`;
        return {
          postLabel,
          triggers,
          mediaId,
          postUrl: (await readPostMapping(mediaId))?.instagramPostUrl ?? null,
        };
      }),
    ));

    const users = (await readAllUsers()).length;

    res.status(200).json({ users, daily, topKeywords, topPosts });
  } catch (e) {
    logger.error("Failed to load analytics", { error: e });
    res.status(500).json({ error: "failed_to_load_analytics" });
  }
});

/**
 * GET /api/automation/summary — dashboard summary derived from backend data.
 * Returns connected/totalMappings/activeRules plus today's comment/DM/failed
 * counts from the daily analytics node. No privileged data is computed in the
 * browser.
 */
app.get("/api/automation/summary", async (_req, res) => {
  try {
    const [rules, mappings, daily] = await Promise.all([
      readAllRules(),
      readAllPostMappings(),
      readRecentAnalytics(1),
    ]);

    const activeRules = rules.filter((r) => r.active).length;
    const today = daily[0] ?? {
      date: "",
      commentsReceived: 0,
      commentsMatched: 0,
      commentsSent: 0,
      commentsFailed: 0,
      dmsSent: 0,
      dmsFailed: 0,
      followVerified: 0,
      followNotVerified: 0,
      followUnsupported: 0,
      automationErrors: 0,
    };

    res.status(200).json({
      connected: isFirebaseAdminConfigured(),
      totalMappings: mappings.length,
      activeRules,
      todaysComments: today.commentsReceived,
      todaysDMs: today.dmsSent,
      failedAutomations: today.automationErrors,
    });
  } catch (e) {
    logger.error("Failed to load summary", { error: e });
    res.status(500).json({ error: "failed_to_load_summary" });
  }
});

/**
 * GET /api/automation/settings — safe status booleans ONLY. Never returns
 * META_ACCESS_TOKEN, META_APP_SECRET, FIREBASE_PRIVATE_KEY, Firebase Admin
 * credentials, or any environment variable value. Only derived booleans:
 * firebaseConfigured, metaConfigured, dryRun, webhookConfigured, serviceStatus.
 */
app.get("/api/automation/settings", async (req, res) => {
  try {
    const startedAt = Date.now();
    const isFirebase = isFirebaseAdminConfigured();
    const metaConfigured = !!process.env.META_ACCESS_TOKEN?.trim();
    const dryRun = process.env.META_DRY_RUN?.trim().toLowerCase() === "true";
    const webhookConfigured =
      !!process.env.META_VERIFY_TOKEN?.trim() ||
      !!process.env.WEBHOOK_VERIFY_TOKEN?.trim();

    let instagram = {
      connected: false,
      username: null as string | null,
      accountType: null as string | null,
    };

    const accessToken = process.env.META_ACCESS_TOKEN?.trim();
    const instagramBusinessId = process.env.INSTAGRAM_BUSINESS_ID?.trim();

    if (accessToken && instagramBusinessId) {
      const connectionChecks: Array<{ url: string; source: string }> = [
        {
          // Facebook Login / Page-token path. This is the same host used by
          // the production comment + media APIs. Keep the required fields
          // minimal so a field-level API change cannot report a healthy
          // connection as disconnected.
          url:
            `https://graph.facebook.com/v24.0/${encodeURIComponent(instagramBusinessId)}` +
            "?fields=id,username",
          source: "facebook",
        },
        {
          // Instagram Login path. Some tokens are valid only on the
          // graph.instagram.com host and use /me rather than the business ID.
          url:
            `https://graph.instagram.com/v24.0/me` +
            "?fields=user_id,username,account_type",
          source: "instagram",
        },
      ];

      for (const check of connectionChecks) {
        try {
          const metaStartedAt = Date.now();
          const metaResponse = await fetch(check.url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const latencyMs = Date.now() - metaStartedAt;

          if (!metaResponse.ok) {
            continue;
          }

          const data = (await metaResponse.json()) as {
            id?: string;
            user_id?: string;
            username?: string;
            account_type?: string;
          };

          instagram = {
            connected: true,
            username: typeof data.username === "string" ? data.username : null,
            accountType: typeof data.account_type === "string" ? data.account_type : null,
          };
          res.locals.metaLatencyMs = latencyMs;

          logger.info("Instagram connection check succeeded", {
            source: check.source,
            accountIdConfigured: Boolean(instagramBusinessId),
          });
          break;
        } catch (error) {
          logger.warn("Instagram connection check attempt failed", {
            source: check.source,
            error: error instanceof Error ? error.message : "unknown_error",
          });
        }
      }
    }

    let lastEventAt: number | null = null;
    try {
      const logs = await readAllLogs(500);
      for (const log of logs) {
        if (!lastEventAt || log.timestamp > lastEventAt) {
          lastEventAt = log.timestamp;
        }
      }
    } catch (error) {
      logger.warn("Failed to derive webhook activity", { error });
    }

    const webhookUrl = `${req.protocol}://${req.get("host") ?? ""}/webhooks/instagram`;
    const recentEvent = !!lastEventAt && Date.now() - lastEventAt <= 24 * 60 * 60 * 1000;
    const apiOk = isFirebase && (metaConfigured ? instagram.connected : false);

    res.status(200).json({
      firebaseConfigured: isFirebase,
      metaConfigured,
      dryRun,
      webhookConfigured,
      serviceStatus: apiOk ? "operational" : isFirebase ? "degraded" : "degraded",
      instagram,
      webhook: {
        configured: webhookConfigured,
        lastEventAt,
        recentEvent,
        url: webhookUrl,
      },
      api: {
        ok: apiOk,
        latencyMs: typeof res.locals.metaLatencyMs === "number" ? res.locals.metaLatencyMs : Date.now() - startedAt,
        lastCheckedAt: Date.now(),
      },
    });
  } catch (e) {
    logger.error("Failed to load settings", { error: e });
    res.status(500).json({ error: "failed_to_load_settings" });
  }
});

app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const message = error instanceof Error ? error.message : "request_failed";
  if (message === "cors_origin_not_allowed") {
    res.status(403).json({ error: "cors_origin_not_allowed" });
    return;
  }

  errorMonitor.captureException(error, {
    requestId: req.requestId,
    operation: `${req.method} ${req.path}`,
  });
  res.status(500).json({
    error: "internal_server_error",
    requestId: req.requestId,
  });
});

process.on("uncaughtException", (error) => {
  errorMonitor.captureException(error, { operation: "uncaught_exception" });
});

process.on("unhandledRejection", (reason) => {
  errorMonitor.captureException(reason, { operation: "unhandled_rejection" });
});

const port = env.port;
app.listen(port, () => {
  logger.info("HireDaily backend started", { port });
});
