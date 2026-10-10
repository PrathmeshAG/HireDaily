// Retry for comments whose public reply and/or DM failed (for example during
// an expired-token outage).
//
// selectRetryable() is pure: it reads the log entries and decides which
// comments still need a retry. A part (comment reply / DM) is retryable when
// its most recent failure is newer than its most recent success.

import type { RawLog } from "./firebase-admin.service.js";
import {
  claimInstagramActionOnce,
  readAllRules,
  releaseInstagramActionClaim,
  rememberBotComment,
  writeCommentReplyLog,
} from "./firebase-admin.service.js";
import { resolvePostJob } from "./post-mapping.service.js";
import { processCommentReplyProduction, resolveCommenterId } from "./instagram.service.js";
import { processCommentWithFollowGate } from "./follow-gate.service.js";
import { makeFirebaseAnalyticsStore, makeFirebaseUserStore, applyTracking } from "./user-analytics.service.js";
import { reserveSend } from "./rate-guard.service.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export type RetryPart = "comment" | "dm";

export interface RetryItem {
  commentId: string;
  userId: string | null;
  username: string | null;
  mediaId: string;
  ruleId: string;
  keyword: string | null;
  parts: RetryPart[];
  lastError: string | null;
  lastFailedAt: number;
}

interface PartState {
  failedAt: number;
  successAt: number;
  error: string | null;
}

/** Meta only allows a private reply for about 7 days after the comment. */
export const MAX_RETRY_HOURS = 168;
export const DEFAULT_RETRY_HOURS = 72;

export function selectRetryable(logs: RawLog[], since: number): RetryItem[] {
  const byComment = new Map<
    string,
    {
      base: Omit<RetryItem, "parts" | "lastError" | "lastFailedAt">;
      comment: PartState;
      dm: PartState;
    }
  >();

  const blank = (): PartState => ({ failedAt: 0, successAt: 0, error: null });

  for (const log of logs) {
    if (log.dryRun || log.timestamp < since) continue;
    if (!log.commentId || !log.mediaId || !log.ruleId) continue;
    if (log.type !== "comment_sent" && log.type !== "dm_sent") continue;

    let entry = byComment.get(log.commentId);
    if (!entry) {
      entry = {
        base: {
          commentId: log.commentId,
          userId: log.userId,
          username: log.username,
          mediaId: log.mediaId,
          ruleId: log.ruleId,
          keyword: log.ruleKeyword,
        },
        comment: blank(),
        dm: blank(),
      };
      byComment.set(log.commentId, entry);
    }
    if (log.userId && !entry.base.userId) entry.base.userId = log.userId;

    const part = log.type === "comment_sent" ? entry.comment : entry.dm;
    const status = log.type === "comment_sent" ? log.commentStatus : log.dmStatus;
    if (status === "failed" && log.timestamp >= part.failedAt) {
      part.failedAt = log.timestamp;
      part.error = log.error;
    } else if (status === "success" && log.timestamp >= part.successAt) {
      part.successAt = log.timestamp;
    }
  }

  const items: RetryItem[] = [];
  for (const { base, comment, dm } of byComment.values()) {
    const parts: RetryPart[] = [];
    if (comment.failedAt > 0 && comment.failedAt > comment.successAt) parts.push("comment");
    if (dm.failedAt > 0 && dm.failedAt > dm.successAt) parts.push("dm");
    if (parts.length === 0) continue;
    const last = Math.max(parts.includes("comment") ? comment.failedAt : 0, parts.includes("dm") ? dm.failedAt : 0);
    const lastError = last === dm.failedAt ? dm.error : comment.error;
    items.push({ ...base, parts, lastError, lastFailedAt: last });
  }
  return items.sort((a, b) => b.lastFailedAt - a.lastFailedAt);
}

export interface RetryOutcome {
  commentId: string;
  comment: "success" | "failed" | "skipped" | null;
  dm: "success" | "failed" | "skipped" | null;
  error: string | null;
}

/**
 * Re-runs the failed parts of one comment using the exact same production
 * functions as the webhook, so templates, links, follow gate and logging are
 * identical. Claims are released only for the parts being retried.
 */
export async function retryItem(item: RetryItem): Promise<RetryOutcome> {
  const outcome: RetryOutcome = { commentId: item.commentId, comment: null, dm: null, error: null };
  const dryRun = env.meta.dryRun;

  try {
    const rules = await readAllRules();
    const rule = rules.find((r) => r.id === item.ruleId);
    if (!rule) return { ...outcome, error: "rule_deleted" };

    const resolution = await resolvePostJob(item.mediaId);
    if (!resolution.mapped) return { ...outcome, error: `mapping_${resolution.reason}` };

    let commentStatus: "success" | "failed" | "skipped" = "success";

    if (item.parts.includes("comment")) {
      const slot = await reserveSend("comment", dryRun);
      if (!slot.allowed) {
        outcome.comment = "failed";
        outcome.error = "hourly_cap_reached";
        return outcome;
      }
      await releaseInstagramActionClaim(item.commentId, "comment_reply");
      const claimed = await claimInstagramActionOnce(item.commentId, "comment_reply");
      if (!claimed) {
        outcome.comment = "skipped";
        commentStatus = "skipped";
      } else {
        const replyData = await processCommentReplyProduction({
          commentId: item.commentId,
          mediaId: item.mediaId,
          userId: item.userId,
          username: item.username,
          rule,
          matchedKeyword: item.keyword,
          resolution,
        });
        await writeCommentReplyLog(replyData);
        if (replyData.externalId && !replyData.dryRun) await rememberBotComment(replyData.externalId);
        commentStatus = replyData.commentStatus === "pending" ? "failed" : replyData.commentStatus;
        outcome.comment = commentStatus;
        if (replyData.commentStatus === "failed") outcome.error = replyData.error;
        await track({ commentReplyStatus: replyData.commentStatus, dmStatus: null, item, dryRun });
      }
    }

    if (item.parts.includes("dm")) {
      const slot = await reserveSend("dm", dryRun);
      if (!slot.allowed) {
        outcome.dm = "failed";
        outcome.error = outcome.error ?? "hourly_cap_reached";
        return outcome;
      }
      const userId =
        item.userId ?? (await resolveCommenterId(item.commentId, env.meta.accessToken));
      await releaseInstagramActionClaim(item.commentId, "dm");
      await releaseInstagramActionClaim(item.commentId, "follow_gate");
      const dmResult = await processCommentWithFollowGate({
        userId,
        username: item.username,
        mediaId: item.mediaId,
        commentId: item.commentId,
        rule,
        matchedKeyword: item.keyword,
        commentStatus,
        dryRun,
      });
      outcome.dm = dmResult.dm.dmStatus === "pending" ? "failed" : dmResult.dm.dmStatus;
      if (dmResult.dm.dmStatus === "failed") outcome.error = outcome.error ?? dmResult.dm.error;
      await track({ commentReplyStatus: null, dmStatus: dmResult.dm.dmStatus, item, dryRun });
    }
  } catch (error) {
    logger.error("Retry failed", { commentId: item.commentId, error });
    outcome.error = outcome.error ?? "retry_exception";
  }
  return outcome;
}

async function track(input: {
  commentReplyStatus: "pending" | "success" | "failed" | "skipped" | null;
  dmStatus: "pending" | "success" | "failed" | "skipped" | null;
  item: RetryItem;
  dryRun: boolean;
}): Promise<void> {
  try {
    await applyTracking(await makeFirebaseUserStore(), await makeFirebaseAnalyticsStore(), {
      userId: input.item.userId,
      username: input.item.username,
      now: Date.now(),
      commentReceived: false,
      matched: false,
      commentReplyStatus: input.commentReplyStatus ?? "skipped",
      dmStatus: input.dmStatus ?? "skipped",
      followStatus: null,
      automationError: false,
      dryRun: input.dryRun,
    });
  } catch (error) {
    logger.error("Retry analytics tracking failed", { error });
  }
}
