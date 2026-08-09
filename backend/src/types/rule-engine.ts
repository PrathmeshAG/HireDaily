// Phase 5 Checkpoint 1 — Rule Engine types.
//
// These mirror the frontend AutomationRule shape (see
// hiremind-ai-portal-main/src/admin/automation/types.ts) so the backend can
// read the same `automation/rules` Firebase node, but add the explicit
// `mode` field (keyword | any_comment) that Checkpoint 1 introduces. The
// engine is pure and framework-free: it only depends on these types, never
// on Firebase, so it can be unit-tested with plain mock data.

export type RuleMode = "keyword" | "any_comment";

export type RuleMatchType = "exact" | "contains";

export type RuleScope = "all_posts" | "specific_post";

export type ReplyMode = "comment_only" | "dm_only" | "comment_and_dm";

/**
 * A rule as the Rule Engine consumes it. Mirrors the frontend AutomationRule
 * plus `mode`. Rules are read from `automation/rules` and mapped to this
 * shape (with backward-compatible defaults for Firebase entries that predate
 * the `mode` field: absence of `mode` is treated as "keyword").
 */
export interface RuleEngineRule {
  id: string;
  channel: "instagram";
  mode: RuleMode;
  keywords: string[];
  matchType: RuleMatchType;
  scope: RuleScope;
  postId: string | null;
  postLabel: string | null;
  commentTemplateId: string | null;
  dmTemplateId: string | null;
  replyMode: ReplyMode;
  cooldownMinutes: number;
  activeFrom: number | null;
  activeUntil: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * The normalized, engine-relevant bits of an inbound comment event. The
 * engine deliberately receives a minimal slice (not the whole
 * NormalizedWebhookEvent) so it stays focused and trivially testable.
 */
export interface RuleEvaluationContext {
  /** Raw text of the comment (may be an empty string). */
  commentText: string;
  /** Instagram media id the comment was left on (null allowed for robustness). */
  mediaId: string | null;
  /** The commenter's user id (dedupe/cooldown key material). */
  userId: string | null;
  /** The commenter's username (optional, for logging). */
  username: string | null;
  /** Stable comment id — used to reject duplicate events. */
  commentId: string | null;
  /** Unix ms when the event was received. */
  receivedAt: number;
}

/**
 * The structured result of evaluating a single comment against the active
 * ruleset. `matched` is the top-level predicate; when `matched` is true the
 * remaining fields describe exactly which rule/keyword won and how the
 * cooldown/dedupe decision resolved.
 */
export interface RuleMatchResult {
  matched: boolean;
  /** Winning rule id (null when nothing matched). */
  ruleId: string | null;
  /** Winning rule (null when nothing matched). */
  rule: RuleEngineRule | null;
  /** The keyword that matched (null for any_comment mode or when unmatched). */
  matchedKeyword: string | null;
  /** The match type actually applied (null when unmatched). */
  matchType: RuleMatchType | null;
  /** True when the winning rule's scope (all_posts/specific_post) matched. */
  scopeMatched: boolean;
  /** True when cooldown blocked the trigger (matched but suppressed). */
  cooldownApplied: boolean;
  /** True when this exact comment id was already processed. */
  duplicate: boolean;
  /** Stable dedupe key used for duplicate/cooldown checks. */
  dedupeKey: string | null;
  /** Human-readable reason (for logs/debug). */
  reason: string;
}
