// Types mirror the approved Firebase RTDB schema for `automation/*`.
// UI-only for now — these are the shapes the mock service returns, and the
// same shapes a real Firebase/backend-backed service will return later.

export type Channel = "instagram" | "whatsapp" | "telegram" | "hiremind";

export type MappingStatus = "active" | "archived";

/**
 * Extra links delivered in the SAME DM as the primary job (max 4, so 5 total).
 * "job" = another Hire Daily job, "external" = any pasted http(s) link.
 */
export type ExtraLink =
  | { type: "job"; jobId: string; label: string | null }
  | { type: "external"; url: string; label: string };

export const MAX_TOTAL_LINKS = 5;

export interface PostMapping {
  id: string;
  channel: Channel;
  mediaId: string;
  instagramPostUrl: string;
  thumbnailUrl: string;
  companyName: string;
  jobTitle: string;
  jobId: string;
  status: MappingStatus;
  createdAt: number;
  /** Optional additional links; absent on legacy single-job mappings. */
  extraLinks?: ExtraLink[];
}

export type MatchType = "exact" | "contains";
export type RuleMode = "keyword" | "any_comment";
export type ReplyMode = "comment_only" | "dm_only" | "comment_and_dm";

export interface AutomationRule {
  id: string;
  channel: Channel;
  mode: RuleMode;
  keywords: string[];
  matchType: MatchType;
  scope: "all_posts" | "specific_post";
  postId: string | null;
  postLabel: string | null;
  commentTemplateId: string | null;
  /** Extra comment templates. One of main + extras is picked at random per reply. */
  commentTemplateIds?: string[];
  dmTemplateId: string | null;
  replyMode: ReplyMode;
  cooldownMinutes: number;
  activeFrom: number | null;
  activeUntil: number | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TemplateKind = "comment" | "dm";

export interface Template {
  id: string;
  kind: TemplateKind;
  channel: Channel;
  name: string;
  text: string;
  updatedAt: number;
}

export type FollowStatus = "unknown" | "follower" | "not_follower";

export interface AutomationUser {
  id: string;
  channel: Channel;
  username: string;
  avatarUrl: string;
  lastComment: string | null;
  lastDM: string | null;
  followStatus: FollowStatus;
  commentCount: number;
  dmCount: number;
  lastSeen: number;
  /** When this user first triggered the automation (unix ms). */
  firstSeen?: number;
}

export type LogType =
  | "comment_received"
  | "keyword_matched"
  | "comment_sent"
  | "dm_sent"
  | "error"
  | "retry";

export interface LogEntry {
  id: string;
  channel: Channel;
  type: LogType;
  username: string;
  detail: string;
  ruleKeyword: string | null;
  timestamp: number;
}

export interface DailyAnalytics {
  date: string; // yyyy-mm-dd
  commentsReceived: number;
  triggers: number;
  repliesSent: number;
  dmsSent: number;
  commentsFailed: number;
  dmsFailed: number;
  automationErrors: number;
  /** Follow-gate outcomes (already returned by the backend). */
  followVerified: number;
  followNotVerified: number;
  followUnsupported: number;
}

export interface KeywordStat {
  keyword: string;
  count: number;
}

export interface PostStat {
  postLabel: string;
  triggers: number;
  mediaId?: string;
  postUrl?: string | null;
}

export interface AutomationAnalytics {
  /** Unique users who triggered an automation. */
  users?: number;
  daily: DailyAnalytics[];
  topKeywords: KeywordStat[];
  topPosts: PostStat[];
}

export interface InstagramConnection {
  connected: boolean;
  username: string | null;
  accountType: string | null;
  tokenExpiresAt: number | null;
  /** Why the backend reports disconnected (e.g. token_invalid_or_expired). */
  reason?: string | null;
  metaErrorCode?: number | null;
}

export interface WebhookStatus {
  subscribed: boolean;
  lastEventAt: number | null;
  url: string;
}

export interface ApiStatus {
  ok: boolean;
  latencyMs: number | null;
  lastCheckedAt: number | null;
}

/** Safe status flags reported by the backend (never secrets). */
export interface SystemStatus {
  dryRun: boolean;
  firebaseConfigured: boolean;
  metaConfigured: boolean;
  webhookConfigured: boolean;
}

export interface TokenState {
  /** true = valid, false = rejected by Meta, null = unknown. */
  valid: boolean | null;
  /** Unix ms. Null when it never expires or is unknown. */
  expiresAt: number | null;
  neverExpires: boolean;
  dataAccessExpiresAt: number | null;
  method: "debug_token" | "probe" | "none";
  checkedAt: number;
  error: string | null;
  /** Where the expiry date came from: Meta itself, or a date saved by the admin. */
  expirySource?: "meta" | "manual" | null;
}

export interface AutomationSettings {
  instagram: InstagramConnection;
  webhook: WebhookStatus;
  api: ApiStatus;
  system?: SystemStatus;
  token?: TokenState;
  alerts?: { channels: ("telegram" | "email" | "webhook")[]; cronConfigured: boolean };
  /** enabled = TRACKING_BASE_URL is set. working = verified to point at this backend. */
  tracking?: { enabled: boolean; working?: boolean; problem?: string | null; detail?: string | null };
  safety?: { maxCommentsPerHour: number; maxDmsPerHour: number; delayMinMs: number; delayMaxMs: number };
}

// ---------- Update 4: health, retry, simulator, unmatched, clicks ----------

export interface MissingJobMapping {
  mediaId: string;
  label: string;
  primaryMissing: boolean;
  missingExtraJobIds: string[];
}

export interface HealthReport {
  token: TokenState;
  missingJobs: MissingJobMapping[];
  retryableFailures: number;
  unmatchedComments: number;
}

export interface RetryItem {
  commentId: string;
  userId: string | null;
  username: string | null;
  mediaId: string;
  ruleId: string;
  keyword: string | null;
  parts: ("comment" | "dm")[];
  lastError: string | null;
  lastFailedAt: number;
}

export interface RetryOutcome {
  commentId: string;
  comment: "success" | "failed" | "skipped" | null;
  dm: "success" | "failed" | "skipped" | null;
  error: string | null;
}

export interface DmPreviewResult {
  kind: "text" | "button" | "buttons" | "carousel";
  text: string;
  buttons: string[];
  /** 4-5 links: role as title, company and location as subtitle. */
  cards: { title: string; subtitle: string }[];
}

export interface SimulationResult {
  matched: boolean;
  reason: string;
  rule: { id: string; mode: string; keywords: string[]; replyMode: string; scope: string } | null;
  matchedKeyword: string | null;
  otherRules: { ruleId: string; active: boolean; scopeMatched: boolean; matched: boolean; keywords: string[] }[];
  mapping: { mapped: boolean; reason: string; links: { label: string; url: string }[]; title: string | null };
  willPostComment: boolean;
  willSendDm: boolean;
  comment: { variants: { id: string; text: string | null; error: string | null }[] };
  dm: DmPreviewResult | null;
  warnings: string[];
  dryRun: boolean;
}

export interface UnmatchedComment {
  id: string;
  commentId: string;
  text: string;
  username: string | null;
  mediaId: string | null;
  reason: string;
  timestamp: number;
}

export interface ClickStats {
  enabled: boolean;
  total: number;
  daily: { date: string; clicks: number }[];
  byPost: { mediaId: string; label: string; clicks: number; byLink: { index: number; clicks: number }[] }[];
}

export interface AlertSendResult {
  sent: string[];
  failed: string[];
  configured: string[];
}

export interface DashboardSummary {
  connected: boolean;
  totalMappings: number;
  activeRules: number;
  todaysComments: number;
  todaysDMs: number;
  failedAutomations: number;
}

// ---------- Manual send ----------

export interface ManualComment {
  commentId: string;
  text: string;
  username: string;
  userId: string | null;
  timestamp: number;
  status: { reply: "success" | "failed" | "none"; dm: "success" | "failed" | "none"; lastError: string | null };
}

export interface TimelineEntry {
  at: number;
  type: string;
  detail: string | null;
  error: string | null;
  mediaId: string | null;
  commentStatus: string | null;
  dmStatus: string | null;
}

export interface ManualLookup {
  comments: ManualComment[];
  timeline: TimelineEntry[];
  fetchError: string | null;
}

export interface ManualSendBody {
  action: "job" | "custom_dm" | "custom_reply";
  commentId: string;
  mediaId?: string;
  username?: string;
  userId?: string | null;
  commentText?: string;
  ruleId?: string;
  parts?: ("comment" | "dm")[];
  text?: string;
}

export interface ManualSendResult {
  ok: boolean;
  error?: string | null;
  message?: string;
  dryRun?: boolean;
  ruleId?: string;
  outcome?: { comment: string | null; dm: string | null; error: string | null };
}
