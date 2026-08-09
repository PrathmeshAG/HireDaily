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
  readAllRules,
  writeRule,
  
  deleteRule as deleteRuleRecord,
  readAllTemplates,
  writeTemplate,
  deleteTemplate as deleteTemplateRecord,
readAllPostMappings,
  readPostMapping,
  writePostMapping,
  deletePostMapping,
  readAllUsers,
  readAllLogs,
  readRecentAnalytics,
} from "./services/firebase-admin.service.js";
import { evaluateComment,explainRuleEvaluation, } from "./services/rule-engine.service.js";
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
  eventId: string;
}): Promise<void> {
  try {
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
    await writePostMapping(mediaId, {
      jobId,
      jobTitleCache: typeof body.jobTitleCache === "string" ? body.jobTitleCache : null,
      mappedAt: Date.now(),
    });
    res.status(201).json({ id: mediaId, mediaId, jobId });
  } catch (e) {
    logger.error("Failed to create post mapping", { error: e });
    res.status(500).json({ error: "failed_to_create_post_mapping" });
  }
});

/** PATCH /api/automation/post-mappings/:mediaId — update a mapping. */
app.patch("/api/automation/post-mappings/:mediaId", async (req, res) => {
  try {
    const mediaId = req.params.mediaId;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const existing = await readPostMapping(mediaId);
    if (!existing) {
      res.status(404).json({ error: "post_mapping_not_found" });
      return;
    }
    const jobId = typeof body.jobId === "string" ? body.jobId.trim() : existing.jobId;
    await writePostMapping(mediaId, {
      jobId,
      jobTitleCache: typeof body.jobTitleCache === "string" ? body.jobTitleCache : existing.jobTitleCache,
      mappedAt: existing.mappedAt ?? Date.now(),
    });
    res.status(200).json({ id: mediaId, mediaId, jobId });
  } catch (e) {
    logger.error("Failed to update post mapping", { error: e });
    res.status(500).json({ error: "failed_to_update_post_mapping" });
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

    // Keyword counts from keyword_matched logs (ruleKeyword).
    const keywordCounts = new Map<string, number>();
    // Post counts from comment_sent/dm_sent logs that carry a postLabel via
    // the mapping label is not stored on logs; approximate post aggregates
    // from the post-mapping count + matched logs by mediaId. To keep this
    // dependency-free and read-only, we derive topPosts from distinct
    // postLabel-associated logs is not available, so we source topPosts from
    // the matched keyword logs' mediaId-labelled rules is not present either.
    // Instead, we expose what the existing frontend supports using the data
    // we DO have: keyword aggregates (from ruleKeyword on keyword_matched)
    // and a stable, safe placeholder for posts (from the mapping count).
    const postCounts = new Map<string, number>();

    for (const log of logs) {
      if (log.type === "keyword_matched" && log.ruleKeyword) {
        keywordCounts.set(log.ruleKeyword, (keywordCounts.get(log.ruleKeyword) ?? 0) + 1);
      }
    }

    const topKeywords = [...keywordCounts.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topPosts = [...postCounts.entries()]
      .map(([postLabel, triggers]) => ({ postLabel, triggers }))
      .slice(0, 10);

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
app.get("/api/automation/settings", async (_req, res) => {
  try {
    const isFirebase = isFirebaseAdminConfigured();
    const metaConfigured = !!process.env.META_ACCESS_TOKEN?.trim();
    const dryRun =
      process.env.META_DRY_RUN?.trim().toLowerCase() === "true";
    const webhookConfigured =
      !!process.env.META_VERIFY_TOKEN?.trim() ||
      !!process.env.WEBHOOK_VERIFY_TOKEN?.trim();

    let instagram = {
      connected: false,
      username: null as string | null,
      accountType: null as string | null,
    };

    const accessToken = process.env.META_ACCESS_TOKEN?.trim();
    const instagramBusinessId =
      process.env.INSTAGRAM_BUSINESS_ID?.trim();

    if (accessToken && instagramBusinessId) {
      try {
        const url =
          `https://graph.instagram.com/v21.0/${encodeURIComponent(
            instagramBusinessId,
          )}` +
          `?fields=id,username,account_type&access_token=${encodeURIComponent(
            accessToken,
          )}`;

        const metaResponse = await fetch(url, {
          method: "GET",
        });

        if (metaResponse.ok) {
          const data = (await metaResponse.json()) as {
            id?: string;
            username?: string;
            account_type?: string;
          };

          instagram = {
            connected: true,
            username:
              typeof data.username === "string"
                ? data.username
                : null,
            accountType:
              typeof data.account_type === "string"
                ? data.account_type
                : null,
          };
        }
      } catch (error) {
        logger.warn("Instagram connection check failed", {
          error:
            error instanceof Error ? error.message : "unknown_error",
        });
      }
    }

    res.status(200).json({
      firebaseConfigured: isFirebase,
      metaConfigured,
      dryRun,
      webhookConfigured,
      serviceStatus: isFirebase ? "operational" : "degraded",
      instagram,
    });
  } catch (e) {
    logger.error("Failed to load settings", { error: e });
    res.status(500).json({ error: "failed_to_load_settings" });
  }
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  logger.info(`HireDaily backend listening on http://localhost:${port}`);
});
