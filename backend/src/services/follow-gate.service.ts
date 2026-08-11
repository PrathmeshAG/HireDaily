import { env } from "../config/env.js";
import {
  claimInstagramActionOnce,
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
      const dmUsername = resolveJobDmUsername(check.username, user.username, input.username);
      const dm = await processExistingJobDm(input, dmUsername);
      await writeDmLog(dm);
      if (dm.dmStatus === "success") {
        await updateInstagramUserFollowState(input.userId, {
          pendingFollowGate: null,
          username: check.username ?? user.username ?? input.username ?? null,
        });
      } else {
        logger.error("Verified returning user could not receive existing Job DM", {
          userId: input.userId,
          error: dm.error,
        });
      }
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

async function processExistingJobDm(
  input: FollowGateCommentInput,
  usernameOverride?: string | null,
): Promise<DmLogData> {
  const resolution = await resolvePostJob(input.mediaId);
  const recipientId = input.userId;
  return processDirectMessageProduction({
    recipientId,
    userId: input.userId,
    username: usernameOverride ?? input.username,
    mediaId: input.mediaId,
    commentId: input.commentId,
    rule: input.rule,
    matchedKeyword: input.matchedKeyword,
    resolution,
    commentStatus: input.commentStatus,
  });
}

/**
 * Resolve the username for the existing Job DM without changing the shared
 * DM implementation. Messaging webhooks provide an IGSID but do not
 * reliably include username; the follow verification profile call now
 * returns username from the same Meta request.
 */
function resolveJobDmUsername(
  metaUsername: string | null,
  storedUsername: string | null,
  interactionUsername: string | null,
): string {
  return (
    metaUsername?.trim() ||
    storedUsername?.trim() ||
    interactionUsername?.trim() ||
    "there"
  );
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

  const resolvedUsername = resolveJobDmUsername(
    check.username,
    user?.username ?? null,
    input.username,
  );

  await updateInstagramUserFollowState(input.userId, {
    username: check.username ?? user?.username ?? input.username ?? null,
    lastInteractionAt: now,
    followCheckRequested: true,
    followConfirmed: check.status === "verified",
    lastFollowCheckAt: now,
    followStatus: check.status,
  });

  const pending = user?.pendingFollowGate ?? null;

  if (!pending) {
    // Safe response for a stale/manual interaction with no pending job.
    await sendFollowGateMessage(input.userId, env.meta.accessToken, {
      dryRun: env.meta.dryRun,
      instagramBusinessId: env.meta.instagramBusinessId,
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
    // Another delivery is already processing this job DM. Do not clear the
    // pending gate here; the winning delivery owns the final state transition.
    return true;
  }

  const dm = await processDirectMessageProduction({
    recipientId: input.userId,
    userId: input.userId,
    // Existing production DM templates may contain {{username}}. Resolve it
    // before calling the existing DM implementation; never pass null when a
    // username token is required. The fallback is deliberately generic and
    // does not claim a username that Meta did not provide.
    username: resolvedUsername,
    mediaId: pending.mediaId,
    // Important: the user has now responded, so use the normal messaging
    // window and the existing View Job & Apply button implementation.
    commentId: null,
    rule,
    matchedKeyword: pending.matchedKeyword,
    resolution,
    commentStatus: pending.commentStatus,
  });

  await writeDmLog(dm);

  // Only consume the pending job after the EXISTING Job DM actually succeeds.
  // If Meta rejects the DM (for example because of a template/window issue),
  // keep the pending job so a later genuine interaction can retry instead of
  // leaving the user in a silent/dead state.
  if (dm.dmStatus === "success") {
    await updateInstagramUserFollowState(input.userId, {
      pendingFollowGate: null,
      username: check.username ?? user?.username ?? input.username ?? null,
      followConfirmed: true,
      followStatus: "verified",
      lastFollowCheckAt: now,
    });
  } else {
    await updateInstagramUserFollowState(input.userId, {
      username: check.username ?? user?.username ?? input.username ?? null,
      followConfirmed: true,
      followStatus: "verified",
      lastFollowCheckAt: now,
    });
    logger.error("Verified Follow Gate user could not receive existing Job DM; pending job preserved", {
      userId: input.userId,
      jobId: pending.jobId,
      error: dm.error,
    });
  }

  return true;
}
