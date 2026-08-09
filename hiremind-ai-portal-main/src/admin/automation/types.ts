// Types mirror the approved Firebase RTDB schema for `automation/*`.
// UI-only for now — these are the shapes the mock service returns, and the
// same shapes a real Firebase/backend-backed service will return later.

export type Channel = "instagram" | "whatsapp" | "telegram" | "hiremind";

export type MappingStatus = "active" | "archived";

export interface PostMapping {
  id: string;
  channel: Channel;
  mediaId: string;
  postUrl: string;
  thumbnailUrl: string;
  companyName: string;
  jobTitle: string;
  jobId: string;
  status: MappingStatus;
  createdAt: number;
}

export type MatchType = "exact" | "contains";
export type ReplyMode = "comment_only" | "dm_only" | "comment_and_dm";

export interface AutomationRule {
  id: string;
  channel: Channel;
  keywords: string[];
  matchType: MatchType;
  scope: "all_posts" | "specific_post";
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
  triggers: number;
  repliesSent: number;
  dmsSent: number;
}

export interface KeywordStat {
  keyword: string;
  count: number;
}

export interface PostStat {
  postLabel: string;
  triggers: number;
}

export interface AutomationAnalytics {
  daily: DailyAnalytics[];
  topKeywords: KeywordStat[];
  topPosts: PostStat[];
}

export interface InstagramConnection {
  connected: boolean;
  username: string | null;
  accountType: string | null;
  tokenExpiresAt: number | null;
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

export interface AutomationSettings {
  instagram: InstagramConnection;
  webhook: WebhookStatus;
  api: ApiStatus;
}

export interface DashboardSummary {
  connected: boolean;
  totalMappings: number;
  activeRules: number;
  todaysComments: number;
  todaysDMs: number;
  failedAutomations: number;
}
