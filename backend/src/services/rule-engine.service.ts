// Phase 5 — Rule Engine Service
//
// Pure rule evaluation.
// No Firebase.
// No database.
// No network calls.
//
// Responsibilities:
// 1. Normalize incoming Instagram comments.
// 2. Check whether rules are active.
// 3. Check post scope.
// 4. Match keywords / any-comment rules.
// 5. Select the highest-priority matching rule.
// 6. Return detailed diagnostic information.
//
// Cooldown / duplicate suppression is NOT handled here.

import type {
  RuleEngineRule,
  RuleEvaluationContext,
  RuleMatchResult,
  RuleMatchType,
} from "../types/rule-engine.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Normalize text for reliable case-insensitive matching.
 */
function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalize Instagram IDs.
 *
 * Instagram IDs should normally already be strings, but converting them
 * defensively prevents number/string comparison issues.
 */
function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();

  return id.length > 0 ? id : null;
}

/**
 * Normalize a keyword.
 */
function normalizeKeyword(value: unknown): string {
  return normalizeText(value);
}

/**
 * Normalize a list of keywords.
 *
 * This also supports accidental comma-separated values such as:
 *
 * ["ZAPARE, zapare jobs, apply"]
 *
 * which becomes:
 *
 * ["zapare", "zapare jobs", "apply"]
 */
function normalizeKeywords(keywords: unknown): string[] {
  if (!Array.isArray(keywords)) {
    return [];
  }

  const result: string[] = [];

  for (const item of keywords) {
    if (typeof item !== "string") continue;

    const parts = item.split(",");

    for (const part of parts) {
      const keyword = normalizeKeyword(part);

      if (keyword && !result.includes(keyword)) {
        result.push(keyword);
      }
    }
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Keyword matching                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Match one keyword against comment text.
 *
 * exact:
 *   "zapare" === "zapare"
 *
 * contains:
 *   "hi zapare please" contains "zapare"
 */
export function matchKeyword(
  commentText: string,
  keyword: string,
  matchType: RuleMatchType,
): boolean {
  const text = normalizeText(commentText);
  const kw = normalizeKeyword(keyword);

  if (!text || !kw) {
    return false;
  }

  if (matchType === "exact") {
    return text === kw;
  }

  // Default / contains
  return text.includes(kw);
}

/* -------------------------------------------------------------------------- */
/* Rule active check                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Check whether a rule is currently active.
 */
export function isRuleActive(
  rule: RuleEngineRule,
  now: number,
): boolean {
  if (!rule.active) {
    return false;
  }

  if (
    rule.activeFrom !== null &&
    rule.activeFrom !== undefined &&
    now < rule.activeFrom
  ) {
    return false;
  }

  if (
    rule.activeUntil !== null &&
    rule.activeUntil !== undefined &&
    now > rule.activeUntil
  ) {
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Load active Instagram rules                                                */
/* -------------------------------------------------------------------------- */

/**
 * Return only active Instagram rules.
 */
export function loadActiveRules(
  rules: RuleEngineRule[],
  now: number,
): RuleEngineRule[] {
  return rules.filter((rule) => {
    if (rule.channel !== "instagram") {
      return false;
    }

    return isRuleActive(rule, now);
  });
}

/* -------------------------------------------------------------------------- */
/* Rule priority                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Higher priority rule comes first.
 *
 * Priority:
 *
 * 1. specific_post > all_posts
 * 2. More keywords > fewer keywords
 * 3. Newer rule > older rule
 * 4. ID ascending as deterministic tie breaker
 */
export function rulePriority(
  a: RuleEngineRule,
  b: RuleEngineRule,
): number {
  const aSpecific = a.scope === "specific_post" ? 1 : 0;
  const bSpecific = b.scope === "specific_post" ? 1 : 0;

  if (aSpecific !== bSpecific) {
    return bSpecific - aSpecific;
  }

  const aKeywordCount = normalizeKeywords(a.keywords).length;
  const bKeywordCount = normalizeKeywords(b.keywords).length;

  if (aKeywordCount !== bKeywordCount) {
    return bKeywordCount - aKeywordCount;
  }

  if (a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }

  return String(a.id).localeCompare(String(b.id));
}

/* -------------------------------------------------------------------------- */
/* Scope matching                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Check whether a rule applies to the incoming Instagram post.
 */
export function scopeMatches(
  rule: RuleEngineRule,
  context: RuleEvaluationContext,
): boolean {
  // Global rule.
  if (rule.scope === "all_posts") {
    return true;
  }

  // Specific-post rule.
  const rulePostId = normalizeId(rule.postId);
  const incomingMediaId = normalizeId(context.mediaId);

  if (!rulePostId || !incomingMediaId) {
    return false;
  }

  return rulePostId === incomingMediaId;
}

/* -------------------------------------------------------------------------- */
/* Keyword matching for rule                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Return the first keyword that matches.
 */
export function matchRuleKeywords(
  rule: RuleEngineRule,
  context: RuleEvaluationContext,
): string | null {
  const keywords = normalizeKeywords(rule.keywords);

  const commentText = normalizeText(context.commentText);

  if (!commentText) {
    return null;
  }

  for (const keyword of keywords) {
    if (
      matchKeyword(
        commentText,
        keyword,
        rule.matchType,
      )
    ) {
      return keyword;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Single rule evaluation                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate one rule.
 *
 * Returns:
 * - null = rule does not match
 * - keyword = keyword rule matched
 * - null for any_comment mode when scope matched
 */
export function evaluateRule(
  rule: RuleEngineRule,
  context: RuleEvaluationContext,
  now: number,
): string | null {
  // Rule must be active.
  if (!isRuleActive(rule, now)) {
    return null;
  }

  // Rule must apply to this post.
  if (!scopeMatches(rule, context)) {
    return null;
  }

  // Any comment mode.
  if (rule.mode === "any_comment") {
    return null;
  }

  // Keyword mode.
  const keywords = normalizeKeywords(rule.keywords);

  if (keywords.length === 0) {
    return null;
  }

  return matchRuleKeywords(rule, context);
}

/* -------------------------------------------------------------------------- */
/* No match result                                                            */
/* -------------------------------------------------------------------------- */

function noMatch(
  reason: string,
): RuleMatchResult {
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

/* -------------------------------------------------------------------------- */
/* Main rule engine                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate an incoming Instagram comment against all rules.
 *
 * Returns exactly ONE result:
 *
 * - best matching rule
 * - or no-match result
 */
export function evaluateComment(
  rules: RuleEngineRule[],
  context: RuleEvaluationContext,
  now: number = Date.now(),
): RuleMatchResult {
  const normalizedComment = normalizeText(
    context.commentText,
  );

  const normalizedMediaId = normalizeId(
    context.mediaId,
  );

  /* ---------------------------------------------------------------------- */
  /* Basic validation                                                        */
  /* ---------------------------------------------------------------------- */

  if (!normalizedMediaId) {
    return noMatch(
      "Incoming Instagram event has no mediaId",
    );
  }

  if (!normalizedComment) {
    return noMatch(
      "Incoming Instagram comment has no text",
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Active rules                                                            */
  /* ---------------------------------------------------------------------- */

  const activeRules = loadActiveRules(
    rules,
    now,
  ).sort(rulePriority);

  if (activeRules.length === 0) {
    return noMatch(
      "No active Instagram rules found",
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Evaluate rules                                                         */
  /* ---------------------------------------------------------------------- */

  for (const rule of activeRules) {
    const scopeMatched = scopeMatches(
      rule,
      context,
    );

    if (!scopeMatched) {
      continue;
    }

    /* -------------------------------------------------------------------- */
    /* ANY COMMENT                                                           */
    /* -------------------------------------------------------------------- */

    if (rule.mode === "any_comment") {
      return {
        matched: true,

        ruleId: rule.id,

        rule,

        matchedKeyword: null,

        matchType: rule.matchType,

        scopeMatched: true,

        cooldownApplied: false,

        duplicate: false,

        dedupeKey: null,

        reason:
          `any_comment rule ${rule.id} matched`,
      };
    }

    /* -------------------------------------------------------------------- */
    /* KEYWORD MODE                                                          */
    /* -------------------------------------------------------------------- */

    const matchedKeyword =
      matchRuleKeywords(
        rule,
        context,
      );

    if (!matchedKeyword) {
      continue;
    }

    return {
      matched: true,

      ruleId: rule.id,

      rule,

      matchedKeyword,

      matchType: rule.matchType,

      scopeMatched: true,

      cooldownApplied: false,

      duplicate: false,

      dedupeKey: null,

      reason:
        `rule ${rule.id} matched keyword "${matchedKeyword}"`,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Nothing matched                                                        */
  /* ---------------------------------------------------------------------- */

  return noMatch(
    `No active rule matched comment "${normalizedComment}" on media "${normalizedMediaId}"`,
  );
}

/* -------------------------------------------------------------------------- */
/* Diagnostic helper                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Useful for debugging production webhook issues.
 *
 * This does NOT change rule behavior.
 */
export function explainRuleEvaluation(
  rules: RuleEngineRule[],
  context: RuleEvaluationContext,
  now: number = Date.now(),
): Array<{
  ruleId: string;
  active: boolean;
  channel: string;
  mode: string;
  scope: string;
  rulePostId: string | null;
  incomingMediaId: string | null;
  scopeMatched: boolean;
  keywords: string[];
  matchedKeyword: string | null;
  matched: boolean;
}> {
  const incomingMediaId = normalizeId(
    context.mediaId,
  );

  return rules.map((rule) => {
    const active = isRuleActive(
      rule,
      now,
    );

    const scopeMatched =
      active &&
      rule.channel === "instagram" &&
      scopeMatches(rule, context);

    const keywords =
      normalizeKeywords(rule.keywords);

    let matchedKeyword: string | null = null;

    if (
      scopeMatched &&
      rule.mode === "keyword"
    ) {
      matchedKeyword =
        matchRuleKeywords(
          rule,
          context,
        );
    }

    const matched =
      scopeMatched &&
      (
        rule.mode === "any_comment" ||
        matchedKeyword !== null
      );

    return {
      ruleId: String(rule.id),

      active,

      channel: String(rule.channel),

      mode: String(rule.mode),

      scope: String(rule.scope),

      rulePostId: normalizeId(
        rule.postId,
      ),

      incomingMediaId,

      scopeMatched,

      keywords,

      matchedKeyword,

      matched,
    };
  });
}