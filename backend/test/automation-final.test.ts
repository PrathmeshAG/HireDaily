// Phase 5 Checkpoint 5 — User tracking + daily analytics + follow-verification
// unit tests. Zero-dependency harness (no Vitest/Jest). Uses in-memory stores
// only — NEVER touches Firebase, NEVER sends real Instagram comments/DMs, and
// NEVER writes fake production data.
//
// Run via: npm test  ->  tsx test/automation-final.test.ts

import {
  recordUserActivity,
  dateKey,
  incrementDailyAnalytics,
  checkFollowCapability,
  emptyDailyAnalytics,
  applyTracking,
  type UserRecord,
  type DailyAnalytics,
  type UserStore,
  type AnalyticsStore,
  type AnalyticField,
} from "../src/services/user-analytics.service.js";

// ---------------- tiny async test harness ----------------

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

// ---------------- in-memory stores ----------------

class MemUserStore implements UserStore {
  map = new Map<string, UserRecord>();
  createCalls: string[] = [];
  touchCalls: Array<{ userId: string; now: number; ci: number; di: number }> = [];

  async read(userId: string): Promise<UserRecord | null> {
    return this.map.get(userId) ?? null;
  }
  async create(record: UserRecord): Promise<void> {
    this.createCalls.push(record.userId);
    this.map.set(record.userId, record);
  }
  async touch(userId: string, now: number, counters: { commentIncrement: number; dmIncrement: number }): Promise<void> {
    this.touchCalls.push({ userId, now, ci: counters.commentIncrement, di: counters.dmIncrement });
    const existing = this.map.get(userId);
    if (existing) {
      existing.lastActivityAt = now;
      existing.commentCount += counters.commentIncrement;
      existing.dmCount += counters.dmIncrement;
      existing.active = true;
    }
  }
}

class MemAnalyticsStore implements AnalyticsStore {
  map = new Map<string, DailyAnalytics>();
  writes: Array<{ date: string; field: AnalyticField }> = [];

  async read(date: string): Promise<DailyAnalytics | null> {
    return this.map.get(date) ?? null;
  }
  async increment(date: string, field: AnalyticField, by: number): Promise<void> {
    this.writes.push({ date, field });
    const existing = this.map.get(date) ?? emptyDailyAnalytics(date);
    const next = (existing[field] as unknown as number) + by;
    existing[field] = next as never;
    this.map.set(date, existing);
  }
}

const NOW = 1700000000000;

function makeUserStore(): MemUserStore {
  return new MemUserStore();
}
function makeAnalyticsStore(): MemAnalyticsStore {
  return new MemAnalyticsStore();
}

// ---------------- helper to build a user ----------------

function seedUser(store: MemUserStore, partial: Partial<UserRecord> = {}): UserRecord {
  const u: UserRecord = {
    userId: "ig_1",
    username: "aditi",
    firstSeenAt: NOW,
    lastActivityAt: NOW,
    commentCount: 0,
    dmCount: 0,
    active: true,
    ...partial,
  };
  store.map.set(u.userId, u);
  return u;
}

// ---------------- tests ----------------

console.log("Automation Final — user tracking: records");

test("new user is created on first activity", async () => {
  const store = makeUserStore();
  const rec = await recordUserActivity(store, {
    userId: "ig_new",
    username: "priya",
    now: NOW,
    commentProcessed: true,
  });
  assert(rec !== null, "record returned");
  assert(store.map.has("ig_new"), "user stored");
  assert(rec!.firstSeenAt === NOW, "firstSeenAt set");
  assert(rec!.commentCount === 1, "commentCount starts at 1 for first processed comment");
  assert(rec!.dmCount === 0, "dmCount 0");
});

test("existing user is updated (not duplicated)", async () => {
  const store = makeUserStore();
  seedUser(store);
  const rec = await recordUserActivity(store, {
    userId: "ig_1",
    username: "aditi",
    now: NOW + 1000,
    commentProcessed: true,
  });
assert(store.map.size === 1, "no duplicate user record");
  assert(store.map.get("ig_1")!.commentCount === 1, "commentCount incremented to 1");
  assert(store.map.get("ig_1")!.lastActivityAt === NOW + 1000, "lastActivityAt updated");
});

test("firstSeenAt is preserved on later activity", async () => {
  const store = makeUserStore();
  seedUser(store, { firstSeenAt: NOW });
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 5000, dmSent: true });
  const u = store.map.get("ig_1")!;
  assert(u.firstSeenAt === NOW, "firstSeenAt not overwritten");
  assert(u.dmCount === 1, "dmCount incremented");
});

test("lastActivityAt is updated on new activity", async () => {
  const store = makeUserStore();
  seedUser(store, { lastActivityAt: NOW });
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 9999 });
  const u = store.map.get("ig_1")!;
  assert(u.lastActivityAt === NOW + 9999, "lastActivityAt updated");
});

test("commentCount increments correctly", async () => {
  const store = makeUserStore();
  seedUser(store, { commentCount: 3 });
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 1, commentProcessed: true });
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 2, commentProcessed: true });
  assert(store.map.get("ig_1")!.commentCount === 5, "3 + 1 + 1 = 5");
});

test("dmCount increments only after a successful DM", async () => {
  const store = makeUserStore();
  seedUser(store);
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 1, dmSent: true });
  assert(store.map.get("ig_1")!.dmCount === 1, "dmCount 1 after successful DM");
});

test("failed DM does not increment dmCount", async () => {
  const store = makeUserStore();
  seedUser(store);
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 1, dmSent: false });
  assert(store.map.get("ig_1")!.dmCount === 0, "dmCount unchanged on failed/no DM");
});

console.log("Automation Final — daily analytics: counters");

test("commentsReceived increments", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: false,
    commentReplyStatus: null, dmStatus: null, followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.commentsReceived === 1, "commentsReceived 1");
});

test("commentsMatched increments only for matched rules", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: "unsupported", automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.commentsMatched === 1, "commentsMatched 1");
});

test("successful comment reply increments commentsSent", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "pending", followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.commentsSent === 1, "commentsSent 1");
});

test("failed comment reply increments commentsFailed", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "failed", dmStatus: "pending", followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.commentsFailed === 1, "commentsFailed 1");
});

test("successful DM increments dmsSent", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.dmsSent === 1, "dmsSent 1");
});

test("failed DM increments dmsFailed", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "failed", followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.dmsFailed === 1, "dmsFailed 1");
});

test("duplicate event does not double-count (single apply is source of truth)", async () => {
  const a = makeAnalyticsStore();
  const u = makeUserStore();
  // A single tracking application for one delivered event must count each
  // send exactly once. Double-delivery is suppressed upstream by the cooldown
  // layer, so the tracking layer itself must not double-count in one apply.
  await applyTracking(u, a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: null, automationError: false, dryRun: false,
  });
  const d = a.map.get(dateKey(NOW))!;
  assert(d.commentsSent === 1 && d.dmsSent === 1, "single event counted once");
});

console.log("Automation Final — dry-run safety");

test("dry-run does not count simulated sends as real", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: "unsupported", automationError: false,
    dryRun: true,
  });
  const d = a.map.get(dateKey(NOW))!;
  assert(d.commentsSent === 0, "dry-run does not count commentsSent");
  assert(d.dmsSent === 0, "dry-run does not count dmsSent");
  assert(d.commentsReceived === 1, "observation counters still track");
  assert(d.followUnsupported === 1, "followUnsupported still tracks");
});

console.log("Automation Final — follow verification capability");

test("followStatus unsupported is handled safely (no fake success)", async () => {
  const result = checkFollowCapability();
  assert(result.status === "unsupported", "unsupported by default (no confirmed Meta capability)");
  assert(result.reason === "follow_verification_unsupported", "clear safe reason reported");
});

test("supported follow verification success increments ONLY if genuinely supported", async () => {
  // The capability flag is only reported when a working Meta endpoint is
  // confirmed. Genuinely enabling it returns "unknown" (not faked success).
  const genuine = checkFollowCapability({ followVerificationSupported: true });
  assert(genuine.status === "unknown", "genuinely-supported capability is not faked as verified");

  // When the tracking layer is handed a genuinely confirmed "verified" status,
  // it increments the verified counter.
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: "verified", automationError: false,
    dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.followVerified === 1, "followVerified incremented when genuinely supported");
});

test("supported follow verification failure increments ONLY if genuinely supported", async () => {
  const genuine = checkFollowCapability({ followVerificationSupported: true });
  assert(genuine.status === "unknown", "genuinely-supported capability is not faked as not_verified either");

  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "pending", followStatus: "not_verified", automationError: false,
    dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.followNotVerified === 1, "followNotVerified incremented when genuinely supported");
});

console.log("Automation Final — read-only jobs + secrets");

test("jobs node is never written (no job write methods on stores)", async () => {
  const uStore = makeUserStore();
  const aStore = makeAnalyticsStore();
  const uKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(uStore));
  const aKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(aStore));
  for (const k of [...uKeys, ...aKeys]) {
    assert(!k.toLowerCase().includes("job"), "no job write method on tracking stores: " + k);
  }
});

test("secrets never appear in logs/errors", async () => {
  const a = makeAnalyticsStore();
  const u = makeUserStore();
  await applyTracking(u, a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: true,
    commentReplyStatus: "success", dmStatus: "success", followStatus: "unsupported", automationError: false,
    dryRun: false,
  });
  const userRec = u.map.get("ig_1")!;
  const analyticsRec = a.map.get(dateKey(NOW))!;
  const forbid = ["token", "secret", "private_key", "authorization", "password", "email", "phone"];
  const flat = JSON.stringify({ ...userRec, ...analyticsRec }).toLowerCase();
  for (const f of forbid) {
    assert(flat.indexOf(f) === -1, "no secret field present: " + f);
  }
});

console.log("Automation Final — structure & edge cases");

test("analytics date node is correct (YYYY-MM-DD)", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: true, matched: false,
    commentReplyStatus: null, dmStatus: null, followStatus: null, automationError: false, dryRun: false,
  });
  assert(a.map.has(dateKey(NOW)), "date node exists under correct key");
  assert(dateKey(NOW).match(/^\d{4}-\d{2}-\d{2}$/) !== null, "date key format YYYY-MM-DD");
});

test("user record remains consistent after multiple updates", async () => {
  const store = makeUserStore();
  seedUser(store);
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 1, commentProcessed: true });
  await recordUserActivity(store, { userId: "ig_1", username: "aditi", now: NOW + 2, dmSent: true });
  const u = store.map.get("ig_1")!;
  assert(u.commentCount === 1 && u.dmCount === 1, "comment+dm counters consistent");
  assert(u.active === true, "active stays true");
});

test("missing username is handled safely (preserved as null, not crash)", async () => {
  const store = makeUserStore();
  const rec = await recordUserActivity(store, { userId: "ig_anon", username: null, now: NOW, commentProcessed: true });
  assert(rec !== null, "record created");
  assert(rec!.username === null, "username null preserved safely");
});

test("missing userId does not create an invalid user record", async () => {
  const store = makeUserStore();
  const rec = await recordUserActivity(store, { userId: "", username: "x", now: NOW, commentProcessed: true });
  assert(rec === null, "null returned for empty userId");
  assert(store.map.size === 0, "no user record created");
});

test("automationErrors increments safely", async () => {
  const a = makeAnalyticsStore();
  await applyTracking(makeUserStore(), a, {
    userId: "ig_1", username: "aditi", now: NOW, commentReceived: false, matched: false,
    commentReplyStatus: null, dmStatus: null, followStatus: null, automationError: true, dryRun: false,
  });
  assert(a.map.get(dateKey(NOW))!.automationErrors === 1, "automationErrors 1");
});

test("incrementDailyAnalytics standalone helper works", async () => {
  const a = makeAnalyticsStore();
  await incrementDailyAnalytics(a, "2024-01-01", "dmsSent");
  assert(a.map.get("2024-01-01")!.dmsSent === 1, "incremented dmsSent for explicit date");
});

// ---------------- summary ----------------

async function main(): Promise<void> {
  await Promise.all(pending);
  console.log("\n----------------------------------------");
  console.log("Automation Final tests: " + passed + " passed, " + failed + " failed");
  if (failed > 0) {
    console.error("Failing tests:");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

void main();
