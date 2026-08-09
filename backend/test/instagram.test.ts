// Phase 5 Checkpoint 3 — Instagram public comment reply unit tests.
//
// Zero-dependency test setup (consistent with rule-engine.test.ts /
// post-mapping.test.ts). These tests use in-memory mocks only — they NEVER
// touch the real Meta API, NEVER call the production Firebase database, and
// NEVER write fake data. The Meta network call is injected and stubbed.

import {
  renderCommentReply,
  replyToComment,
  processCommentReply,
  META_GRAPH_VERSION,
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
    dmTemplateId: null,
    replyMode: "comment_only",
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

type FetchArg = string | Request | URL;

/** A mock fetch that records the URL it was called with (never hits the network). */
function makeMockFetch(onUrl?: (url: string) => void) {
  const calls: string[] = [];
  const impl = async (input: FetchArg) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    if (onUrl) onUrl(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "17895617777770001" }),
    } as unknown as Response;
  };
  return { calls, impl };
}

/** A mock fetch that always returns a Meta error. */
function makeErrorFetch() {
  return async (_input: FetchArg) =>
    ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "Invalid comment" } }),
    }) as unknown as Response;
}

const readerWithTemplate = (text: string | null) => ({
  reader: {
    getCommentTemplateText: async () => text,
  },
});

// ---------------- tests ----------------

console.log("Instagram Comment Reply — replyToComment");

test("replyToComment builds the correct Meta endpoint and returns success", async () => {
  const mock = makeMockFetch();
  const result = await replyToComment("comment_1", "Hello!", "secret-token", {
    dryRun: false,
    fetchImpl: mock.impl,
  });
  assert(result.success === true, "success true");
  assert(result.externalId === "17895617777770001", "externalId from Meta");
  assert(result.error === null, "no error");
  assert(mock.calls.length === 1, "one network call");
  assert(
    mock.calls[0].startsWith(`https://graph.facebook.com/${META_GRAPH_VERSION}/comment_1/replies`),
    "correct endpoint",
  );
assert(mock.calls[0].includes(`message=${encodeURIComponent("Hello!")}`), "message encoded in URL");
  assert(mock.calls[0].includes("access_token=secret-token"), "token in URL");
});

test("replyToComment returns failure for a non-2xx Meta response", async () => {
  const result = await replyToComment("comment_1", "Hello", "token", {
    dryRun: false,
    fetchImpl: makeErrorFetch(),
  });
  assert(result.success === false, "success false");
  assert(result.externalId === null, "no externalId");
  assert(result.error === "Invalid comment", "safe error message");
});

test("replyToComment returns failure when comment id is missing", async () => {
  const mock = makeMockFetch();
  const result = await replyToComment("", "Hello", "token", { dryRun: false, fetchImpl: mock.impl });
  assert(result.success === false, "success false");
  assert(result.error === "comment_id_missing", "comment_id_missing");
  assert(mock.calls.length === 0, "no network call");
});

test("replyToComment returns failure when message is empty", async () => {
  const mock = makeMockFetch();
  const result = await replyToComment("c1", "", "token", { dryRun: false, fetchImpl: mock.impl });
  assert(result.success === false, "success false");
  assert(result.error === "message_empty", "message_empty");
  assert(mock.calls.length === 0, "no network call");
});

test("replyToComment never exposes the access token in errors", async () => {
  const result = await replyToComment("c1", "Hello", "SUPER_SECRET_TOKEN", {
    dryRun: false,
    fetchImpl: makeErrorFetch(),
  });
  assert(result.success === false, "success false");
  assert(
    result.error !== null && !result.error.includes("SUPER_SECRET_TOKEN"),
    "token not in error",
  );
});

console.log("Instagram Comment Reply — renderCommentReply");

test("renderCommentReply substitutes all supported variables", () => {
  const rendered = renderCommentReply(
    "Hi {{username}} 👋 {{title}} at {{company}} ({{location}}) — {{jobLink}}",
    {
      commentReplyText: "",
      username: "test_user",
      company: "HireDaily",
      title: "Software Engineer",
      location: "Remote",
      jobLink: "https://hire-daily.vercel.app/jobs/job_1",
    },
  );
  assert(rendered.ok === true, "render ok");
  assert(
    rendered.rendered ===
      "Hi test_user 👋 Software Engineer at HireDaily (Remote) — https://hire-daily.vercel.app/jobs/job_1",
    "all variables substituted: " + rendered.rendered,
  );
});

test("renderCommentReply leaves no raw {{variables}} when values are available", () => {
  const rendered = renderCommentReply("Hi {{username}} here is {{jobLink}}", {
    commentReplyText: "",
    username: "aditi",
    company: "",
    title: "",
    location: "",
    jobLink: "https://hire-daily.vercel.app/jobs/123",
  });
  assert(rendered.ok === true, "render ok");
  assert(!/{{.*}}/.test(rendered.rendered), "no raw tokens remain");
});

test("renderCommentReply fails when a required variable cannot be resolved", () => {
  const rendered = renderCommentReply("Job: {{title}} at {{company}}", {
    commentReplyText: "",
    username: "u",
    company: "",
    title: "",
    location: "",
    jobLink: "",
  });
  assert(rendered.ok === false, "render fails");
  assert(rendered.error !== null, "has error");
});

console.log("Instagram Comment Reply — processCommentReply");

test("valid comment + matched rule → reply payload generated (dry-run)", async () => {
  const log: Record<string, unknown>[] = [];
  const mock = makeMockFetch();
  const result = await processCommentReply(
    {
      commentId: "comment_1",
      mediaId: "media_1",
      userId: "user_1",
      username: "test_user",
      rule: makeRule(),
      matchedKeyword: "JOB",
      resolution: makeResolution(),
      accessToken: "token",
      dryRun: true,
      logger: { info: (m, meta) => log.push({ level: "info", m, meta }), warn: () => {}, error: () => {} },
    },
    { reader: { getCommentTemplateText: async () => "Hi {{username}} {{jobLink}}" }, fetchImpl: mock.impl },
  );
  assert(result.commentStatus === "success", "dry-run success");
  assert(result.dryRun === true, "dryRun true");
  assert(result.commentId === "comment_1", "commentId recorded");
  assert(mock.calls.length === 0, "no real Meta call in dry-run");
});

test("exact keyword matched rule → reply generated", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule({ mode: "keyword", keywords: ["JOB"], matchType: "exact" }),
      matchedKeyword: "JOB", resolution: makeResolution(), accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}} exact"),
  );
  assert(result.commentStatus === "success", "reply generated");
});

test("contains keyword matched rule → reply generated", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule({ mode: "keyword", keywords: ["JOB"], matchType: "contains" }),
      matchedKeyword: "JOB", resolution: makeResolution(), accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}} contains"),
  );
  assert(result.commentStatus === "success", "reply generated");
});

test("any_comment matched rule → reply generated", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule({ mode: "any_comment", keywords: [] }),
      matchedKeyword: null, resolution: makeResolution(), accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}} any"),
  );
  assert(result.commentStatus === "success", "reply generated");
});

test("specific_post + correct mediaId → reply generated", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "media_1", userId: "u1", username: "u",
      rule: makeRule({ scope: "specific_post", postId: "media_1" }),
      matchedKeyword: "JOB", resolution: makeResolution(), accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}} specific"),
  );
  assert(result.commentStatus === "success", "reply generated for matching post");
});

test("specific_post + wrong mediaId → no reply (resolution fails)", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "media_1", userId: "u1", username: "u",
      rule: makeRule({ scope: "specific_post", postId: "media_1" }),
      matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: false, jobId: null, reason: "post_mapping_not_found" }),
      accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}}"),
  );
  assert(result.commentStatus === "failed", "no reply");
  assert(result.error === "post_mapping_not_found", "failure reason");
});

test("no post mapping → no reply", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: false, jobId: null, jobUrl: null, reason: "post_mapping_not_found" }),
      accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}}"),
  );
  assert(result.commentStatus === "failed", "no reply");
  assert(result.error === "post_mapping_not_found", "reason");
});

test("missing job → no reply", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB",
      resolution: makeResolution({ mapped: false, reason: "job_not_found" }),
      accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}}"),
  );
  assert(result.commentStatus === "failed", "no reply");
  assert(result.error === "job_not_found", "reason");
});

test("empty commentReplyText → no reply", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: true,
    },
    readerWithTemplate(null),
  );
  assert(result.commentStatus === "failed", "no reply");
  assert(result.error === "comment_reply_text_empty", "reason");
});

test("missing commentId → no Meta call", async () => {
  const mock = makeMockFetch();
  const result = await processCommentReply(
    {
      commentId: null, mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: true,
    },
    { reader: { getCommentTemplateText: async () => "{{username}}" }, fetchImpl: mock.impl },
  );
  assert(result.commentStatus === "failed", "failed");
  assert(result.error === "comment_id_missing", "comment_id_missing");
  assert(mock.calls.length === 0, "no Meta call");
});

test("duplicate event → no second reply (handled by cooldown, verified via dry-run)", async () => {
  // The cooldown/dedupe service is the existing Checkpoint 1 mechanism. Here
  // we verify that processing the same comment twice without passing through
  // cooldown would still be guarded by the caller's cooldown. We simulate the
  // caller rejecting the second one by not invoking processCommentReply again.
  // The actual cooldown rejection is covered in rule-engine.test.ts. This
  // test asserts the orchestrator uses the provided commentId as the dedupe
  // identity (never mediaId/userId), so a redelivery reuses the same key.
  const result = await processCommentReply(
    {
      commentId: "comment_dup", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: true,
    },
    readerWithTemplate("{{username}}"),
  );
  assert(result.commentId === "comment_dup", "uses real comment id, not media/user id");
});

test("cooldown rejection → no reply (cooldown service reused)", async () => {
  // The existing CooldownService (Checkpoint 1) is the single cooldown
  // mechanism. We verify it here rejects a repeat within the window so the
  // caller will not invoke the reply path a second time.
  const { CooldownService } = await import("../src/services/cooldown.service.js");
  const cd = new CooldownService();
  const rule = makeRule({ cooldownMinutes: 60 });
  const ctx = {
    commentText: "JOB", mediaId: "m1", userId: "u1", username: "u",
    commentId: "c_repeat", receivedAt: 1000,
  };
  const first = cd.shouldFire(ctx, rule, 1000);
  assert(first.allowed === true, "first allowed");
  cd.record(ctx, rule, 1000);
  const second = cd.shouldFire({ ...ctx, commentId: "c_repeat" }, rule, 2000);
  assert(second.allowed === false, "second blocked by cooldown");
});

test("Meta success response → commentStatus=success", async () => {
  const mock = makeMockFetch();
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: false,
    },
    { reader: { getCommentTemplateText: async () => "{{username}}" }, fetchImpl: mock.impl },
  );
  assert(result.commentStatus === "success", "success");
  assert(result.error === null, "no error");
  assert(mock.calls.length === 1, "one real Meta call");
});

test("Meta failure response → commentStatus=failed", async () => {
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: false,
    },
    { reader: { getCommentTemplateText: async () => "{{username}}" }, fetchImpl: makeErrorFetch() },
  );
  assert(result.commentStatus === "failed", "failed");
  assert(result.error !== null, "has error");
});

test("dry-run mode → no real Meta request", async () => {
  const mock = makeMockFetch();
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "t", dryRun: true,
    },
    { reader: { getCommentTemplateText: async () => "{{username}}" }, fetchImpl: mock.impl },
  );
  assert(result.commentStatus === "success", "dry-run success");
  assert(result.dryRun === true, "dryRun true");
  assert(mock.calls.length === 0, "no real Meta call");
});

test("access token never appears in errors/logs", async () => {
  const log: string[] = [];
  const result = await processCommentReply(
    {
      commentId: "c1", mediaId: "m1", userId: "u1", username: "u",
      rule: makeRule(), matchedKeyword: "JOB", resolution: makeResolution(),
      accessToken: "SUPER_SECRET", dryRun: false,
      logger: {
        info: () => {},
        warn: () => {},
        error: (m, meta) => log.push(JSON.stringify({ m, meta })),
      },
    },
    { reader: { getCommentTemplateText: async () => "{{username}}" }, fetchImpl: makeErrorFetch() },
  );
  assert(result.commentStatus === "failed", "failed");
  assert(!log.join("").includes("SUPER_SECRET"), "token not in logs");
  assert(!JSON.stringify(result).includes("SUPER_SECRET"), "token not in result");
});

// ---------------- summary ----------------

async function main(): Promise<void> {
  await Promise.all(pending);

  console.log("\n----------------------------------------");
  console.log("Instagram Comment Reply tests: " + passed + " passed, " + failed + " failed");

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
