// Phase 5 Checkpoint 1 — Cooldown & duplicate-event protection.
//
// Prevents a rule from firing repeatedly for the same user/post within the
// rule's cooldown window, and prevents the same comment id from being
// processed twice (e.g. Meta webhook redeliveries).
//
// This module is intentionally in-memory (no Firebase writes) so it is
// framework-free and trivially unit-testable with a fake clock. It exposes a
// single class instance; the server uses one shared instance process-wide.

import type { RuleEngineRule, RuleEvaluationContext } from "../types/rule-engine.js";

/** Internal record kept per dedupe key. */
interface CooldownEntry {
  /** Unix ms of the last trigger that was allowed through. */
  lastTriggerAt: number;
}

/**
 * Builds the stable dedupe key for duplicate/cooldown tracking.
 *
 * Key = `userId|ruleId|mediaId`. This scopes cooldown per (user, rule, post)
 * so different posts or different users don't block each other. When the
 * userId is missing we fall back to the commentId (so a redelivered comment
 * still can't double-fire), and if both are missing we return null (nothing
 * to dedupe against).
 */
export function buildDedupeKey(
  context: RuleEvaluationContext,
  ruleId: string,
): string | null {
  if (context.userId) return `${context.userId}|${ruleId}|${context.mediaId ?? ""}`;
  if (context.commentId) return `comment|${context.commentId}`;
  return null;
}

export class CooldownService {
  private entries = new Map<string, CooldownEntry>();

  /** For tests / diagnostics — returns the number of tracked keys. */
  get size(): number {
    return this.entries.size;
  }

  /** Clears all tracked state (used by tests). */
  reset(): void {
    this.entries.clear();
  }

  /**
   * Record that a rule fired for the given context at `now`.
   */
  record(context: RuleEvaluationContext, rule: RuleEngineRule, now: number): void {
    const key = buildDedupeKey(context, rule.id);
    if (!key) return;
    this.entries.set(key, { lastTriggerAt: now });
  }

  /**
   * Decide whether a (matched) rule should actually fire for this context.
   *
   * Returns { allowed, duplicate, cooldownApplied }:
   *  - duplicate: true when this exact comment id was already processed
   *    (regardless of cooldown) — a redelivery.
   *  - cooldownApplied: true when the same dedupe key fired recently and is
   *    still within the rule's cooldown window.
   *  - allowed: true only when NOT a duplicate AND NOT within cooldown.
   */
  shouldFire(
    context: RuleEvaluationContext,
    rule: RuleEngineRule,
    now: number,
  ): { allowed: boolean; duplicate: boolean; cooldownApplied: boolean } {
    // Duplicate comment id (same exact comment redelivered).
    if (context.commentId && this.isDuplicateComment(context.commentId)) {
      return { allowed: false, duplicate: true, cooldownApplied: false };
    }

    const key = buildDedupeKey(context, rule.id);
    if (!key) {
      return { allowed: true, duplicate: false, cooldownApplied: false };
    }

    const entry = this.entries.get(key);
    if (!entry) {
      return { allowed: true, duplicate: false, cooldownApplied: false };
    }

    const elapsed = now - entry.lastTriggerAt;
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (elapsed < cooldownMs) {
      return { allowed: false, duplicate: false, cooldownApplied: true };
    }
    return { allowed: true, duplicate: false, cooldownApplied: false };
  }

  /** Track which comment ids have already been processed (across rules). */
  private seenComments = new Set<string>();

  private isDuplicateComment(commentId: string): boolean {
    if (this.seenComments.has(commentId)) return true;
    this.seenComments.add(commentId);
    return false;
  }
}

/** Shared singleton used by the server (and importable in tests). */
export const cooldownService = new CooldownService();
