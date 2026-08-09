import "dotenv/config";

import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";

import { parseWebhookEvents } from "./utils/webhook-parser.js";
import {
  writeAutomationLog,
  isFirebaseAdminConfigured,
  readActiveRules,
  writeRuleMatchLog,
} from "./services/firebase-admin.service.js";
import { evaluateComment } from "./services/rule-engine.service.js";
import { cooldownService } from "./services/cooldown.service.js";
import { resolvePostJob } from "./services/post-mapping.service.js";
import { processCommentReplyProduction, processDirectMessageProduction } from "./services/instagram.service.js";
import { writeCommentReplyLog, writeDmLog } from "./services/firebase-admin.service.js";
import {
  makeFirebaseUserStore,
  makeFirebaseAnalyticsStore,
  applyTracking,
  incrementDailyAnalytics,
  dateKey,
  checkFollowCapability,
  type UserStore,
  type AnalyticsStore,
} from "./services/user-analytics.service.js";
import type { RuleEvaluationContext } from "./types/rule-engine.js";
import { logger } from "./utils/logger.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Meta can retry aggressively on 5xx/timeouts; keep a sane per-IP cap so a
// runaway webhook can't hammer Firebase Admin. 300 req / 15 min is generous
// for the Phase 4 ingest volume.
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/webhook", webhookLimiter);

/** GET /health — cheap liveness/connectivity probe. */
app.get("/health", (_req, res) => {
  // firebaseAdmin reports Firebase Admin *initialization* success: true only
  // when the Admin SDK was configured with valid env credentials. No Admin
  // credentials are ever exposed here or to the frontend.
  const firebaseAdmin = isFirebaseAdminConfigured();
  res.status(200).json({
    status: "ok",
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
  if (mode === "subscribe" && token && token === expectedToken) {
    logger.info("Webhook verified");
    res.status(200).send(challenge);
    return;
  }
  logger.warn("Webhook verification failed", { mode, token });
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
  eventId: string;
}): Promise<void> {
  try {
    const now = Date.now();
    const activeRules = await readActiveRules(now);
    if (activeRules.length === 0) return;

    const context = toRuleContext(event);
    const result = evaluateComment(activeRules, context, now);

    // Phase 5 Checkpoint 5 — dry-run flag + follow-verification capability.
    const dryRun = process.env.META_DRY_RUN === "true";
    const follow = checkFollowCapability();

    if (result.matched && result.rule) {
      const decision = cooldownService.shouldFire(context, result.rule, now);
      result.cooldownApplied = decision.cooldownApplied;
      result.duplicate = decision.duplicate;
      if (decision.allowed) {
        cooldownService.record(context, result.rule, now);
      }

      // Phase 5 Checkpoint 2 — resolve the Instagram post to the Hire Daily
      // job. Only runs for a matched rule with a mediaId. It reads the
      // mapping + job (READ-ONLY) and builds the public job URL.
      if (event.mediaId) {
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
            let commentStatus: "pending" | "success" | "failed" = "pending";
            let dmStatus: "pending" | "success" | "failed" | "skipped" = "pending";
            try {
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

            // Phase 5 Checkpoint 4 — send a private DM with the exact mapped
            // job URL. The DM is a separate, independently-tracked operation
            // from the public comment reply. The recipient is the actual
            // commenter userId (never mediaId/commentId/jobId). Best-effort:
            // a failure here must NOT break the Phase 4 webhook 200 or the
            // comment reply result. dmStatus (pending/success/failed) is
            // persisted alongside commentStatus.
            try {
              const dmData = await processDirectMessageProduction({
                recipientId: event.userId,
                userId: event.userId,
                username: event.username,
                mediaId: event.mediaId,
                commentId: event.commentId,
                rule: result.rule,
                matchedKeyword: result.matchedKeyword,
                resolution,
                commentStatus,
              });
              dmStatus = dmData.dmStatus;
              await writeDmLog(dmData);
            } catch (dmError) {
              dmStatus = "failed";
              logger.error("DM flow failed", {
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
                error: "dm_flow_failed",
                dryRun,
                timestamp: Date.now(),
              }).catch((e) => logger.error("Failed to write DM log", e));
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
                followStatus: follow.status,
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
  const events = parseWebhookEvents(req.body);
  for (const event of events) {
    try {
      await writeAutomationLog(event, "received");
    } catch (error) {
      logger.error("Failed to write automation log", { eventId: event.eventId, error });
      await writeAutomationLog(event, "error").catch((e) => logger.error("Failed to write error log", e));
    }

    // Phase 5 Checkpoint 1 — Rule Engine (best-effort, non-blocking).
    await runRuleEngine(event);
  }
  // Always 200 so Meta doesn't retry/resend events that we already parsed.
  res.status(200).json({ received: events.length });
}

/** POST /webhook — Meta event ingestion (original Phase 4 route, kept for backward compatibility). */
app.post("/webhook", ingestWebhook);

/** POST /webhooks/instagram — Meta event ingestion alias used by the Phase 4 test runner. */
app.post("/webhooks/instagram", ingestWebhook);

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  logger.info(`HireDaily backend listening on http://localhost:${port}`);
});
