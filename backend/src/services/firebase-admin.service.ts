// firebase-admin v12 ESM: `initializeApp`, `getApp`, `getApps` and `cert`
// are named exports of `firebase-admin/app`. Importing the root namespace
// (`import * as admin from "firebase-admin"`) under NodeNext/tsx only exposes
// `default` and leaves `admin.credential` undefined — which produced the
// cryptic "Cannot read properties of undefined (reading 'length')" failure.
// Using the documented subpath imports fixes that and is the v12-recommended
// pattern.
import { initializeApp, getApp as getAdminApp, getApps, cert } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getDatabase as getRTDB } from "firebase-admin/database";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { NormalizedWebhookEvent } from "../types/instagram.js";
import type { RuleEngineRule, RuleMatchResult } from "../types/rule-engine.js";
import { loadActiveRules } from "./rule-engine.service.js";

// Same Firebase project the frontend already uses (see src/lib/firebase.ts
// in the main app) — this service only ever touches `automation/*`, never
// `jobs/*`. Initialized lazily and exactly once: the module-level `app`
// variable is the singleton guard, so no request path re-initializes it.

let app: App | null = null;

/**
 * Validates the loaded Firebase env config and returns a clear, non-secret
 * error listing exactly which required variable(s) are missing or malformed.
 * This replaces the cryptic SDK errors (e.g. "reading 'length' of undefined")
 * that firebase-admin throws when handed an incomplete/empty credential.
 */
function validateFirebaseEnv(): void {
  const missing: string[] = [];
  if (!env.firebase.databaseURL) missing.push("FIREBASE_DATABASE_URL");
  if (!env.firebase.projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!env.firebase.clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!env.firebase.privateKey) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin is not configured — missing required env var(s): ${missing.join(", ")}`,
    );
  }

  // Cheap structural check on the PEM so a malformed/truncated key yields a
  // clear error instead of the SDK's internal ".length" crash. Never prints
  // the key itself.
  const key = env.firebase.privateKey;
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is malformed — expected a PEM block with BEGIN/END markers",
    );
  }
}

function getApp(): App {
  if (app) return app;

  validateFirebaseEnv();

  const { databaseURL, projectId, clientEmail, privateKey } = env.firebase;

  app = getApps().length
    ? getAdminApp()
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        databaseURL,
      });

  logger.info("Firebase Admin initialized", { projectId, databaseURL });
  return app;
}

function db() {
  return getRTDB(getApp());
}

/**
 * Reports whether Firebase Admin initialized successfully. This is the
 * signal the /health endpoint uses for `firebaseAdmin`. Unlike
 * `isFirebaseAdminReachable()` (an active DB connectivity probe), this is
 * purely an initialization-success check: it returns `true` as soon as the
 * singleton `app` is available (or can be created from the env config), and
 * `false` without throwing when admin is not configured. Because init is
 * idempotent (the module-level `app` guard + `admin.apps.length` check),
 * calling this repeatedly will never double-initialize.
 */
export function isFirebaseAdminConfigured(): boolean {
  try {
    getApp();
    return true;
  } catch (error) {
    logger.warn("Firebase Admin is not configured", error instanceof Error ? { message: error.message } : { error });
    return false;
  }
}

// The existing (unmodified) frontend Logs page reads a curated shape —
// `type | username | detail | ruleKeyword | timestamp | channel` — that was
// designed before raw webhook ingestion existed. Rather than touch the
// frontend, every log entry stores BOTH shapes: the exact Phase 4 fields
// (source of truth, useful for debugging/future phases) and a
// frontend-compatible projection of the same data. Mirrored here (not
// imported from the frontend) to keep this backend independently deployable.
type FrontendLogType = "comment_received" | "keyword_matched" | "comment_sent" | "dm_sent" | "error" | "retry";

/**
 * The existing frontend LogType enum was designed for a curated event set
 * (comment_received / keyword_matched / comment_sent / dm_sent / error /
 * retry) — it has no slot for raw inbound messaging events yet, since no
 * rule engine or auto-reply exists before Phase 5. Mapping choices:
 *  - a write-time `status: "error"` always maps to "error" (accurate, and
 *    correctly feeds the Dashboard's Failed Automations count)
 *  - "comment"/"mention" map to "comment_received" (closest real match)
 *  - "message"/"message_delivery"/"message_read"/"unknown" also map to
 *    "comment_received" rather than "comment_sent"/"dm_sent" — those would
 *    incorrectly imply this backend already sent something, which would
 *    corrupt the Dashboard's Today's Comments/DMs stats before Phase 5 auto
 *    replies exist. The precise `eventType` is always preserved alongside,
 *    and `detail` (below) keeps the real, type-specific description.
 */
function toFrontendLogType(
  _eventType: NormalizedWebhookEvent["eventType"],
  status: "received" | "error",
): FrontendLogType {
  if (status === "error") return "error";
  // comment/mention/message/message_delivery/message_read/unknown all map
  // here today — see the reasoning above the function. `_eventType` is kept
  // in the signature (unused for now) so Phase 5 can extend this mapping
  // without changing every call site.
  return "comment_received";
}

function deriveUsername(event: NormalizedWebhookEvent): string {
  if (event.username) return event.username;
  if (event.userId) return `id:${event.userId}`;
  return "unknown";
}

export interface AutomationLogRecord {
  // ---- Phase 4 fields (source of truth) ----
  eventType: NormalizedWebhookEvent["eventType"];
  eventId: string;
  receivedAt: number;
  mediaId: string | null;
  userId: string | null;
  status: "received" | "error";
  payloadSummary: string;
  // ---- Frontend LogEntry-compatible projection (Logs page reads these) ----
  channel: "instagram";
  type: FrontendLogType;
  username: string;
  detail: string;
  ruleKeyword: null; // no keyword matching exists before Phase 5 — always safely null
  timestamp: number;
}

/**
 * Writes one webhook event log entry under automation/logs/{logId}. Stores
 * the exact Phase 4 field names required (eventType, eventId, receivedAt,
 * mediaId, userId, status, payloadSummary) AND a frontend-compatible
 * projection (type, username, detail, ruleKeyword, timestamp, channel) in
 * the same record, so the existing Logs page renders real events without
 * any frontend change. Intentionally does NOT store full comment/message
 * text — payloadSummary/detail is a short, non-sensitive description only
 * (see utils/webhook-parser.ts).
 */
export async function writeAutomationLog(
  event: NormalizedWebhookEvent,
  status: "received" | "error",
): Promise<string> {
  const receivedAt = Date.now();
  const record: AutomationLogRecord = {
    eventType: event.eventType,
    eventId: event.eventId,
    receivedAt,
    mediaId: event.mediaId,
    userId: event.userId,
    status,
    payloadSummary: event.payloadSummary,

    channel: "instagram",
    type: toFrontendLogType(event.eventType, status),
    username: deriveUsername(event),
    detail: event.payloadSummary,
    ruleKeyword: null,
    timestamp: receivedAt,
  };
  const ref = db().ref("automation/logs").push();
  await ref.set(record);
  return ref.key!;
}

export async function readAutomationSettings(): Promise<Record<string, unknown> | null> {
  const snap = await db().ref("automation/settings").get();
  return snap.exists() ? (snap.val() as Record<string, unknown>) : null;
}

/** Shallow-merges at the top level of automation/settings — same semantics as the client SDK's `update()`. */
export async function writeAutomationSettings(partial: Record<string, unknown>): Promise<void> {
  await db().ref("automation/settings").update(partial);
}

/**
 * Reads all rules under `automation/rules` and returns the currently active
 * instagram subset (as RuleEngineRule). Backward-compatible: existing rules
 * that predate the `mode` field are treated as "keyword" mode.
 *
 * Never touches `jobs/*` — only `automation/rules`.
 */
export async function readActiveRules(now: number = Date.now()): Promise<RuleEngineRule[]> {
  const snap = await db().ref("automation/rules").get();
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;
  const rules: RuleEngineRule[] = [];

  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const r = value as Record<string, unknown>;
    const keywords = Array.isArray(r.keywords)
      ? r.keywords.filter((k): k is string => typeof k === "string")
      : [];

    const rule: RuleEngineRule = {
      id: typeof r.id === "string" ? r.id : id,
      channel: "instagram",
      // Backward compatibility: absence of `mode` => keyword mode.
      mode: r.mode === "any_comment" ? "any_comment" : "keyword",
      keywords,
      matchType: r.matchType === "exact" ? "exact" : "contains",
      scope: r.scope === "specific_post" ? "specific_post" : "all_posts",
      postId: typeof r.postId === "string" ? r.postId : null,
      postLabel: typeof r.postLabel === "string" ? r.postLabel : null,
      commentTemplateId: typeof r.commentTemplateId === "string" ? r.commentTemplateId : null,
      dmTemplateId: typeof r.dmTemplateId === "string" ? r.dmTemplateId : null,
      replyMode: r.replyMode === "comment_only" || r.replyMode === "dm_only" || r.replyMode === "comment_and_dm"
        ? r.replyMode
        : "comment_and_dm",
      cooldownMinutes: typeof r.cooldownMinutes === "number" ? r.cooldownMinutes : 0,
      activeFrom: typeof r.activeFrom === "number" ? r.activeFrom : null,
      activeUntil: typeof r.activeUntil === "number" ? r.activeUntil : null,
      active: r.active !== false,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
    };

    rules.push(rule);
  }

  return loadActiveRules(rules, now);
}

/**
 * Writes a structured rule-match/cooldown log entry under
 * `automation/logs` so the existing Logs page and the structured result are
 * persisted. Mirrors the frontend LogEntry shape (channel, type, username,
 * detail, ruleKeyword, timestamp) for the keyword_matched/error types.
 */
export async function writeRuleMatchLog(
  result: RuleMatchResult,
  context: {
    username: string | null;
    mediaId: string | null;
    eventId: string | null;
  },
): Promise<void> {
  const timestamp = Date.now();
  const ref = db().ref("automation/logs").push();

  const record = {
    channel: "instagram",
    type: result.matched ? "keyword_matched" : "error",
    username: context.username ?? "unknown",
    detail: result.reason,
    ruleKeyword: result.matchedKeyword,
    timestamp,
    eventId: context.eventId,
    mediaId: context.mediaId,
    ruleId: result.ruleId,
    matched: result.matched,
    cooldownApplied: result.cooldownApplied,
    duplicate: result.duplicate,
  };

await ref.set(record);
}

/**
 * Reads the post mapping for an Instagram media id from
 * `automation/postMappings/{mediaId}`. Returns null when no mapping exists.
 * Only reads `automation/postMappings` — never writes it.
 */
export async function readPostMapping(mediaId: string): Promise<{
  jobId: string;
  jobTitleCache: string | null;
  instagramPostUrl: string | null;
  mappedAt: number | null;
  updatedAt: number | null;
  status: "active" | "archived";
} | null> {
  if (!mediaId) return null;

  const snap = await db()
    .ref(`automation/postMappings/${mediaId}`)
    .get();

  if (!snap.exists()) return null;

  const val = snap.val() as Record<string, unknown>;

  return {
    jobId:
      typeof val.jobId === "string"
        ? val.jobId
        : "",

    jobTitleCache:
      typeof val.jobTitleCache === "string"
        ? val.jobTitleCache
        : null,

    instagramPostUrl:
      typeof val.instagramPostUrl === "string"
        ? val.instagramPostUrl
        : typeof val.postUrl === "string"
          ? val.postUrl
          : null,

    mappedAt:
      typeof val.mappedAt === "number"
        ? val.mappedAt
        : null,

    updatedAt:
      typeof val.updatedAt === "number"
        ? val.updatedAt
        : null,
    status: val.status === "archived" ? "archived" : "active",
  };
}
/**
 * Reads a job record from `jobs/{jobId}`. READ-ONLY — this checkpoint never
 * creates, updates, or deletes job records. Returns null when the job does
 * not exist. The job record is the source of truth for jobTitle.
 */
export async function readJob(jobId: string): Promise<{
  jobTitle: string | null;
  company: string | null;
  location: string | null;
} | null> {
  if (!jobId) return null;
  const snap = await db().ref(`jobs/${jobId}`).get();
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, unknown>;
  return {
    jobTitle: typeof val.role === "string" ? val.role : typeof val.position === "string" ? val.position : null,
    company: typeof val.companyName === "string" ? val.companyName : null,
    location: typeof val.location === "string" ? val.location : null,
  };
}

/** Cheap connectivity check for the health endpoint — does not throw. */
export async function isFirebaseAdminReachable(): Promise<boolean> {
  try {
    await db().ref(".info/connected").get();
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomically claims one side-effect for an Instagram comment.
 *
 * Firebase RTDB transactions make this safe across concurrent Vercel/serverless
 * instances, unlike the in-memory cooldown service. A claim is permanent so a
 * webhook redelivery can never produce a second external message.
 */
export async function claimInstagramActionOnce(
  commentId: string,
  action: "comment_reply" | "dm",
): Promise<boolean> {
  const normalized = String(commentId ?? "").trim();
  if (!normalized) return false;

  const ref = db().ref(`automation/instagramClaims/${normalized}/${action}`);
  const result = await ref.transaction((current) => {
    if (current !== null && current !== undefined) return undefined;
    return { claimedAt: Date.now() };
  });

  return result.committed;
}

/**
 * Reads the comment reply template text for a rule from
 * `automation/templates/{commentTemplateId}`. Returns null when the rule has
 * no comment template or the template does not exist / has no text. Only
 * reads `automation/templates` — never writes it.
 */
export async function readCommentTemplateText(rule: RuleEngineRule): Promise<string | null> {
  if (!rule.commentTemplateId) return null;
  const snap = await db().ref(`automation/templates/${rule.commentTemplateId}`).get();
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, unknown>;
  if (typeof val.text === "string" && val.text.trim().length > 0) return val.text;
  return null;
}

/**
 * Records a comment-reply attempt under `automation/logs` including the
 * commentStatus (pending/success/failed). NEVER stores secrets: no access
 * token, app secret, Firebase private key, or authorization headers. The
 * `error` field is a short, safe message only.
 */
export async function writeCommentReplyLog(
  data: {
    userId: string | null;
    username: string | null;
    mediaId: string | null;
    commentId: string | null;
    jobId: string | null;
    ruleId: string | null;
    keyword: string | null;
    commentStatus: "pending" | "success" | "failed" | "skipped";
    error: string | null;
    dryRun: boolean;
    timestamp: number;
  },
): Promise<void> {
  const ref = db().ref("automation/logs").push();
  await ref.set({
    channel: "instagram",
    type: "comment_sent",
    username: data.username ?? "unknown",
    detail:
      data.commentStatus === "success"
        ? `Comment reply ${data.dryRun ? "(dry-run) " : ""}sent`
        : data.commentStatus === "skipped"
          ? `Comment reply skipped: ${data.error ?? "duplicate_suppressed"}`
          : `Comment reply failed: ${data.error ?? "unknown"}`,
    ruleKeyword: data.keyword,
    timestamp: data.timestamp,
    userId: data.userId,
    mediaId: data.mediaId,
    commentId: data.commentId,
    jobId: data.jobId,
    ruleId: data.ruleId,
    commentStatus: data.commentStatus,
    error: data.error,
    dryRun: data.dryRun,
  });
}

/**
 * Reads the DM template text for a rule from
 * `automation/templates/{dmTemplateId}`. Returns null when the rule has no DM
 * template or the template does not exist / has no text. Only reads
 * `automation/templates` — never writes it.
 */
export async function readDmTemplateText(rule: RuleEngineRule): Promise<string | null> {
  if (!rule.dmTemplateId) return null;
  const snap = await db().ref(`automation/templates/${rule.dmTemplateId}`).get();
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, unknown>;
  if (typeof val.text === "string" && val.text.trim().length > 0) return val.text;
  return null;
}

/**
 * Records a DM attempt under `automation/logs` including BOTH the commentStatus
 * and the dmStatus (pending/success/failed) so comment reply and DM are tracked
 * independently. NEVER stores secrets: no access token, app secret, Firebase
 * private key, or authorization headers. The `error` field is a short, safe
 * message only.
 */
export async function writeDmLog(
  data: {
    userId: string | null;
    username: string | null;
    mediaId: string | null;
    commentId: string | null;
    jobId: string | null;
    ruleId: string | null;
    keyword: string | null;
    commentStatus: "pending" | "success" | "failed" | "skipped";
    dmStatus: "pending" | "success" | "failed" | "skipped";
    error: string | null;
    dryRun: boolean;
    timestamp: number;
  },
): Promise<void> {
  const ref = db().ref("automation/logs").push();
  await ref.set({
    channel: "instagram",
    type: "dm_sent",
    username: data.username ?? "unknown",
    detail:
      data.dmStatus === "success"
        ? `DM ${data.dryRun ? "(dry-run) " : ""}sent`
        : data.dmStatus === "skipped"
          ? `DM skipped: ${data.error ?? "duplicate_suppressed"}`
          : `DM failed: ${data.error ?? "unknown"}`,
    ruleKeyword: data.keyword,
    timestamp: data.timestamp,
    userId: data.userId,
    mediaId: data.mediaId,
    commentId: data.commentId,
    jobId: data.jobId,
    ruleId: data.ruleId,
    commentStatus: data.commentStatus,
    dmStatus: data.dmStatus,
    error: data.error,
    dryRun: data.dryRun,
  });
}

// ===========================================================================
// Checkpoint 5 — User tracking + daily analytics (Firebase bindings)
// ===========================================================================

/**
 * Reads a user record from `automation/users/{userId}`. Returns null when the
 * user does not exist. Never reads `jobs/*`.
 */
export async function readUserRecord(userId: string): Promise<{
  userId: string;
  username: string | null;
  firstSeenAt: number;
  lastActivityAt: number;
  commentCount: number;
  dmCount: number;
  active: boolean;
} | null> {
  if (!userId) return null;
  const snap = await db().ref(`automation/users/${userId}`).get();
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, unknown>;
  return {
    userId: typeof val.userId === "string" ? val.userId : userId,
    username: typeof val.username === "string" ? val.username : null,
    firstSeenAt: typeof val.firstSeenAt === "number" ? val.firstSeenAt : 0,
    lastActivityAt: typeof val.lastActivityAt === "number" ? val.lastActivityAt : 0,
    commentCount: typeof val.commentCount === "number" ? val.commentCount : 0,
    dmCount: typeof val.dmCount === "number" ? val.dmCount : 0,
    active: val.active !== false,
  };
}

/**
 * Writes (creates or replaces) a user record under `automation/users/{userId}`.
 * Only used for full-record writes (first creation). Counter-only updates use
 * `incrementUserField` which does NOT overwrite the whole object.
 */
export async function writeUserRecord(record: {
  userId: string;
  username: string | null;
  firstSeenAt: number;
  lastActivityAt: number;
  commentCount: number;
  dmCount: number;
  active: boolean;
}): Promise<void> {
  await db().ref(`automation/users/${record.userId}`).set(record);
}

/**
 * Atomic partial update of a user record: bumps lastActivityAt and increments
 * commentCount/dmCount by the given amounts WITHOUT rewriting the whole user
 * object (preserving firstSeenAt and any other fields). No-op when the user
 * does not exist. Never touches jobs/*.
 */
export async function touchUserRecord(
  userId: string,
  now: number,
  counters: { commentIncrement: number; dmIncrement: number },
): Promise<void> {
  if (!userId) return;
  const ref = db().ref(`automation/users/${userId}`);
  // Single atomic transaction: bump lastActivityAt + active, and increment the
  // counters, WITHOUT rewriting the whole object (preserves firstSeenAt and
  // any other fields). No-op when the user does not exist.
  await ref.transaction((current: Record<string, unknown> | null) => {
    if (!current) return undefined; // user missing -> no-op
    const base = current as { commentCount?: number; dmCount?: number };
    const result: Record<string, unknown> = {
      ...base,
      lastActivityAt: now,
      active: true,
      commentCount: (typeof base.commentCount === "number" ? base.commentCount : 0) + counters.commentIncrement,
      dmCount: (typeof base.dmCount === "number" ? base.dmCount : 0) + counters.dmIncrement,
    };
    return result;
  });
}

/**
 * Reads a daily analytics record from `automation/analytics/daily/{date}`.
 * Returns null when the date node does not exist.
 */
export async function readDailyAnalytics(date: string): Promise<
  | {
      date: string;
      commentsReceived: number;
      commentsMatched: number;
      commentsSent: number;
      commentsFailed: number;
      dmsSent: number;
      dmsFailed: number;
      followVerified: number;
      followNotVerified: number;
      followUnsupported: number;
      automationErrors: number;
    }
  | null
> {
  const snap = await db().ref(`automation/analytics/daily/${date}`).get();
  if (!snap.exists()) return null;
  const val = snap.val() as Record<string, unknown>;
  return {
    date,
    commentsReceived: typeof val.commentsReceived === "number" ? val.commentsReceived : 0,
    commentsMatched: typeof val.commentsMatched === "number" ? val.commentsMatched : 0,
    commentsSent: typeof val.commentsSent === "number" ? val.commentsSent : 0,
    commentsFailed: typeof val.commentsFailed === "number" ? val.commentsFailed : 0,
    dmsSent: typeof val.dmsSent === "number" ? val.dmsSent : 0,
    dmsFailed: typeof val.dmsFailed === "number" ? val.dmsFailed : 0,
    followVerified: typeof val.followVerified === "number" ? val.followVerified : 0,
    followNotVerified: typeof val.followNotVerified === "number" ? val.followNotVerified : 0,
    followUnsupported: typeof val.followUnsupported === "number" ? val.followUnsupported : 0,
    automationErrors: typeof val.automationErrors === "number" ? val.automationErrors : 0,
  };
}

/**
 * Atomically increments a daily analytics counter under
 * `automation/analytics/daily/{date}/{field}`. Never modifies historical dates
 * (only the provided date node's field is touched).
 */
export async function incrementDailyAnalyticsField(
  date: string,
  field:
    | "commentsReceived"
    | "commentsMatched"
    | "commentsSent"
    | "commentsFailed"
    | "dmsSent"
    | "dmsFailed"
    | "followVerified"
    | "followNotVerified"
    | "followUnsupported"
    | "automationErrors",
): Promise<void> {
const ref = db().ref(`automation/analytics/daily/${date}/${field}`);
  await ref.transaction((current: number | null) => (typeof current === "number" ? current + 1 : 1));
}

// ===========================================================================
// Phase 6 Checkpoint 2 — Automation management API (rules / templates / post
// mappings). These read/write the SAME Firebase nodes the existing engine
// consumes, so the frontend can manage automation data through the backend
// API without ever touching Firebase Admin or Meta directly. Jobs stay
// READ-ONLY here — nothing below ever writes to `jobs/*`.
// ===========================================================================

/**
 * Reads ALL automation rules (not just the active subset) for the management
 * UI. Unlike `readActiveRules`, this returns every stored rule regardless of
 * `active`/window, so the Rules page can list + edit + toggle everything.
 * Returns them as an array with the same backward-compatible normalization
 * used by the engine (absence of `mode` => "keyword").
 */
export async function readAllRules(): Promise<RuleEngineRule[]> {
  const snap = await db().ref("automation/rules").get();
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;
  const rules: RuleEngineRule[] = [];

  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const r = value as Record<string, unknown>;
    const keywords = Array.isArray(r.keywords)
      ? r.keywords.filter((k): k is string => typeof k === "string")
      : [];
    rules.push({
      id: typeof r.id === "string" ? r.id : id,
      channel: "instagram",
      mode: r.mode === "any_comment" ? "any_comment" : "keyword",
      keywords,
      matchType: r.matchType === "exact" ? "exact" : "contains",
      scope: r.scope === "specific_post" ? "specific_post" : "all_posts",
      postId: typeof r.postId === "string" ? r.postId : null,
      postLabel: typeof r.postLabel === "string" ? r.postLabel : null,
      commentTemplateId: typeof r.commentTemplateId === "string" ? r.commentTemplateId : null,
      dmTemplateId: typeof r.dmTemplateId === "string" ? r.dmTemplateId : null,
      replyMode:
        r.replyMode === "comment_only" || r.replyMode === "dm_only" || r.replyMode === "comment_and_dm"
          ? r.replyMode
          : "comment_and_dm",
      cooldownMinutes: typeof r.cooldownMinutes === "number" ? r.cooldownMinutes : 0,
      activeFrom: typeof r.activeFrom === "number" ? r.activeFrom : null,
      activeUntil: typeof r.activeUntil === "number" ? r.activeUntil : null,
      active: r.active !== false,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
    });
  }

  return rules;
}

/** Writes (creates or replaces) a rule under automation/rules/{id}. */
export async function writeRule(
  id: string,
  rule: Record<string, unknown>,
): Promise<void> {
  await db().ref(`automation/rules/${id}`).set(rule);
}

/** Deletes a rule under automation/rules/{id}. */
export async function deleteRule(id: string): Promise<void> {
  await db().ref(`automation/rules/${id}`).remove();
}

/** Reads all comment/DM templates under automation/templates. */
export async function readAllTemplates(): Promise<
  { id: string; kind: string; channel: string; name: string; text: string; updatedAt: number }[]
> {
  const snap = await db().ref("automation/templates").get();
  if (!snap.exists()) return [];
  const raw = snap.val() as Record<string, unknown>;
  const out: { id: string; kind: string; channel: string; name: string; text: string; updatedAt: number }[] = [];
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const t = value as Record<string, unknown>;
    out.push({
      id: typeof t.id === "string" ? t.id : id,
      kind: typeof t.kind === "string" ? t.kind : "comment",
      channel: typeof t.channel === "string" ? t.channel : "instagram",
      name: typeof t.name === "string" ? t.name : "",
      text: typeof t.text === "string" ? t.text : "",
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
    });
  }
  return out;
}

/** Writes (creates or replaces) a template under automation/templates/{id}. */
export async function writeTemplate(
  id: string,
  template: Record<string, unknown>,
): Promise<void> {
  await db().ref(`automation/templates/${id}`).set(template);
}

/** Deletes a template under automation/templates/{id}. */
export async function deleteTemplate(id: string): Promise<void> {
  await db().ref(`automation/templates/${id}`).remove();
}

/**
 * Reads all post mappings from `automation/postMappings`. Each mapping is
 * keyed by its Instagram mediaId. Returns safe, non-secret records (id =
 * mediaId, jobId, jobTitleCache, mappedAt).
 */
export async function readAllPostMappings(): Promise<
  {
    id: string;
    mediaId: string;
    jobId: string;
    jobTitleCache: string | null;
    instagramPostUrl: string | null;
    mappedAt: number | null;
    updatedAt: number | null;
    status: "active" | "archived";
  }[]
> {
  const snap = await db()
    .ref("automation/postMappings")
    .get();

  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;

  const out: {
    id: string;
    mediaId: string;
    jobId: string;
    jobTitleCache: string | null;
    instagramPostUrl: string | null;
    mappedAt: number | null;
    updatedAt: number | null;
    status: "active" | "archived";
  }[] = [];

  for (const [mediaId, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;

    const m = value as Record<string, unknown>;

    out.push({
      id: mediaId,
      mediaId,

      jobId:
        typeof m.jobId === "string"
          ? m.jobId
          : "",

      jobTitleCache:
        typeof m.jobTitleCache === "string"
          ? m.jobTitleCache
          : null,

      instagramPostUrl:
        typeof m.instagramPostUrl === "string"
          ? m.instagramPostUrl
          : typeof m.postUrl === "string"
            ? m.postUrl
            : null,

      mappedAt:
        typeof m.mappedAt === "number"
          ? m.mappedAt
          : null,

      updatedAt:
        typeof m.updatedAt === "number"
          ? m.updatedAt
          : null,
      status: m.status === "archived" ? "archived" : "active",
    });
  }

  return out;
}

/**
 * Writes (creates or replaces) a post mapping under automation/postMappings/{mediaId}.
 * The mapping node shape is preserved for the engine: { jobId, jobTitleCache, mappedAt }.
 */
export async function writePostMapping(
  mediaId: string,
  mapping: {
    jobId: string;
    jobTitleCache: string | null;
    instagramPostUrl?: string | null;
    mappedAt: number;
    updatedAt?: number;
    status?: "active" | "archived";
  },
): Promise<void> {
  await db()
    .ref(`automation/postMappings/${mediaId}`)
    .set(mapping);
}

/** Deletes a post mapping under automation/postMappings/{mediaId}. */
export async function deletePostMapping(mediaId: string): Promise<void> {
  await db().ref(`automation/postMappings/${mediaId}`).remove();
}

export interface InstagramMediaCacheRecord {
  id: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  timestamp: string | null;
  syncedAt: number;
}

/** Reads cached Instagram media without exposing any Meta credentials. */
export async function readAllInstagramMedia(): Promise<InstagramMediaCacheRecord[]> {
  const snap = await db().ref("automation/instagramMedia").get();
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;
  const out: InstagramMediaCacheRecord[] = [];

  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const item = value as Record<string, unknown>;

    out.push({
      id: typeof item.id === "string" ? item.id : id,
      permalink: typeof item.permalink === "string" ? item.permalink : null,
      caption: typeof item.caption === "string" ? item.caption : null,
      mediaType: typeof item.mediaType === "string" ? item.mediaType : null,
      mediaUrl: typeof item.mediaUrl === "string" ? item.mediaUrl : null,
      thumbnailUrl:
        typeof item.thumbnailUrl === "string" ? item.thumbnailUrl : null,
      timestamp: typeof item.timestamp === "string" ? item.timestamp : null,
      syncedAt: typeof item.syncedAt === "number" ? item.syncedAt : 0,
    });
  }

  return out.sort((a, b) => b.syncedAt - a.syncedAt);
}

/** Upserts synchronized Instagram media keyed by the real Meta media ID. */
export async function writeInstagramMediaCache(
  media: InstagramMediaCacheRecord[],
): Promise<void> {
  if (media.length === 0) return;

  const updates: Record<string, InstagramMediaCacheRecord> = {};
  for (const item of media) {
    updates[item.id] = item;
  }

  await db().ref("automation/instagramMedia").update(updates);
}


// ===========================================================================
// Phase 6 Checkpoint 3 — Read-only automation API data-access helpers
// (users / logs / analytics). These are READ-ONLY bindings for the frontend:
// they return safe, non-secret data and never write to `jobs/*` or expose any
// Firebase admin credentials / Meta tokens.
// ===========================================================================

/**
 * Reads ALL automation users as an array of safe records (most recent
 * activity first). Only reads `automation/users` — never writes it. Returns
 * no secrets — just the canonical user fields the Users page renders.
 */
export async function readAllUsers(): Promise<
  {
    userId: string;
    username: string | null;
    firstSeenAt: number;
    lastActivityAt: number;
    commentCount: number;
    dmCount: number;
    active: boolean;
  }[]
> {
  const snap = await db().ref("automation/users").get();
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;
  const out: {
    userId: string;
    username: string | null;
    firstSeenAt: number;
    lastActivityAt: number;
    commentCount: number;
    dmCount: number;
    active: boolean;
  }[] = [];

  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const u = value as Record<string, unknown>;
    out.push({
      userId: typeof u.userId === "string" ? u.userId : id,
      username: typeof u.username === "string" ? u.username : null,
      firstSeenAt: typeof u.firstSeenAt === "number" ? u.firstSeenAt : 0,
      lastActivityAt: typeof u.lastActivityAt === "number" ? u.lastActivityAt : 0,
      commentCount: typeof u.commentCount === "number" ? u.commentCount : 0,
      dmCount: typeof u.dmCount === "number" ? u.dmCount : 0,
      active: u.active !== false,
    });
  }

  // Most recent activity first.
  return out.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

/**
 * Reads the most recent automation log entries from `automation/logs`,
 * newest first, up to `limit` records (default 200). Returns a safe,
 * frontend-compatible projection (id, channel, type, username, detail,
 * ruleKeyword, timestamp) plus preserved debug fields (eventId, mediaId,
 * commentId, jobId, ruleId, commentStatus, dmStatus, dryRun). NEVER stores
 * or returns secrets — only `automation/logs` is read, never `jobs/*`.
 */
export async function readAllLogs(limit = 200): Promise<
  {
    id: string;
    channel: string;
    type: string;
    username: string;
    detail: string;
    ruleKeyword: string | null;
    timestamp: number;
    eventId: string | null;
    mediaId: string | null;
    commentId: string | null;
    jobId: string | null;
    ruleId: string | null;
    commentStatus: string | null;
    dmStatus: string | null;
    dryRun: boolean | null;
  }[]
> {
  const snap = await db().ref("automation/logs").get();
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, unknown>;
  const out: {
    id: string;
    channel: string;
    type: string;
    username: string;
    detail: string;
    ruleKeyword: string | null;
    timestamp: number;
    eventId: string | null;
    mediaId: string | null;
    commentId: string | null;
    jobId: string | null;
    ruleId: string | null;
    commentStatus: string | null;
    dmStatus: string | null;
    dryRun: boolean | null;
  }[] = [];

  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") continue;
    const l = value as Record<string, unknown>;
    out.push({
      id: typeof l.id === "string" ? l.id : id,
      channel: typeof l.channel === "string" ? l.channel : "instagram",
      type: typeof l.type === "string" ? l.type : "error",
      username: typeof l.username === "string" ? l.username : "unknown",
      detail: typeof l.detail === "string" ? l.detail : "",
      ruleKeyword: typeof l.ruleKeyword === "string" ? l.ruleKeyword : null,
      timestamp: typeof l.timestamp === "number" ? l.timestamp : 0,
      eventId: typeof l.eventId === "string" ? l.eventId : null,
      mediaId: typeof l.mediaId === "string" ? l.mediaId : null,
      commentId: typeof l.commentId === "string" ? l.commentId : null,
      jobId: typeof l.jobId === "string" ? l.jobId : null,
      ruleId: typeof l.ruleId === "string" ? l.ruleId : null,
      commentStatus: typeof l.commentStatus === "string" ? l.commentStatus : null,
      dmStatus: typeof l.dmStatus === "string" ? l.dmStatus : null,
      dryRun: typeof l.dryRun === "boolean" ? l.dryRun : null,
    });
  }

  // Newest first, then trim to the requested limit.
  return out.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/**
 * Reads the last `days` daily analytics records from
 * `automation/analytics/daily/{YYYY-MM-DD}`, oldest first, as safe counters.
 * Missing days are normalized to an all-zero record so the frontend chart is
 * continuous. Only reads `automation/analytics` — never writes it.
 */
export async function readRecentAnalytics(days = 14): Promise<
  {
    date: string;
    commentsReceived: number;
    commentsMatched: number;
    commentsSent: number;
    commentsFailed: number;
    dmsSent: number;
    dmsFailed: number;
    followVerified: number;
    followNotVerified: number;
    followUnsupported: number;
    automationErrors: number;
  }[]
> {
  const out: {
    date: string;
    commentsReceived: number;
    commentsMatched: number;
    commentsSent: number;
    commentsFailed: number;
    dmsSent: number;
    dmsFailed: number;
    followVerified: number;
    followNotVerified: number;
    followUnsupported: number;
    automationErrors: number;
  }[] = [];

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const date = `${y}-${m}-${day}`;
    const record = await readDailyAnalytics(date);
    out.push(
      record ?? {
        date,
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
      },
    );
  }

  return out;
}
