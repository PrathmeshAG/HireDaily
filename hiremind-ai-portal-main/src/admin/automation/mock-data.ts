import type {
  AutomationAnalytics,
  AutomationRule,
  AutomationSettings,
  AutomationUser,
  DailyAnalytics,
  LogEntry,
  PostMapping,
  Template,
} from "./types";

const DAY = 86400000;
const now = Date.now();

const companies = [
  { company: "Zynatra Tech", title: "Frontend Developer Intern" },
  { company: "Orbital Labs", title: "Data Analyst" },
  { company: "Fenwick Cloud", title: "DevOps Engineer" },
  { company: "Northbeam", title: "Java Backend Developer" },
  { company: "Quantalis", title: "SQL Developer" },
  { company: "Vertex Analytics", title: "Data Scientist" },
  { company: "Skyline Softworks", title: "React Native Developer" },
  { company: "Hazel Systems", title: "QA Engineer" },
  { company: "Bramble AI", title: "Machine Learning Engineer" },
  { company: "Coral Networks", title: "Cybersecurity Analyst" },
  { company: "Driftwood Studio", title: "UI/UX Designer" },
  { company: "Ironpeak", title: "Cloud Support Engineer" },
];

export const mockPostMappings: PostMapping[] = companies.map((c, i) => ({
  id: `map_${i + 1}`,
  channel: "instagram",
  mediaId: `1789234${(500 + i).toString().padStart(4, "0")}`,
  postUrl: `https://www.instagram.com/p/C${(i + 1).toString().padStart(3, "0")}xHireDaily/`,
  thumbnailUrl: "",
  companyName: c.company,
  jobTitle: c.title,
  jobId: `job_${i + 1}`,
  status: i === companies.length - 1 ? "archived" : "active",
  createdAt: now - (i + 1) * DAY * 1.3,
}));

export const mockTemplates: Template[] = [
  {
    id: "tpl_comment_1",
    kind: "comment",
    channel: "instagram",
    name: "Check DM — standard",
    text: "Thanks for your interest {{username}}! 📩 Check your DMs — we just sent you the link.",
    updatedAt: now - 4 * DAY,
  },
  {
    id: "tpl_comment_2",
    kind: "comment",
    channel: "instagram",
    name: "Check DM — short",
    text: "Sent you the details in DM! 🚀",
    updatedAt: now - 9 * DAY,
  },
  {
    id: "tpl_comment_3",
    kind: "comment",
    channel: "instagram",
    name: "Sold out / closed",
    text: "This one's closed now, but keep an eye on our page for the next drop!",
    updatedAt: now - 15 * DAY,
  },
  {
    id: "tpl_dm_1",
    kind: "dm",
    channel: "instagram",
    name: "Job link — standard",
    text: "Hey {{username}} 👋 Here's the role you asked about:\n\n{{title}} at {{company}} ({{location}})\n\n👉 {{jobLink}}\n\nGood luck!",
    updatedAt: now - 4 * DAY,
  },
  {
    id: "tpl_dm_2",
    kind: "dm",
    channel: "instagram",
    name: "Job link — short",
    text: "{{title}} @ {{company}} 👉 {{jobLink}}",
    updatedAt: now - 6 * DAY,
  },
  {
    id: "tpl_dm_3",
    kind: "dm",
    channel: "instagram",
    name: "Welcome + link",
    text: "Welcome to Hire Daily 🎉 Here's the job you asked about — {{jobLink}}. Follow us for daily drops!",
    updatedAt: now - 12 * DAY,
  },
];

export const mockRules: AutomationRule[] = [
  {
    id: "rule_1",
    channel: "instagram",
    mode: "keyword",
    keywords: ["JOB", "LINK", "APPLY"],
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
    createdAt: now - 20 * DAY,
    updatedAt: now - 2 * DAY,
  },
  {
id: "rule_2",
    channel: "instagram",
    mode: "keyword",
    keywords: ["SQL"],
    matchType: "exact",
    scope: "specific_post",
    postId: "map_5",
    postLabel: "SQL Developer — Quantalis",
    commentTemplateId: "tpl_comment_2",
    dmTemplateId: "tpl_dm_2",
    replyMode: "comment_and_dm",
    cooldownMinutes: 1440,
    activeFrom: null,
    activeUntil: null,
    active: true,
    createdAt: now - 10 * DAY,
    updatedAt: now - 1 * DAY,
  },
  {
id: "rule_3",
    channel: "instagram",
    mode: "keyword",
    keywords: ["DA", "DATA"],
    matchType: "contains",
    scope: "specific_post",
    postId: "map_2",
    postLabel: "Data Analyst — Orbital Labs",
    commentTemplateId: "tpl_comment_1",
    dmTemplateId: "tpl_dm_1",
    replyMode: "dm_only",
    cooldownMinutes: 720,
    activeFrom: null,
    activeUntil: null,
    active: true,
    createdAt: now - 8 * DAY,
    updatedAt: now - 8 * DAY,
  },
  {
id: "rule_4",
    channel: "instagram",
    mode: "keyword",
    keywords: ["INTERN"],
    matchType: "contains",
    scope: "specific_post",
    postId: "map_1",
    postLabel: "Frontend Developer Intern — Zynatra Tech",
    commentTemplateId: "tpl_comment_1",
    dmTemplateId: "tpl_dm_1",
    replyMode: "comment_and_dm",
    cooldownMinutes: 1440,
    activeFrom: now - 5 * DAY,
    activeUntil: now + 9 * DAY,
    active: true,
    createdAt: now - 5 * DAY,
    updatedAt: now - 5 * DAY,
  },
  {
id: "rule_5",
    channel: "instagram",
    mode: "keyword",
    keywords: ["ML", "AI"],
    matchType: "contains",
    scope: "specific_post",
    postId: "map_9",
    postLabel: "Machine Learning Engineer — Bramble AI",
    commentTemplateId: "tpl_comment_3",
    dmTemplateId: null,
    replyMode: "comment_only",
    cooldownMinutes: 60,
    activeFrom: null,
    activeUntil: null,
    active: false,
    createdAt: now - 30 * DAY,
    updatedAt: now - 25 * DAY,
  },
];

const usernames = [
  "aditi.codes", "rohan_dev99", "priya.tech", "sam_builds", "neha.sql",
  "arjun.ml", "kavya_ux", "vikram.cloud", "isha_qa", "dev_yash",
  "meera.react", "karan.data",
];

export const mockUsers: AutomationUser[] = usernames.map((u, i) => ({
  id: `user_${i + 1}`,
  channel: "instagram" as const,
  username: u,
  avatarUrl: "",
  lastComment: i % 4 === 0 ? null : "job pls 🙏",
  lastDM: i % 3 === 0 ? null : "sent",
  followStatus: i % 5 === 0 ? "follower" as const : i % 5 === 1 ? "not_follower" as const : "unknown" as const,
  commentCount: Math.max(1, Math.floor(Math.random() * 6)),
  dmCount: Math.max(0, Math.floor(Math.random() * 4)),
  lastSeen: now - Math.floor(Math.random() * 6) * DAY - Math.floor(Math.random() * 20000000),
})).sort((a, b) => b.lastSeen - a.lastSeen);

const logTypes: LogEntry["type"][] = [
  "comment_received", "keyword_matched", "comment_sent", "dm_sent", "error", "retry",
];
const logDetails: Record<LogEntry["type"], string[]> = {
  comment_received: ["New comment on Frontend Developer Intern post", "New comment on SQL Developer post"],
  keyword_matched: ["Matched keyword \"JOB\" → rule_1", "Matched keyword \"SQL\" → rule_2"],
  comment_sent: ["Auto-reply posted successfully", "Reply posted (template: Check DM — standard)"],
  dm_sent: ["DM delivered with job link", "DM delivered (template: Job link — standard)"],
  error: ["Instagram API rate limit hit", "DM failed — outside 24h messaging window"],
  retry: ["Retrying failed DM (attempt 2/3)", "Retrying after temporary Graph API error"],
};

export const mockLogs: LogEntry[] = Array.from({ length: 42 }, (_, i) => {
  const type = logTypes[i % logTypes.length];
  const details = logDetails[type];
  return {
    id: `log_${i + 1}`,
    channel: "instagram" as const,
    type,
    username: usernames[i % usernames.length],
    detail: details[i % details.length],
    ruleKeyword: type === "keyword_matched" || type === "comment_sent" || type === "dm_sent"
      ? (i % 2 === 0 ? "JOB" : "SQL")
      : null,
    timestamp: now - i * 1800000 - Math.floor(Math.random() * 500000),
  };
}).sort((a, b) => b.timestamp - a.timestamp);

function buildDailyAnalytics(): DailyAnalytics[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const triggers = 8 + Math.floor(Math.random() * 22);
    const dmsSent = Math.max(0, triggers - Math.floor(Math.random() * 5));
    return {
      date: d.toISOString().slice(0, 10),
      triggers,
      repliesSent: triggers,
      dmsSent,
    };
  });
}

export const mockAnalytics: AutomationAnalytics = {
  daily: buildDailyAnalytics(),
  topKeywords: [
    { keyword: "JOB", count: 186 },
    { keyword: "SQL", count: 94 },
    { keyword: "DATA", count: 71 },
    { keyword: "INTERN", count: 58 },
    { keyword: "AI", count: 33 },
  ],
  topPosts: [
    { postLabel: "Frontend Developer Intern — Zynatra Tech", triggers: 142 },
    { postLabel: "SQL Developer — Quantalis", triggers: 94 },
    { postLabel: "Data Analyst — Orbital Labs", triggers: 71 },
    { postLabel: "Machine Learning Engineer — Bramble AI", triggers: 45 },
    { postLabel: "DevOps Engineer — Fenwick Cloud", triggers: 28 },
  ],
};

export const mockSettings: AutomationSettings = {
  instagram: {
    connected: true,
    username: "hire_daily",
    accountType: "Business",
    tokenExpiresAt: now + 47 * DAY,
  },
  webhook: {
    subscribed: true,
    lastEventAt: now - 12 * 60000,
    url: "https://api.hiredaily.app/webhook/instagram",
  },
  api: {
    ok: true,
    latencyMs: 214,
    lastCheckedAt: now - 5 * 60000,
  },
};
