// Operator alerts built on notifier + token health: reactive (auth failure
// seen while replying) and scheduled (health check, daily summary).

import {
  claimAlertSlot,
  countUnmatchedComments,
  readAllPostMappings,
  readJob,
  readLogsSince,
  readRecentAnalytics,
  pruneUnmatchedComments,
  readClicksForDates,
} from "./firebase-admin.service.js";
import { sendAlert, type AlertResult } from "./notifier.service.js";
import { checkMetaToken, daysUntil, isMetaAuthError, type TokenState } from "./token-health.service.js";
import { findMissingJobMappings, type MissingJobMapping } from "./health-report.service.js";
import { buildDailySummary, EMPTY_DAY, type DayCounters } from "./summary.service.js";
import { selectRetryable, DEFAULT_RETRY_HOURS } from "./retry.service.js";
import { lastDates, summarizeClicks, trackingBaseUrl } from "./click-tracking.service.js";
import { dateKey } from "./user-analytics.service.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const HOUR = 60 * 60 * 1000;

export async function notifyIfAuthFailure(errorText: string | null | undefined): Promise<boolean> {
  if (!isMetaAuthError(errorText)) return false;
  try {
    // At most one "token is failing" alert every 6 hours.
    if (!(await claimAlertSlot("token_auth_failure", 6 * HOUR))) return false;
    await sendAlert({
      title: "🚨 Instagram access token problem",
      body:
        "Meta rejected the access token while replying to a comment. Replies and DMs are failing until it is replaced.\n\n" +
        "Fix: generate a new token, update META_ACCESS_TOKEN on the backend and redeploy. Then open Logs and use Retry failed.",
    });
    return true;
  } catch (error) {
    logger.error("Auth failure alert failed", { error });
    return false;
  }
}

export async function findMissingJobs(): Promise<MissingJobMapping[]> {
  const mappings = await readAllPostMappings();
  return findMissingJobMappings(
    mappings.map((m) => ({
      mediaId: m.mediaId,
      jobId: m.jobId,
      jobTitleCache: m.jobTitleCache,
      status: m.status,
      extraLinks: m.extraLinks,
    })),
    async (id) => (await readJob(id)) !== null,
  );
}

export async function countRetryable(hours = DEFAULT_RETRY_HOURS): Promise<number> {
  const logs = await readLogsSince(Date.now() - hours * HOUR);
  return selectRetryable(logs, Date.now() - hours * HOUR).length;
}

function toDay(d: Awaited<ReturnType<typeof readRecentAnalytics>>[number] | undefined): DayCounters {
  if (!d) return { ...EMPTY_DAY };
  return {
    commentsReceived: d.commentsReceived,
    triggers: d.commentsMatched,
    repliesSent: d.commentsSent,
    dmsSent: d.dmsSent,
    commentsFailed: d.commentsFailed,
    dmsFailed: d.dmsFailed,
    automationErrors: d.automationErrors,
    followVerified: d.followVerified,
    followNotVerified: d.followNotVerified,
  };
}

export interface HealthCheckResult {
  token: TokenState;
  missingJobs: number;
  alertsSent: string[];
}

/** Token + deleted-job check. Alerts are throttled so a scheduler can call this often. */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const alertsSent: string[] = [];
  const token = await checkMetaToken();

  if (token.valid === false) {
    if (await claimAlertSlot("token_invalid", 6 * HOUR)) {
      await sendAlert({
        title: "🚨 Meta access token is invalid",
        body: "The health check found that Meta rejects the access token. Replies and DMs are failing. Generate a new token, update META_ACCESS_TOKEN and redeploy.",
      });
      alertsSent.push("token_invalid");
    }
  } else {
    const days = daysUntil(token.expiresAt);
    if (days !== null && days <= 7 && (await claimAlertSlot(`token_expiring_${Math.max(0, days)}d`, 20 * HOUR))) {
      await sendAlert({
        title: "⚠️ Meta access token expires soon",
        body: `The access token expires in ${Math.max(0, days)} day${days === 1 ? "" : "s"}. Replace it before then so automation does not stop.`,
      });
      alertsSent.push("token_expiring");
    }
  }

  let missing: MissingJobMapping[] = [];
  try {
    missing = await findMissingJobs();
    if (missing.length > 0 && (await claimAlertSlot("missing_jobs", 24 * HOUR))) {
      await sendAlert({
        title: "⚠️ Post mappings point to missing jobs",
        body: `${missing.length} post mapping${missing.length === 1 ? "" : "s"} link to a job that no longer exists:\n- ${missing.slice(0, 8).map((m) => m.label).join("\n- ")}\n\nFix them in Post Mapping, otherwise those posts cannot send links.`,
      });
      alertsSent.push("missing_jobs");
    }
  } catch (error) {
    logger.error("Missing-job check failed", { error });
  }

  return { token, missingJobs: missing.length, alertsSent };
}

export async function buildSummaryNow(): Promise<{ title: string; body: string }> {
  const analytics = await readRecentAnalytics(2);
  const today = toDay(analytics[analytics.length - 1]);
  const yesterday = analytics.length > 1 ? toDay(analytics[analytics.length - 2]) : null;

  const [token, missing, retryable, unmatched] = await Promise.all([
    checkMetaToken().catch(() => null),
    findMissingJobs().catch(() => []),
    countRetryable().catch(() => 0),
    countUnmatchedComments().catch(() => 0),
  ]);

  let clicks: number | null = null;
  if (trackingBaseUrl()) {
    try {
      const todayKey = dateKey(Date.now());
      const summary = summarizeClicks(await readClicksForDates(lastDates(1)), new Map());
      clicks = summary.daily.find((d) => d.date === todayKey)?.clicks ?? summary.total;
    } catch {
      clicks = null;
    }
  }

  return buildDailySummary({
    date: dateKey(Date.now()),
    today,
    yesterday,
    token,
    missingJobMappings: missing.length,
    retryableFailures: retryable,
    unmatchedComments: unmatched,
    clicks,
    dryRun: env.meta.dryRun,
  });
}

export async function sendDailySummaryNow(): Promise<AlertResult & { title: string; body: string }> {
  const summary = await buildSummaryNow();
  const result = await sendAlert(summary);
  return { ...result, ...summary };
}

/** Housekeeping for the scheduled run: drop old unmatched comments. */
export async function dailyHousekeeping(): Promise<{ prunedUnmatched: number }> {
  const prunedUnmatched = await pruneUnmatchedComments(Date.now() - 30 * 24 * HOUR).catch(() => 0);
  return { prunedUnmatched };
}
