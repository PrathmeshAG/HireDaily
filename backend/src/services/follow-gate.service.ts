import { env } from "../config/env.js";
import {
  claimInstagramActionOnce,
  releaseInstagramActionClaim,
  readAllRules,
  readUserRecord,
  updateInstagramUserFollowState,
  writeDmLog,
} from "./firebase-admin.service.js";
import { resolvePostJob } from "./post-mapping.service.js";
import {
  checkInstagramUserFollow,
  FOLLOW_GATE_PAYLOAD,
  processDirectMessageProduction,
  sendFollowGateMessage,
  type DmLogData,
} from "./instagram.service.js";
import type { RuleEngineRule } from "../types/rule-engine.js";
import { logger } from "../utils/logger.js";

export { FOLLOW_GATE_PAYLOAD };

export interface FollowGateCommentInput {
  userId: string | null;
  username: string | null;
  mediaId: string;
  commentId: string;
  rule: RuleEngineRule;
  matchedKeyword: string | null;
  commentStatus: "pending" | "success" | "failed" | "skipped";
  dryRun: boolean;
}

export interface FollowGateDecision {
  dm: DmLogData;
  followStatus: "verified" | "not_verified" | "unsupported" | "unknown" | null;
}

function baseDm(input: FollowGateCommentInput, status: DmLogData["dmStatus"], error: string | null): DmLogData {
  return {
    userId: input.userId,
    username: input.username,
    mediaId: input.mediaId,
    commentId: input.commentId,
    jobId: null,
    ruleId: input.rule.id,
    keyword: input.matchedKeyword,
    commentStatus: input.commentStatus,
    dmStatus: status,
    error,
    dryRun: input.dryRun,
    timestamp: Date.now(),
  };
}

/**
 * Decides whether a matched comment gets the existing job DM or the new
 * Follow Gate. New users always receive the gate first. Returning users are
 * freshly checked with Meta; cached followConfirmed is never trusted.
 */
export async function processCommentWithFollowGate(
  input: FollowGateCommentInput,
): Promise<FollowGateDecision> {
  if (!input.userId) {
    return { dm: baseDm(input, "failed", "recipient_id_missing"), followStatus: "unknown" };
  }

  const user = await readUserRecord(input.userId);
  let followStatus: FollowGateDecision["followStatus"] = null;

  if (user) {
    const check = await checkInstagramUserFollow(input.userId);
    followStatus = check.status;
    await updateInstagramUserFollowState(input.userId, {
      username: input.username,
      lastInteractionAt: Date.now(),
      followCheckRequested: true,
      followConfirmed: check.status === "verified",
      lastFollowCheckAt: Date.now(),
      followStatus: check.status,
    });

    if (check.status === "verified") {
      const claimed = await claimInstagramActionOnce(input.commentId, "dm");
      if (!claimed) {
        return { dm: baseDm(input, "skipped", "duplicate_suppressed"), followStatus };
      }
      const dm = await processExistingJobDm(input);
      await writeDmLog(dm);
      await updateInstagramUserFollowState(input.userId, { pendingFollowGate: null });
      return { dm, followStatus };
    }
  } else {
    await updateInstagramUserFollowState(input.userId, {
      firstInteractionAt: Date.now(),
      username: input.username,
      lastInteractionAt: Date.now(),
      followCheckRequested: true,
      followConfirmed: false,
      lastFollowCheckAt: null,
      followStatus: "unknown",
    });
  }

  const pending = {
    mediaId: input.mediaId,
    commentId: input.commentId,
    jobId: null,
    ruleId: input.rule.id,
    matchedKeyword: input.matchedKeyword,
    commentStatus: input.commentStatus,
    createdAt: Date.now(),
  };

  await updateInstagramUserFollowState(input.userId, {
    username: input.username,
    lastInteractionAt: Date.now(),
    followCheckRequested: true,
    followConfirmed: false,
    pendingFollowGate: pending,
  });

  const claimed = await claimInstagramActionOnce(input.commentId, "follow_gate");
  if (!claimed) {
    return { dm: baseDm(input, "skipped", "duplicate_suppressed"), followStatus };
  }

  const gate = await sendFollowGateMessage(input.userId, env.meta.accessToken, {
    commentId: input.commentId,
    dryRun: input.dryRun,
    instagramBusinessId: env.meta.instagramBusinessId,
  });

  const dm = baseDm(
    input,
    gate.success ? "success" : "failed",
    gate.success ? null : gate.error,
  );

  if (!gate.success) {
    logger.error("Follow Gate DM failed", {
      userId: input.userId,
      commentId: input.commentId,
      error: gate.error,
    });
  }

  await writeDmLog(dm);
  return { dm, followStatus };
}

async function processExistingJobDm(input: FollowGateCommentInput): Promise<DmLogData> {
  const resolution = await resolvePostJob(input.mediaId);
  const recipientId = input.userId;
  return processDirectMessageProduction({
    recipientId,
    userId: input.userId,
    username: input.username,
    mediaId: input.mediaId,
    commentId: input.commentId,
    rule: input.rule,
    matchedKeyword: input.matchedKeyword,
    resolution,
    commentStatus: input.commentStatus,
  });
}

/**
 * Handles the user's "I've Followed" postback. A click is only a request to
 * verify; followConfirmed is set true only when Meta returns true.
 */
export async function handleFollowGateInteraction(input: {
  eventId: string;
  userId: string | null;
  username: string | null;
  payload: string | null;
}): Promise<boolean> {
  if (input.payload !== FOLLOW_GATE_PAYLOAD || !input.userId) return false;

  const claimed = await claimInstagramActionOnce(input.eventId, "follow_check");
  if (!claimed) {
    logger.info("Ignoring duplicate Follow Gate interaction", { eventId: input.eventId, userId: input.userId });
    return true;
  }

  const user = await readUserRecord(input.userId);
  const check = await checkInstagramUserFollow(input.userId);
  const now = Date.now();

  await updateInstagramUserFollowState(input.userId, {
    username: input.username,
    lastInteractionAt: now,
    followCheckRequested: true,
    followConfirmed: check.status === "verified",
    lastFollowCheckAt: now,
    followStatus: check.status,
  });

  const pending = user?.pendingFollowGate ?? null;

  if (!pending) {
    // There is no job context left to unlock. In particular, do not resend
    // the Follow Gate for stale/repeated clicks after a successful unlock.
    logger.info("Ignoring Follow Gate interaction with no pending job", {
      userId: input.userId,
      followStatus: check.status,
    });
    return true;
  }

  if (check.status !== "verified") {
    const reminder = await sendFollowGateMessage(input.userId, env.meta.accessToken, {
      dryRun: env.meta.dryRun,
      instagramBusinessId: env.meta.instagramBusinessId,
    });
    if (!reminder.success) {
      logger.error("Follow Gate reminder failed", { userId: input.userId, error: reminder.error });
    }
    return true;
  }

  const rules = await readAllRules();
  const rule = rules.find((candidate) => candidate.id === pending.ruleId);
  if (!rule) {
    logger.error("Pending Follow Gate rule no longer exists", { userId: input.userId, ruleId: pending.ruleId });
    return true;
  }

  const resolution = await resolvePostJob(pending.mediaId);
  const jobClaimed = await claimInstagramActionOnce(pending.commentId, "job_dm");
  if (!jobClaimed) {
    logger.info("Ignoring duplicate/pending Job DM interaction", {
      userId: input.userId,
      commentId: pending.commentId,
    });
    return true;
  }

  let dm: DmLogData;
  try {
    dm = await processDirectMessageProduction({
      recipientId: input.userId,
      userId: input.userId,
      username: input.username ?? user?.username ?? null,
      mediaId: pending.mediaId,
      // Important: the user has now responded, so use the normal messaging
      // window and the existing View Job & Apply button implementation.
      commentId: null,
      rule,
      matchedKeyword: pending.matchedKeyword,
      resolution,
      commentStatus: pending.commentStatus,
    });
  } catch (error) {
    await releaseInstagramActionClaim(pending.commentId, "job_dm").catch((releaseError) =>
      logger.error("Failed to release Job DM claim after exception", {
        userId: input.userId,
        commentId: pending.commentId,
        error: releaseError,
      }),
    );
    logger.error("Verified Follow Gate Job DM threw an error", {
      userId: input.userId,
      commentId: pending.commentId,
      error,
    });
    return true;
  }

  await writeDmLog(dm);

  if (dm.dmStatus === "success") {
    // Only clear the pending job after the EXISTING Job DM + CTA was actually
    // accepted by Meta. A failed send must remain retryable.
    await updateInstagramUserFollowState(input.userId, {
      pendingFollowGate: null,
      followConfirmed: true,
      followStatus: "verified",
      lastFollowCheckAt: now,
    });
    return true;
  }

  // The user is verified, but the existing Job DM did not send. Keep the
  // pending job and release the claim so a later interaction can retry it.
  await releaseInstagramActionClaim(pending.commentId, "job_dm").catch((releaseError) =>
    logger.error("Failed to release Job DM claim after failed send", {
      userId: input.userId,
      commentId: pending.commentId,
      error: releaseError,
    }),
  );
  await updateInstagramUserFollowState(input.userId, {
    pendingFollowGate: pending,
    followConfirmed: true,
    followStatus: "verified",
    lastFollowCheckAt: now,
  });
  logger.error("Verified user Job DM failed; pending job preserved for retry", {
    userId: input.userId,
    commentId: pending.commentId,
    error: dm.error,
  });

  return true;
}
