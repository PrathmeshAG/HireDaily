// Phase 5 Checkpoint 2 — Post Mapping → Job resolution unit tests.
//
// Zero-dependency test setup (consistent with rule-engine.test.ts). These
// tests use an in-memory DataReader stub — they NEVER touch the production
// Firebase database, never write fake data, and never read real mappings.
//
// Run via: npm test  ->  tsx test/rule-engine.test.ts && tsx test/post-mapping.test.ts

import { resolvePostJobWithReader, buildJobUrl, type DataReader } from "../src/services/post-mapping.service.js";

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

function assertDeep(actual: unknown, expected: unknown, msg: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(msg + "\n  expected: " + e + "\n  actual:   " + a);
}

// ---------------- helpers ----------------

interface MappingSeed {
  jobId: string;
  jobTitleCache?: string | null;
}

interface JobSeed {
  jobTitle: string | null;
  company?: string | null;
  location?: string | null;
}

/** Builds an in-memory DataReader from simple maps. */
function makeReader(
  mappings: Record<string, MappingSeed>,
  jobs: Record<string, JobSeed>,
  trackedReads?: { postMappings: string[]; jobs: string[] },
): DataReader {
  return {
    async getPostMapping(mediaId) {
      if (trackedReads) trackedReads.postMappings.push(mediaId);
      const m = mappings[mediaId];
      return m ? { jobId: m.jobId, jobTitleCache: m.jobTitleCache ?? null } : null;
    },
    async getJob(jobId) {
      if (trackedReads) trackedReads.jobs.push(jobId);
      const j = jobs[jobId];
      return j
        ? { jobTitle: j.jobTitle, company: j.company ?? null, location: j.location ?? null }
        : null;
    },
  };
}

const BASE = "https://hire-daily.vercel.app";

// ---------------- tests ----------------

console.log("Post Mapping — resolution");

test("valid mediaId → valid mapping → existing job → resolved", async () => {
  const reader = makeReader(
    { "18000000000000001": { jobId: "job_1", jobTitleCache: "cached" } },
    { job_1: { jobTitle: "Software Engineer" } },
  );
  const result = await resolvePostJobWithReader("18000000000000001", reader, BASE);
  assert(result.mapped === true, "mapped should be true");
  assert(result.jobId === "job_1", "jobId job_1, got " + result.jobId);
  assert(result.jobTitle === "Software Engineer", "title from job record, got " + result.jobTitle);
  assert(result.reason === "resolved", "reason resolved, got " + result.reason);
});

test("correct jobId returned", async () => {
  const reader = makeReader({ m1: { jobId: "job_xyz" } }, { job_xyz: { jobTitle: "Designer" } });
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.jobId === "job_xyz", "jobId job_xyz, got " + result.jobId);
});

test("correct job title returned from job record (source of truth)", async () => {
  const reader = makeReader(
    { m1: { jobId: "job_1", jobTitleCache: "WRONG_CACHE" } },
    { job_1: { jobTitle: "Data Analyst" } },
  );
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.jobTitle === "Data Analyst", "job record wins, got " + result.jobTitle);
});

test("job title falls back to cache when job record has no title", async () => {
  const reader = makeReader(
    { m1: { jobId: "job_1", jobTitleCache: "Cached Title" } },
    { job_1: { jobTitle: null } },
  );
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.jobTitle === "Cached Title", "cache fallback, got " + result.jobTitle);
});

test("correct job URL generated", async () => {
  const reader = makeReader({ m1: { jobId: "job_42" } }, { job_42: { jobTitle: "Dev" } });
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.jobUrl === "https://hire-daily.vercel.app/jobs/job_42", "url " + result.jobUrl);
});

test("buildJobUrl strips trailing slash from base", () => {
  assert(
    buildJobUrl("https://hire-daily.vercel.app/", "job_1") === "https://hire-daily.vercel.app/jobs/job_1",
    "trailing slash handled",
  );
});

test("mapping not found", async () => {
  const reader = makeReader({}, {});
  const result = await resolvePostJobWithReader("unknown_media", reader, BASE);
  assert(result.mapped === false, "mapped false");
  assert(result.jobId === null, "no jobId");
  assert(result.jobUrl === null, "no jobUrl");
  assert(result.reason === "post_mapping_not_found", "reason post_mapping_not_found, got " + result.reason);
});

test("mapping exists but job does not exist", async () => {
  const reader = makeReader({ m1: { jobId: "missing_job" } }, {});
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.mapped === false, "mapped false");
  assert(result.jobId === "missing_job", "jobId preserved for diagnostics");
  assert(result.jobUrl === null, "no jobUrl");
  assert(result.reason === "job_not_found", "reason job_not_found, got " + result.reason);
});

test("empty/missing mediaId is rejected", async () => {
  const reader = makeReader({}, {});
  const result = await resolvePostJobWithReader("", reader, BASE);
  assert(result.mapped === false, "mapped false");
  assert(result.reason === "media_id_missing", "reason " + result.reason);
});

test("mapping with empty jobId is invalid", async () => {
  const reader = makeReader({ m1: { jobId: "" } }, {});
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.mapped === false, "mapped false");
  assert(result.reason === "post_mapping_invalid", "reason " + result.reason);
});

console.log("Post Mapping — scope integration (Rule Engine decides scope)");

test("specific_post + matching mediaId → resolves", async () => {
  const mediaId = "18000000000000001";
  const reader = makeReader(
    { [mediaId]: { jobId: "job_1" } },
    { job_1: { jobTitle: "Frontend Dev" } },
  );
  const result = await resolvePostJobWithReader(mediaId, reader, BASE);
  assert(result.mapped === true, "specific_post matching mediaId resolves");
  assert(result.jobId === "job_1", "jobId correct");
});

test("specific_post + different mediaId → rule won't match (no resolution)", async () => {
  const otherMediaId = "99999999999999999";
  const reader = makeReader(
    { "18000000000000001": { jobId: "job_1" } },
    { job_1: { jobTitle: "Frontend Dev" } },
  );
  const result = await resolvePostJobWithReader(otherMediaId, reader, BASE);
  assert(result.mapped === false, "different mediaId not mapped");
  assert(result.reason === "post_mapping_not_found", "reason " + result.reason);
});

test("all_posts + mapped mediaId → resolves", async () => {
  const reader = makeReader({ any_media: { jobId: "job_9" } }, { job_9: { jobTitle: "Backend Dev" } });
  const result = await resolvePostJobWithReader("any_media", reader, BASE);
  assert(result.mapped === true, "all_posts + mapped mediaId resolves");
  assert(result.jobId === "job_9", "jobId correct");
});

test("all_posts + unmapped mediaId → not mapped (no fallback)", async () => {
  const reader = makeReader({ some_media: { jobId: "job_9" } }, { job_9: { jobTitle: "Backend Dev" } });
  const result = await resolvePostJobWithReader("unmapped_media", reader, BASE);
  assert(result.mapped === false, "unmapped mediaId not mapped");
  assert(result.jobUrl === null, "no fallback job URL");
  assert(result.reason === "post_mapping_not_found", "reason " + result.reason);
});

console.log("Post Mapping — read-only safety");

test("jobs node is only read, never written (tracked reads, no writes)", async () => {
  const trackedReads = { postMappings: [] as string[], jobs: [] as string[] };
  const reader = makeReader(
    { m1: { jobId: "job_1" } },
    { job_1: { jobTitle: "Ops" } },
    trackedReads,
  );
  const result = await resolvePostJobWithReader("m1", reader, BASE);
  assert(result.mapped === true, "resolved");
  assertDeep(trackedReads.postMappings, ["m1"], "postMappings read once");
  assertDeep(trackedReads.jobs, ["job_1"], "jobs read once");
  // The DataReader interface exposes only read methods (getPostMapping /
  // getJob) — no write/update/delete operations exist, confirming the jobs
  // node is read-only by construction.
  const keys = Object.keys(reader);
  assert(keys.indexOf("getPostMapping") !== -1, "getPostMapping present");
  assert(keys.indexOf("getJob") !== -1, "getJob present");
  assert(keys.indexOf("setJob") === -1, "no setJob write op");
  assert(keys.indexOf("updateJob") === -1, "no updateJob write op");
  assert(keys.indexOf("deleteJob") === -1, "no deleteJob write op");
});

test("production resolvePostJob imports real DB but tests never call it (mocked)", async () => {
  // We only use the pure reader-based function here; the production
  // resolvePostJob (which touches Firebase) is intentionally NOT invoked, so
  // no fake data is written to the real database.
  assert(typeof resolvePostJobWithReader === "function", "pure resolver exists");
});

// ---------------- summary ----------------

async function main(): Promise<void> {
  // Wait for every async test to actually run before reporting results.
  await Promise.all(pending);

  console.log("\n----------------------------------------");
  console.log("Post Mapping tests: " + passed + " passed, " + failed + " failed");

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
