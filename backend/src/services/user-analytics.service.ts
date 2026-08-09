// Phase 5 Checkpoint 5 — User tracking + daily analytics + follow-status.
//
// This module is deliberately split into a pure, framework-free core (injected
// stores) and thin production bindings wired to Firebase Realtime Database in
// firebase-admin.service.ts. The pure core is unit-tested with in-memory
// stores — no Firebase, no real Meta calls, no secrets, no fake production
// data.
//
// Canonical Firebase nodes:
//   automation/users/{instagramUserId}/
//   automation/analytics/daily/{YYYY-MM-DD}/
//
// Jobs/* is NEVER written here (read-only everywhere).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical user record stored under automation/users/{userId}. */
export interface UserRecord {
  userId: string;
  username: string | null;
  firstSeenAt: number;
  lastActivityAt: number;
  commentCount: number;
  dmCount: number;
  active: boolean;
}

/** Daily analytics counters stored under automation/analytics/daily/{date}. */
export interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  commentsReceived: number;
  commentsMatched: number;
  commentsSent: number;
  commentsFailed: number;
  dmsSent: number;
  dmsFailed: number;
  followVerified: number;
  followNotVerified: number;
  followUnsupported: number;
  automationErrors: number;
}

export type AnalyticField = keyof Omit<DailyAnalytics, "date">;

/** Follow-verification result. */
export type FollowStatus = "verified" | "not_verified" | "unsupported" | "unknown";

export interface FollowCheckResult {
  status: FollowStatus;
  reason: string | null;
}

/** A single automation event's tracking outcome (Comment + DM + follow). */
export interface TrackingEvent {
  userId: string | null;
  username: string | null;
  now: number;
  commentReceived: boolean;
  matched: boolean;
  commentReplyStatus: "pending" | "success" | "failed" | "skipped" | null;
  dmStatus: "pending" | "success" | "failed" | "skipped" | null;
  followStatus: FollowStatus | null;
  automationError: boolean;
  dryRun: boolean;
}

// ---------------------------------------------------------------------------
// Injected data-access contracts
// ---------------------------------------------------------------------------

/** Injected data-access contract for user records (atomic, no full overwrite). */
export interface UserStore {
  read(userId: string): Promise<UserRecord | null>;
  /** Full write used ONLY on first sight (creates the canonical record). */
  create(record: UserRecord): Promise<void>;
  /**
   * Atomic partial update: bumps lastActivityAt and increments the given
   * counters WITHOUT rewriting the whole user object.
   */
  touch(userId: string, now: number, counters: { commentIncrement: number; dmIncrement: number }): Promise<void>;
}

/** Injected data-access contract for daily analytics. */
export interface AnalyticsStore {
  increment(date: string, field: AnalyticField, by: number): Promise<void>;
  read(date: string): Promise<DailyAnalytics | null>;
}

// ---------------------------------------------------------------------------
// Pure domain logic (framework-free, testable with in-memory stores)
// ---------------------------------------------------------------------------

/** Builds the YYYY-MM-DD date key (server-local time) for a given timestamp. */
export function dateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Records a user activity event. Creates the user on first sight (preserving
 * firstSeenAt), or atomically updates the existing record WITHOUT overwriting
 * the whole object (preserves firstSeenAt, bumps lastActivityAt, increments
 * counters). Skips entirely when userId is missing. Counters are only bumped
 * for real (non-dry-run) processed events.
 */
export async function recordUserActivity(
  store: UserStore,
  input: {
    userId: string;
    username: string | null;
    now: number;
    commentProcessed?: boolean;
    dmSent?: boolean;
  },
): Promise<UserRecord | null> {
  if (!input.userId) return null;
  const existing = await store.read(input.userId);
  const now = input.now;
  const commentIncrement = input.commentProcessed ? 1 : 0;
  const dmIncrement = input.dmSent ? 1 : 0;

  if (!existing) {
    const record: UserRecord = {
      userId: input.userId,
      username: input.username,
      firstSeenAt: now,
      lastActivityAt: now,
      commentCount: commentIncrement,
      dmCount: dmIncrement,
      active: true,
    };
    await store.create(record);
    return record;
  }

  // Atomic partial update — do NOT overwrite the whole object.
  await store.touch(input.userId, now, { commentIncrement, dmIncrement });
  return {
    ...existing,
    username: input.username ?? existing.username,
    lastActivityAt: now,
    commentCount: existing.commentCount + commentIncrement,
    dmCount: existing.dmCount + dmIncrement,
    active: true,
  };
}

/**
 * Increments a daily analytics counter, creating the node if needed. Never
 * modifies historical dates (only ever writes the provided `date` node).
 */
export async function incrementDailyAnalytics(
  store: AnalyticsStore,
  date: string,
  field: AnalyticField,
): Promise<void> {
  await store.increment(date, field, 1);
}

/**
 * Determines whether a commenter-follows-account check is supported by the
 * current Meta configuration.
 *
 * Meta Graph API capability note: checking whether a COMMENTER follows the
 * Hire Daily Instagram account is NOT supported by the current app/account
 * configuration (it would require `instagram_followers`/`insights` scopes and
 * a connected Business/Professional account with those insights, which the
 * current token does not confirm). To avoid faking success, we return
 * "unsupported" unless a capability flag is explicitly provided.
 */
export function checkFollowCapability(opts: { followVerificationSupported?: boolean } = {}): FollowCheckResult {
  if (opts.followVerificationSupported === true) {
    // Capability is only reported when the caller has genuinely confirmed a
    // working Meta API endpoint + permission. The actual API call would live
    // in a dedicated service method (not server.ts).
    return { status: "unknown", reason: "follow_verification_enabled" };
  }
  return { status: "unsupported", reason: "follow_verification_unsupported" };
}

/** Builds a DailyAnalytics record initialized to zero for a given date. */
export function emptyDailyAnalytics(date: string): DailyAnalytics {
  return {
    date,
    commentsReceived: 0,
    commentsMatched: 0,
    commentsSent: 0,
    commentsFailed: 0,
    dmsSent: 0,
    dmsFailed: 0,
    followVerified: 0,
    followNotVerified: 0,
    followUnsupported: 0,
    automationErrors: 0,
  };
}

/**
 * Applies a full tracking event to the user + analytics stores. This is the
 * single source of truth for the analytics definitions and user counters.
 *
 * Dry-run is honored: simulated comment/DM sends are NOT counted as real
 * sends (commentsSent/dmsSent/commentsFailed/dmsFailed stay put). Observation
 * counters (commentsReceived/commentsMatched) and followUnsupported still
 * reflect what actually happened.
 */
export async function applyTracking(
  userStore: UserStore,
  analyticsStore: AnalyticsStore,
  event: TrackingEvent,
): Promise<void> {
  const date = dateKey(event.now);

  if (event.commentReceived) {
    await incrementDailyAnalytics(analyticsStore, date, "commentsReceived");
  }
  if (event.matched) {
    await incrementDailyAnalytics(analyticsStore, date, "commentsMatched");
  }
  if (!event.dryRun) {
    if (event.commentReplyStatus === "success") {
      await incrementDailyAnalytics(analyticsStore, date, "commentsSent");
    } else if (event.commentReplyStatus === "failed") {
      await incrementDailyAnalytics(analyticsStore, date, "commentsFailed");
    }
    if (event.dmStatus === "success") {
      await incrementDailyAnalytics(analyticsStore, date, "dmsSent");
    } else if (event.dmStatus === "failed") {
      await incrementDailyAnalytics(analyticsStore, date, "dmsFailed");
    }
  }

  if (event.followStatus === "verified") {
    await incrementDailyAnalytics(analyticsStore, date, "followVerified");
  } else if (event.followStatus === "not_verified") {
    await incrementDailyAnalytics(analyticsStore, date, "followNotVerified");
  } else if (event.followStatus === "unsupported") {
    await incrementDailyAnalytics(analyticsStore, date, "followUnsupported");
  }

  if (event.automationError) {
    await incrementDailyAnalytics(analyticsStore, date, "automationErrors");
  }

  if (event.userId) {
    await recordUserActivity(userStore, {
      userId: event.userId,
      username: event.username,
      now: event.now,
      commentProcessed: event.commentReceived && !event.dryRun,
      dmSent: event.dmStatus === "success" && !event.dryRun,
    });
  }
}

// ---------------------------------------------------------------------------
// Production binding (Firebase-backed stores)
// ---------------------------------------------------------------------------

/**
 * Builds a UserStore backed by Firebase Realtime Database. Lazy-imports the
 * admin bindings so unit tests never connect to Firebase.
 */
export async function makeFirebaseUserStore(): Promise<UserStore> {
  const { readUserRecord, writeUserRecord, touchUserRecord } = await import("./firebase-admin.service.js");
  return {
    async read(userId) {
      return readUserRecord(userId);
    },
    async create(record) {
      await writeUserRecord(record);
    },
    async touch(userId, now, counters) {
      await touchUserRecord(userId, now, counters);
    },
  };
}

/**
 * Builds an AnalyticsStore backed by Firebase Realtime Database. Lazy-imports
 * the admin bindings so unit tests never connect to Firebase.
 */
export async function makeFirebaseAnalyticsStore(): Promise<AnalyticsStore> {
  const { incrementDailyAnalyticsField } = await import("./firebase-admin.service.js");
  return {
    async increment(date, field) {
      await incrementDailyAnalyticsField(date, field);
    },
    async read(date) {
      const { readDailyAnalytics } = await import("./firebase-admin.service.js");
      return readDailyAnalytics(date);
    },
  };
}
