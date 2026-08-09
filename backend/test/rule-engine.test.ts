// Phase 5 Checkpoint 1 — Rule Engine unit tests (zero-dependency).
//
// Run via: npm test  ->  tsx test/rule-engine.test.ts
//
// Every test uses pure mock data — no Firebase, no network, no I/O. The
// engine and cooldown service are framework-free and deterministic, so these
// tests are stable and fast.

import {
  matchKeyword,
  isRuleActive,
  loadActiveRules,
  rulePriority,
  scopeMatches,
  evaluateComment,
} from "../src/services/rule-engine.service.js";
import { CooldownService, buildDedupeKey } from "../src/services/cooldown.service.js";
import type {
  RuleEngineRule,
  RuleEvaluationContext,
  RuleMatchResult,
} from "../src/types/rule-engine.js";

// ---------------- tiny test harness ----------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push(name);
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertDeep(actual: unknown, expected: unknown, msg: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
}

// ---------------- helpers ----------------

function makeRule(partial: Partial<RuleEngineRule> = {}): RuleEngineRule {
  return {
    id: "rule_1",
    channel: "instagram",
    mode: "keyword",
    keywords: ["JOB"],
    matchType: "contains",
    scope: "all_posts",
    postId: null,
    postLabel: null,
    commentTemplateId: "tpl_comment_1",
    dmTemplateId: "tpl_dm_1",
    replyMode: "comment_and_dm",
    cooldownMinutes: 1440,
    activeFrom: null,
    activeUntil: null,
    active: true,
    createdAt: 1000,
    updatedAt: 1000,
    ...partial,
  };
}

function makeContext(partial: Partial<RuleEvaluationContext> = {}): RuleEvaluationContext {
  return {
    commentText: "I want the JOB link",
    mediaId: "media_1",
    userId: "user_1",
    username: "aditi",
    commentId: "comment_1",
    receivedAt: 5000,
    ...partial,
  };
}

const NOW = 5000;

// ---------------- tests ----------------

console.log("Rule Engine — keyword matching");

test("exact match: comment equals keyword (case-insensitive)", () => {
  assert(matchKeyword(" JOB ", "job", "exact"), "trim + case-insensitive exact should match");
  assert(matchKeyword("job", "JOB", "exact"), "case-insensitive exact should match");
  assert(!matchKeyword("jobs", "job", "exact"), "exact must not partial-match");
});

test("contains match: keyword inside comment (case-insensitive)", () => {
  assert(matchKeyword("I want a job link", "JOB", "contains"), "contains should match");
  assert(matchKeyword("can you send the link", "LINK", "contains"), "contains should match");
  assert(!matchKeyword("python", "JOB", "contains"), "should not match when absent");
});

test("empty keyword never matches", () => {
  assert(!matchKeyword("anything", "", "contains"), "empty keyword should not match");
  assert(!matchKeyword("anything", "  ", "contains"), "whitespace keyword should not match");
});

test("multiple keywords: any one matching keyword fires", () => {
  const rule = makeRule({ keywords: ["JOB", "LINK", "APPLY"] });
  assert(matchKeyword("send me the link please", "LINK", "contains"), "second keyword matches");
  assert(matchKeyword("apply now", "APPLY", "contains"), "third keyword matches");
  assert(!matchKeyword("hello there", "JOB", "contains"), "none match");
});

console.log("Rule Engine — mode & scope");

test("any_comment mode matches any comment on scope", () => {
  const rule = makeRule({ mode: "any_comment", keywords: [] });
  const ctx = makeContext({ commentText: "random text no keywords" });
  const result = evaluateComment([rule], ctx, NOW);
  assert(result.matched, "any_comment should match any comment");
  assert(result.matchedKeyword === null, "any_comment has no matched keyword");
});

test("keyword mode requires a keyword (empty keywords never match)", () => {
  const rule = makeRule({ mode: "keyword", keywords: [] });
  const result = evaluateComment([rule], makeContext(), NOW);
  assert(!result.matched, "keyword mode with no keywords should not match");
});

test("scope all_posts matches any media id", () => {
  const rule = makeRule({ scope: "all_posts", postId: null });
  assert(scopeMatches(rule, makeContext({ mediaId: "media_999" })), "all_posts matches any media");
});

test("scope specific_post only matches the targeted post", () => {
  const rule = makeRule({ scope: "specific_post", postId: "media_5" });
  assert(scopeMatches(rule, makeContext({ mediaId: "media_5" })), "specific_post matches its post");
  assert(!scopeMatches(rule, makeContext({ mediaId: "media_6" })), "specific_post rejects other posts");
});

test("specific_post rule does not fire on a different post even with keyword", () => {
  const rule = makeRule({ scope: "specific_post", postId: "media_5", keywords: ["JOB"] });
  const result = evaluateComment([rule], makeContext({ mediaId: "media_6" }), NOW);
  assert(!result.matched, "keyword present but wrong post should not match");
});

console.log("Rule Engine — active/filtering");

test("inactive rule is filtered out", () => {
  const rule = makeRule({ active: false });
  assert(!isRuleActive(rule, NOW), "inactive rule is not active");
  assert(loadActiveRules([rule], NOW).length === 0, "inactive rule removed");
});

test("active window (activeFrom/activeUntil) is respected", () => {
  const outside = makeRule({ activeFrom: NOW + 100, activeUntil: NOW + 200 });
  assert(!isRuleActive(outside, NOW), "before activeFrom is inactive");
  const inside = makeRule({ activeFrom: NOW - 100, activeUntil: NOW + 200 });
  assert(isRuleActive(inside, NOW), "within window is active");
  const expired = makeRule({ activeFrom: NOW - 200, activeUntil: NOW - 100 });
  assert(!isRuleActive(expired, NOW), "after activeUntil is inactive");
});

test("non-instagram channel is filtered out", () => {
  const rule = makeRule({ channel: "whatsapp" as RuleEngineRule["channel"] });
  assert(loadActiveRules([rule], NOW).length === 0, "non-instagram filtered");
});

console.log("Rule Engine — deterministic priority");

test("specific_post rule outranks all_posts rule", () => {
  const allPosts = makeRule({ id: "a", scope: "all_posts", keywords: ["JOB"], createdAt: 2000 });
  const specific = makeRule({ id: "b", scope: "specific_post", postId: "media_1", keywords: ["JOB"], createdAt: 1000 });
  const result = evaluateComment([allPosts, specific], makeContext(), NOW);
  assert(result.ruleId === "b", `expected specific_post rule b, got ${result.ruleId}`);
});

test("more keywords outrank fewer keywords (same scope)", () => {
  const few = makeRule({ id: "few", scope: "all_posts", keywords: ["JOB"], createdAt: 3000 });
  const many = makeRule({ id: "many", scope: "all_posts", keywords: ["JOB", "LINK"], createdAt: 1000 });
  const result = evaluateComment([few, many], makeContext({ commentText: "JOB LINK" }), NOW);
  assert(result.ruleId === "many", `expected many-keyword rule, got ${result.ruleId}`);
});

test("newer createdAt outranks older (same specificity)", () => {
  const older = makeRule({ id: "older", scope: "all_posts", keywords: ["JOB"], createdAt: 1000 });
  const newer = makeRule({ id: "newer", scope: "all_posts", keywords: ["JOB"], createdAt: 2000 });
  const result = evaluateComment([older, newer], makeContext(), NOW);
  assert(result.ruleId === "newer", `expected newer rule, got ${result.ruleId}`);
});

test("priority is deterministic regardless of input order", () => {
  const r1 = makeRule({ id: "r1", scope: "all_posts", keywords: ["JOB"], createdAt: 1000 });
  const r2 = makeRule({ id: "r2", scope: "specific_post", postId: "media_1", keywords: ["JOB"], createdAt: 2000 });
  const a = evaluateComment([r1, r2], makeContext(), NOW);
  const b = evaluateComment([r2, r1], makeContext(), NOW);
  assert(a.ruleId === b.ruleId && a.ruleId === "r2", "winner identical regardless of array order");
});

console.log("Rule Engine — structured result");

test("returns structured RuleMatchResult with matched true", () => {
  const rule = makeRule();
  const result: RuleMatchResult = evaluateComment([rule], makeContext(), NOW);
  assert(result.matched === true, "matched true");
  assert(result.ruleId === "rule_1", "ruleId set");
  assert(result.rule !== null, "rule present");
  assert(result.matchedKeyword === "JOB", `matchedKeyword JOB, got ${result.matchedKeyword}`);
  assert(result.matchType === "contains", "matchType set");
  assert(result.scopeMatched === true, "scope matched");
  assert(result.reason.includes("JOB"), "reason includes keyword");
});

test("returns non-matched result with reason when nothing matches", () => {
  const rule = makeRule({ keywords: ["SQL"] });
  const result = evaluateComment([rule], makeContext({ commentText: "hello" }), NOW);
  assert(result.matched === false, "not matched");
  assert(result.ruleId === null, "no ruleId");
  assert(result.reason === "no active rule matched", "reason set");
});

console.log("Cooldown — duplicate & cooldown protection");

test("buildDedupeKey uses userId|ruleId|mediaId", () => {
  const key = buildDedupeKey(makeContext(), "rule_x");
  assert(key === "user_1|rule_x|media_1", `dedupe key ${key}`);
});

test("duplicate comment id is rejected", () => {
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  const ctx = makeContext({ commentId: "c1" });
  const first = cd.shouldFire(ctx, rule, NOW);
  assert(first.allowed, "first comment allowed");
  const second = cd.shouldFire(makeContext({ commentId: "c1" }), rule, NOW + 1000);
  assert(second.duplicate && !second.allowed, "same comment id rejected as duplicate");
});

test("cooldown blocks a repeat trigger within the window", () => {
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  cd.record(makeContext(), rule, NOW);
  const within = cd.shouldFire(makeContext({ commentId: "c2" }), rule, NOW + 30 * 60 * 1000);
  assert(within.cooldownApplied && !within.allowed, "repeat within cooldown blocked");
});

test("cooldown expires after the window", () => {
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  cd.record(makeContext(), rule, NOW);
  const after = cd.shouldFire(makeContext({ commentId: "c3" }), rule, NOW + 61 * 60 * 1000);
  assert(after.allowed && !after.cooldownApplied, "after cooldown allowed");
});

test("different users are not blocked by each other's cooldown", () => {
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  cd.record(makeContext({ userId: "user_a" }), rule, NOW);
  const other = cd.shouldFire(makeContext({ userId: "user_b" }), rule, NOW + 1000);
  assert(other.allowed, "different user not blocked");
});

// ---------------- summary ----------------

console.log("\n----------------------------------------");
console.log(`Rule Engine tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failing tests:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
