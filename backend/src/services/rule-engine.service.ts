// Phase 5 Checkpoint 1 — Rule Engine (pure, framework-free).
//
// This module decides WHICH active rule (if any) matches a normalized
// inbound comment. It performs NO I/O and imports NO Firebase — every
// function is deterministic given its inputs, which makes the engine
// trivially unit-testable with plain mock data. Cooldown/duplicate
// suppression is a separate concern handled by cooldown.service.ts; this
// engine focuses purely on "does this comment match this rule".

import type {
  RuleEngineRule,
  RuleEvaluationContext,
  RuleMatchResult,
  RuleMatchType,
} from "../types/rule-engine.js";

/** Normalizes text for case-insensitive matching (lowercase, trimmed). */
function normalize(text: string): string {
  return text.toLocaleLowerCase().trim();
}

/**
 * Matches a single keyword against comment text.
 * - exact:    normalized comment is EQUAL to the normalized keyword.
 * - contains: normalized comment CONTAINS the normalized keyword.
 * Always case-insensitive.
 */
export function matchKeyword(
  commentText: string,
  keyword: string,
  matchType: RuleMatchType,
): boolean {
  const text = normalize(commentText);
  const kw = normalize(keyword);
  if (!kw) return false;
  if (matchType === "exact") return text === kw;
  return text.includes(kw);
}

/**
 * True when a rule is currently active (active flag AND within window).
 */
export function isRuleActive(rule: RuleEngineRule, now: number): boolean {
  if (!rule.active) return false;
  if (rule.activeFrom !== null && now < rule.activeFrom) return false;
  if (rule.activeUntil !== null && now > rule.activeUntil) return false;
  return true;
}

/**
 * Filters to the subset of rules that are currently active and targeting the
 * instagram channel. Pure: does not mutate the input array.
 */
export function loadActiveRules(rules: RuleEngineRule[], now: number): RuleEngineRule[] {
  return rules.filter((r) => r.channel === "instagram" && isRuleActive(r, now));
}

/**
 * Deterministic rule priority sort (most specific wins).
 *
 * Ordering (first criterion decides, ties fall through to the next):
 *   1. specific_post scope ranks ABOVE all_posts (more specific).
 *   2. more keywords ranks higher (more specific).
 *   3. newer createdAt ranks higher (more recently created).
 *   4. id ascending as a final tie-breaker for full determinism.
 *
 * Because every comparison is a total order, the same input array always
 * yields the same "best" rule — no reliance on array order from Firebase.
 */
export function rulePriority(a: RuleEngineRule, b: RuleEngineRule): number {
  const aSpecific = a.scope === "specific_post" ? 1 : 0;
  const bSpecific = b.scope === "specific_post" ? 1 : 0;
  if (aSpecific !== bSpecific) return bSpecific - aSpecific;

  if (a.keywords.length !== b.keywords.length) {
    return b.keywords.length - a.keywords.length;
  }

if (a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Does the rule's scope match the context?
 * - all_posts:      always true.
 * - specific_post:  true only when context.mediaId equals rule.postId.
 */
export function scopeMatches(rule: RuleEngineRule, context: RuleEvaluationContext): boolean {
  if (rule.scope === "all_posts") return true;
  return rule.postId !== null && context.mediaId !== null && rule.postId === context.mediaId;
}

/**
 * For a keyword-mode rule, find the first keyword (in rule order) that
 * matches the comment. Returns null when none match.
 */
export function matchRuleKeywords(
  rule: RuleEngineRule,
  context: RuleEvaluationContext,
): string | null {
  for (const keyword of rule.keywords) {
    if (matchKeyword(context.commentText, keyword, rule.matchType)) return keyword;
  }
  return null;
}

/**
 * Evaluate a single rule against a context. Returns null when the rule does
 * not match (inactive, scope mismatch, or keyword mismatch). When it matches,
 * returns the matched keyword (null for any_comment mode).
 */
export function evaluateRule(
  rule: RuleEngineRule,
  context: RuleEvaluationContext,
  now: number,
): string | null {
  if (!isRuleActive(rule, now)) return null;
  if (!scopeMatches(rule, context)) return null;

  if (rule.mode === "any_comment") {
    // any_comment mode matches any comment on the applicable scope.
    return null;
  }

  // keyword mode — must have at least one matching keyword.
  if (rule.keywords.length === 0) return null;
  return matchRuleKeywords(rule, context);
}

/**
 * Build a non-matched RuleMatchResult.
 */
function noMatch(reason: string): RuleMatchResult {
  return {
    matched: false,
    ruleId: null,
    rule: null,
    matchedKeyword: null,
    matchType: null,
    scopeMatched: false,
    cooldownApplied: false,
    duplicate: false,
    dedupeKey: null,
    reason,
  };
}

/**
 * Evaluate an inbound comment against the active ruleset and return the
 * single best structured RuleMatchResult.
 *
 * Algorithm:
 *   1. Filter to active instagram rules.
 *   2. For each active rule (in priority order), check scope + keyword /
 *      any_comment match.
 *   3. Return the FIRST (highest-priority) matching rule.
 *   4. If none match, return a non-matched result with a reason.
 *
 * Cooldown/duplicate suppression is NOT applied here — the caller
 * (server.ts) applies it via cooldown.service.ts and stamps the result.
 */
export function evaluateComment(
  rules: RuleEngineRule[],
  context: RuleEvaluationContext,
  now: number,
): RuleMatchResult {

    console.log("=== RULE DEBUG ===");
  console.log(
    JSON.stringify(
      {
        mediaId: context.mediaId,
        commentText: context.commentText,
        rules: rules.map((r) => ({
          id: r.id,
          keywords: r.keywords,
          scope: r.scope,
          postId: r.postId,
          active: r.active,
          mode: r.mode,
          channel: r.channel,
        })),
      },
      null,
      2,
    ),
  );

  
  const active = loadActiveRules(rules, now).sort(rulePriority);

  for (const rule of active) {
    const scopeMatched = scopeMatches(rule, context);
    if (!scopeMatched) continue;

    const matchedKeyword = evaluateRule(rule, context, now);
    if (matchedKeyword === null && rule.mode !== "any_comment") continue;
    if (matchedKeyword === null && rule.mode === "any_comment") {
      // any_comment matched (scope already confirmed above).
      return {
        matched: true,
        ruleId: rule.id,
        rule,
        matchedKeyword: null,
        matchType: rule.matchType,
        scopeMatched,
        cooldownApplied: false,
        duplicate: false,
        dedupeKey: null,
        reason: `any_comment rule ${rule.id} matched`,
      };
    }

    // keyword mode matched.
    return {
      matched: true,
      ruleId: rule.id,
      rule,
      matchedKeyword,
      matchType: rule.matchType,
      scopeMatched,
      cooldownApplied: false,
      duplicate: false,
      dedupeKey: null,
      reason: `rule ${rule.id} matched keyword "${matchedKeyword}"`,
    };
  }

  return noMatch("no active rule matched");
}
