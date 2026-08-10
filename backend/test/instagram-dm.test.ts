// Phase 5 Checkpoint 4 — Instagram Automatic DM + Job Link unit tests.
//
// Zero-dependency test setup (consistent with rule-engine.test.ts /
// post-mapping.test.ts / instagram.test.ts). These tests use in-memory mocks
// only — they NEVER touch the real Meta API or the real Firebase database,
// and NEVER write fake data. The Meta network call is injected and stubbed
// (or never called in dry-run mode).

import {
  sendDirectMessage,
  processDirectMessage,
  renderCommentReply,
  META_GRAPH_VERSION,
  type DmLogData,
} from "../src/services/instagram.service.js";
import type { RuleEngineRule } from "../src/types/rule-engine.js";
import type { PostJobResolution } from "../src/services/post-mapping.service.js";

// ---------------- tiny test harness ----------------

let passed = 0;
let failed = 0;
const failures: string[] = [];
const pending: Promise<void>[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  pending.push(
    Promise.resolve()
      .then(fn)
      .then(() => {
        passed++;
        console.log("  ✓ " + name);
      })
      .catch((err: unknown) => {
        failed++;
        failures.push(name);
        console.error("  ✗ " + name);
        console.error("    " + (err instanceof Error ? err.message : String(err)));
      }),
  );
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
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

function makeResolution(partial: Partial<PostJobResolution> = {}): PostJobResolution {
  return {
    mapped: true,
    mediaId: "media_1",
    jobId: "job_1",
    jobUrl: "https://hire-daily.vercel.app/jobs/job_1",
    jobTitle: "Software Engineer",
    company: "HireDaily",
    title: "Software Engineer",
    location: "Remote",
    reason: "resolved",
    ...partial,
  };
}

/** A mock fetch that records the URL it was called with (never hits the network). */
function makeMockFetch(onUrl?: (url: string) => void) {
  const calls: string[] = [];
  const impl = async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push(`${url} ${body}`);
    if (onUrl) onUrl(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ message_id: "dm_17895617777770001" }),
    } as unknown as Response;
  };
  return { calls, impl };
}

/** A mock fetch that always returns a Meta error. */
function makeErrorFetch() {
  return async (_input: string | Request | URL) =>
    ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid recipient" } }),
    }) as unknown as Response;
}

const DM_TEMPLATE = `Hi {{username}} 👋

Here is the job you requested:

{{title}}
{{company}}

Apply here:
{{jobLink}}`;

function readerWithDmTemplate(text: string | null) {
  return {
    getDmTemplateText: async () => text,
  };
}

function captureLogger() {
  const logs: string[] = [];
  return {
    logs,
    logger: {
      info: (m: string, meta?: Record<string, unknown>) => logs.push(JSON.stringify({ level: "info", m, meta })),
      warn: (m: string, meta?: Record<string, unknown>) => logs.push(JSON.stringify({ level: "warn", m, meta })),
      error: (m: string, meta?: Record<string, unknown>) => logs.push(JSON.stringify({ level: "error", m, meta })),
    },
  };
}

// ---------------- tests ----------------

console.log("Instagram DM — sendDirectMessage");

test("sendDirectMessage builds the correct Meta DM endpoint and returns success", async () => {
  const mock = makeMockFetch();
  const result = await sendDirectMessage("user_123", "Hello DM", "secret-token", {
    dryRun: false,
    fetchImpl: mock.impl,
  });
  assert(result.success === true, "success true");
  assert(result.externalId === "dm_17895617777770001", "externalId from Meta");
  assert(result.error === null, "no error");
  assert(mock.calls.length === 1, "one network call");
  assert(
    mock.calls[0].startsWith(`https://graph.instagram.com/${META_GRAPH_VERSION}/27813166828303890/messages`),
    "correct DM endpoint",
  );
  assert(!mock.calls[0].includes("secret-token"), "token not exposed in URL");
});

test("sendDirectMessage returns failure when recipient id missing", async () => {
  const mock = makeMockFetch();
  const result = await sendDirectMessage("", "Hello", "token", { dryRun: false, fetchImpl: mock.impl });
  assert(result.success === false, "success false");
  assert(result.externalId === null, "no externalId");
  assert(result.error === "comment_id_missing", "comment_id_missing");
  assert(mock.calls.length === 0, "no network call");
});

test("sendDirectMessage returns failure when message empty", async () => {
  const mock = makeMockFetch();
  const result = await sendDirectMessage("user_1", "", "token", { dryRun: false, fetchImpl: mock.impl });
  assert(result.success === false, "success false");
  assert(result.error === "message_empty", "message_empty");
  assert(mock.calls.length === 0, "no network call");
});

test("sendDirectMessage returns failure for a non-2xx Meta response", async () => {
  const result = await sendDirectMessage("user_1", "Hello", "token", {
    dryRun: false,
    fetchImpl: makeErrorFetch(),
  });
  assert(result.success === false, "success false");
  assert(result.externalId === null, "no externalId");
  assert(result.error === "Invalid recipient", "safe error message");
});

test("sendDirectMessage dry-run → no real Meta request", async () => {
  const mock = makeMockFetch();
  const result = await sendDirectMessage("user_1", "Hello", "token", {
    dryRun: true,
    fetchImpl: mock.impl,
  });
  assert(result.success === true, "dry-run success");
  assert(result.dryRun === true, "dryRun true");
  assert(mock.calls.length === 0, "no real Meta call in dry-run");
});

test("sendDirectMessage never exposes the access token in errors", async () => {
  const result = await sendDirectMessage("user_1", "Hello", "SUPER_SECRET_TOKEN", {
    dryRun: false,
    fetchImpl: makeErrorFetch(),
  });
  assert(result.success === false, "success false");
  assert(
    result.error !== null && !result.error.includes("SUPER_SECRET_TOKEN"),
    "token not in error",
  );
});

console.log("Instagram DM — processDirectMessage (orchestrator)");

test("valid recipient + mapped job → DM generated (dmStatus success)", async () => {
  const mock = makeMockFetch();
  const result: DmLogData = await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "test_user",
      mediaId: "media_1",
      commentId: "comment_1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "success", "dmStatus success");
  assert(result.commentStatus === "success", "commentStatus preserved");
  assert(result.error === null, "no error");
  assert(mock.calls.length === 1, "one Meta call");
});

test("correct mapped job URL included in the DM", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ jobUrl: "https://hire-daily.vercel.app/jobs/job_42" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Apply: {{jobLink}}"), fetchImpl: mock.impl },
  );
const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("Apply: https://hire-daily.vercel.app/jobs/job_42"), "exact mapped job URL in DM: " + url);
});

test("username rendered in DM", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "aditi",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Hi {{username}}"), fetchImpl: mock.impl },
  );
  const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("Hi aditi"), "username rendered: " + url);
});

test("company rendered in DM", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ company: "Acme Corp" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Company: {{company}}"), fetchImpl: mock.impl },
  );
  const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("Company: Acme Corp"), "company rendered: " + url);
});

test("title rendered in DM", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ jobTitle: "Full Stack Engineer", title: "Full Stack Engineer" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Title: {{title}}"), fetchImpl: mock.impl },
  );
  const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("Title: Full Stack Engineer"), "title rendered: " + url);
});

test("location rendered in DM", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_123",
      userId: "user_123",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ location: "Remote" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Location: {{location}}"), fetchImpl: mock.impl },
  );
  const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("Location: Remote"), "location rendered: " + url);
});

test("missing recipient ID is safe for comment private replies", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: null,
      userId: null,
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "success", "dmStatus success");
  assert(result.error === null, "no error");
  assert(mock.calls.length === 1, "one Meta call");
});

test("missing post mapping → no DM (failed)", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: false, jobId: null, jobUrl: null, reason: "post_mapping_not_found" }),
      commentStatus: "failed",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "failed", "dmStatus failed");
  assert(result.error === "post_mapping_not_found", "reason");
  assert(mock.calls.length === 0, "no Meta call");
});

test("missing job → no DM (failed)", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: false, jobId: "missing", jobUrl: null, reason: "job_not_found" }),
      commentStatus: "failed",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "failed", "dmStatus failed");
  assert(result.error === "job_not_found", "reason");
  assert(mock.calls.length === 0, "no Meta call");
});

test("empty dmText → no DM (failed)", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(null), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "failed", "dmStatus failed");
  assert(result.error === "dm_text_empty", "dm_text_empty");
  assert(mock.calls.length === 0, "no Meta call");
});

test("missing required template variable → no DM (failed)", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ company: "" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Hi {{username}} at {{company}} {{jobLink}}"), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "failed", "dmStatus failed");
  assert(result.error !== null, "has error");
  assert(mock.calls.length === 0, "no Meta call");
});

console.log("Instagram DM — duplicate & cooldown (reuse Checkpoint 1)");

test("duplicate event → no second DM (cooldown/dedupe reused)", async () => {
  const { CooldownService, buildDedupeKey } = await import("../src/services/cooldown.service.js");
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  const ctx = {
    commentText: "JOB",
    mediaId: "media_1",
    userId: "user_1",
    username: "u",
    commentId: "comment_dup",
    receivedAt: 1000,
  };
  const first = cd.shouldFire(ctx, rule, 1000);
  assert(first.allowed === true, "first allowed");
  cd.record(ctx, rule, 1000);

  // A redelivery with the same comment id is rejected as a duplicate.
  const redelivery = cd.shouldFire({ ...ctx, receivedAt: 2000 }, rule, 2000);
  assert(redelivery.duplicate === true, "redelivery marked duplicate");
  assert(redelivery.allowed === false, "redelivery not allowed — no second DM");

  // Deterministic dedupe key includes user + rule (+ media/comment).
  const key = buildDedupeKey(ctx, rule.id);
  assert(key === "user_1|rule_1|media_1", "dedupe key user|rule|media: " + key);
});

test("cooldown rejection → no DM (cooldown reused)", async () => {
  const { CooldownService } = await import("../src/services/cooldown.service.js");
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  const ctx = {
    commentText: "JOB",
    mediaId: "media_1",
    userId: "user_1",
    username: "u",
    commentId: "c_repeat",
    receivedAt: 1000,
  };
  cd.record(ctx, rule, 1000);
  // Same user/rule/media within the cooldown window → blocked.
  const within = cd.shouldFire({ ...ctx, commentId: "c2", receivedAt: 1000 + 30 * 60 * 1000 }, rule, 1000 + 30 * 60 * 1000);
  assert(within.cooldownApplied === true, "within cooldown, DM blocked");
  assert(within.allowed === false, "not allowed — no second DM");
});

console.log("Instagram DM — dry-run & status independence");

test("dry-run → no real Meta request, dmStatus simulated success", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: true,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "success", "dry-run dmStatus success");
  assert(result.dryRun === true, "dryRun true");
  assert(mock.calls.length === 0, "no real Meta call in dry-run");
});

test("Meta success → dmStatus=success", async () => {
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "success", "dmStatus success");
  assert(result.error === null, "no error");
});

test("Meta non-2xx → dmStatus=failed", async () => {
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: makeErrorFetch() },
  );
  assert(result.dmStatus === "failed", "dmStatus failed");
  assert(result.error !== null, "has error");
});

test("access token never appears in logs/errors", async () => {
  const { logger, logs } = captureLogger();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "success",
      accessToken: "SUPER_SECRET",
      dryRun: false,
      logger,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: makeErrorFetch() },
  );
  assert(result.dmStatus === "failed", "failed");
  assert(!logs.join("").includes("SUPER_SECRET"), "token not in logs");
  assert(!JSON.stringify(result).includes("SUPER_SECRET"), "token not in result");
});

test("DM uses exact mapped job URL (never generic /jobs)", async () => {
  const mock = makeMockFetch();
  await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ jobUrl: "https://hire-daily.vercel.app/jobs/job_99" }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Apply: {{jobLink}}"), fetchImpl: mock.impl },
  );
  const url = decodeURIComponent(mock.calls[0]);
  assert(url.includes("jobs/job_99"), "exact job id in DM");
  assert(!url.includes("/jobs?\""), "no generic jobs query");
});

test("generic /jobs URL is never used as fallback", async () => {
  // Even if the resolution has no jobUrl, the DM must NOT fall back to a
  // generic "/jobs" page — it must fail.
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: true, jobUrl: null }),
      commentStatus: "success",
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate("Apply: {{jobLink}}"), fetchImpl: mock.impl },
  );
  assert(result.dmStatus === "failed", "no DM when jobUrl missing");
  assert(result.error === "job_url_missing", "job_url_missing");
  assert(mock.calls.length === 0, "no Meta call");
});

test("comment and DM statuses remain independent", async () => {
  // A failed comment reply does NOT prevent a valid DM (they are independent).
  const mock = makeMockFetch();
  const result = await processDirectMessage(
    {
      recipientId: "user_1",
      userId: "user_1",
      username: "u",
      mediaId: "media_1",
      commentId: "c1",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      commentStatus: "failed", // comment reply failed
      accessToken: "token",
      dryRun: false,
    },
    { reader: readerWithDmTemplate(DM_TEMPLATE), fetchImpl: mock.impl },
  );
  assert(result.commentStatus === "failed", "commentStatus stays failed");
  assert(result.dmStatus === "success", "dmStatus success independent of comment reply");
  assert(result.dmStatus !== result.commentStatus, "statuses differ");
});

// ---------------- summary ----------------

async function main(): Promise<void> {
  await Promise.all(pending);

  console.log("\n----------------------------------------");
  console.log("Instagram DM tests: " + passed + " passed, " + failed + " failed");

  if (failed > 0) {
    console.error("Failing tests:");
    for (const f of failures) {
      console.error("  - " + f);
    }
    process.exit(1);
  } else {
    process.exit(0);
  }
}

void main();
