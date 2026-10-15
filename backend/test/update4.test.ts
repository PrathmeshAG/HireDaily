import "./setup-env.js";
// Update 4 — alerts, token health, retry selection, simulator, summary,
// missing jobs, click tracking, rate guard. In-memory stubs only.

import { fetchPostComments, commentStatuses, userTimeline, validateCustomText } from "../src/services/manual-send.service.js";
import { replyToComment, isTransientMetaError } from "../src/services/instagram.service.js";
import { sendAlert, getConfiguredChannels } from "../src/services/notifier.service.js";
import { checkMetaToken, isMetaAuthError, daysUntil } from "../src/services/token-health.service.js";
import { getEffectiveTokenState } from "../src/services/token-status.service.js";
import { buildDailySummary, EMPTY_DAY } from "../src/services/summary.service.js";
import { selectRetryable } from "../src/services/retry.service.js";
import { simulateComment, buildDmPreview } from "../src/services/simulator.service.js";
import { findMissingJobMappings } from "../src/services/health-report.service.js";
import { trackingBaseUrl, buildTrackedUrl, isCrawlerUserAgent, summarizeClicks, lastDates, verifyTrackingBase, getTrackingCheck, resetTrackingCheckCache } from "../src/services/click-tracking.service.js";
import { capsFromEnv, delayRangeFromEnv, randomDelayMs } from "../src/services/rate-guard.service.js";
import { cardElement, sendDirectMessage } from "../src/services/instagram.service.js";
import { resolvePostJobWithReader, type DataReader } from "../src/services/post-mapping.service.js";
import type { RawLog } from "../src/services/firebase-admin.service.js";
import type { RuleEngineRule } from "../src/types/rule-engine.js";
import type { PostJobResolution } from "../src/services/post-mapping.service.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];
const pending: Promise<void>[] = [];
function test(name: string, fn: () => Promise<void> | void): void {
  pending.push(
    Promise.resolve().then(fn).then(() => { passed++; console.log("  ✓ " + name); }).catch((err: unknown) => {
      failed++; failures.push(name);
      console.error("  ✗ " + name); console.error("    " + (err instanceof Error ? err.message : String(err)));
    }),
  );
}
function assert(c: boolean, m: string): void { if (!c) throw new Error(m); }

function fetchStub(responses: { ok?: boolean; status?: number; body?: unknown }[]) {
  const calls: { url: string; body: any; headers: any }[] = [];
  let i = 0;
  const impl = (async (url: string, init?: any) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : null, headers: init?.headers });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? (r.ok === false ? 400 : 200) });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

console.log("Notifier");
test("no channels configured is a harmless no-op", async () => {
  const { calls, impl } = fetchStub([{}]);
  const r = await sendAlert({ title: "t", body: "b" }, { fetchImpl: impl, values: {} as NodeJS.ProcessEnv });
  assert(r.configured.length === 0 && r.sent.length === 0 && calls.length === 0, "nothing sent");
});
test("telegram + email + webhook are each used when configured, secrets stay out of the result", async () => {
  const values = {
    TELEGRAM_BOT_TOKEN: "123:ABC", TELEGRAM_CHAT_ID: "99",
    RESEND_API_KEY: "re_secret", ALERT_EMAIL_TO: "a@x.com, b@x.com",
    ALERT_WEBHOOK_URL: "https://hooks.example.com/x",
  } as unknown as NodeJS.ProcessEnv;
  assert(getConfiguredChannels(values).join() === "telegram,email,webhook", "channels");
  const { calls, impl } = fetchStub([{}]);
  const r = await sendAlert({ title: "Title", body: "Body" }, { fetchImpl: impl, values });
  assert(r.sent.length === 3 && r.failed.length === 0, "all sent");
  const tg = calls.find((c) => c.url.includes("api.telegram.org"))!;
  assert(tg.body.chat_id === "99" && tg.body.text.includes("Title"), "telegram payload");
  const mail = calls.find((c) => c.url.includes("resend.com"))!;
  assert(Array.isArray(mail.body.to) && mail.body.to.length === 2 && mail.headers.Authorization === "Bearer re_secret", "email payload");
  assert(!JSON.stringify(r).includes("re_secret") && !JSON.stringify(r).includes("123:ABC"), "no secrets in result");
});
test("a failing channel is reported but never throws", async () => {
  const values = { TELEGRAM_BOT_TOKEN: "1:a", TELEGRAM_CHAT_ID: "1" } as unknown as NodeJS.ProcessEnv;
  const { impl } = fetchStub([{ ok: false, status: 500 }]);
  const r = await sendAlert({ title: "t", body: "b" }, { fetchImpl: impl, values });
  assert(r.failed.join() === "telegram" && r.sent.length === 0, "failed reported");
});
test("webhook must be https", () => {
  assert(getConfiguredChannels({ ALERT_WEBHOOK_URL: "http://insecure.example" } as unknown as NodeJS.ProcessEnv).length === 0, "http ignored");
});

console.log("Token health");
test("detects Meta auth errors from real log text", () => {
  assert(isMetaAuthError("Error validating access token: Session has expired on Thursday"), "session expired");
  assert(isMetaAuthError("follow_gate_rejected_401:Error validating access token: x"), "401 gate");
  assert(isMetaAuthError("meta_http_401"), "meta_http_401");
  assert(!isMetaAuthError("hourly_cap_reached") && !isMetaAuthError("comment_id_missing") && !isMetaAuthError(null), "not auth");
});
test("debug_token: date expiry", async () => {
  const exp = Math.floor(Date.now() / 1000) + 10 * 86400;
  const { impl } = fetchStub([{ body: { data: { is_valid: true, expires_at: exp, data_access_expires_at: exp + 86400 } } }]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "1", appSecret: "s" });
  assert(s.valid === true && s.neverExpires === false && s.expiresAt === exp * 1000 && s.method === "debug_token", "dated");
  assert(daysUntil(s.expiresAt) === 9 || daysUntil(s.expiresAt) === 10, "days");
});
test("debug_token: expires_at 0 means never expires", async () => {
  const { impl } = fetchStub([{ body: { data: { is_valid: true, expires_at: 0 } } }]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "1", appSecret: "s" });
  assert(s.valid === true && s.neverExpires === true && s.expiresAt === null, "never");
});
test("debug_token says invalid AND both hosts reject it -> invalid", async () => {
  const { impl } = fetchStub([
    { body: { data: { is_valid: false, expires_at: 1 } } },
    { status: 401, body: { error: { code: 190 } } },
    { status: 401, body: { error: { code: 190 } } },
  ]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "1", appSecret: "s" });
  assert(s.valid === false && s.error === "token_invalid_or_expired", "invalid");
});
test("Instagram-Login token: Facebook host rejects it but graph.instagram.com accepts -> VALID", async () => {
  const { calls, impl } = fetchStub([
    { status: 400, body: { error: { code: 190 } } },       // debug_token cannot parse it
    { status: 401, body: { error: { code: 190 } } },       // graph.facebook.com /me
    { ok: true, body: { user_id: "1" } },                  // graph.instagram.com /me
  ]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "IGAAtoken", appId: "1", appSecret: "s" });
  assert(s.valid === true && s.method === "probe", "valid via instagram host");
  assert(calls.some((c) => c.url.startsWith("https://graph.instagram.com/")), "instagram host was probed");
});
test("debug_token says invalid but a real call succeeds -> trust the real call", async () => {
  const { impl } = fetchStub([{ body: { data: { is_valid: false } } }, { ok: true, body: { id: "1" } }]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "1", appSecret: "s" });
  assert(s.valid === true, "valid");
});
test("network trouble is unknown, never a false 'invalid'", async () => {
  const boom = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
  const s = await checkMetaToken({ fetchImpl: boom, token: "t", appId: "", appSecret: "" });
  assert(s.valid === null && s.error === "network_error", "unknown");
});
test("effective token state: connected Instagram overrides, manual expiry fills the gap", async () => {
  const unknown = { valid: false, expiresAt: null, neverExpires: false, dataAccessExpiresAt: null, method: "probe" as const, checkedAt: 1, error: "x" };
  const later = Date.now() + 20 * 86400000;
  const s = await getEffectiveTokenState({ instagramConnected: true, check: async () => unknown, readNote: async () => ({ expiresAt: later, savedAt: 1 }) });
  assert(s.valid === true && s.expiresAt === later && s.expirySource === "manual", "override + manual");
  const meta = await getEffectiveTokenState({ check: async () => ({ ...unknown, valid: true, expiresAt: 5, error: null }), readNote: async () => ({ expiresAt: later, savedAt: 1 }) });
  assert(meta.expiresAt === 5 && meta.expirySource === "meta", "Meta's date wins over the manual one");
  const never = await getEffectiveTokenState({ check: async () => ({ ...unknown, valid: true, neverExpires: true, error: null }), readNote: async () => ({ expiresAt: later, savedAt: 1 }) });
  assert(never.expiresAt === null && never.neverExpires, "never-expiring token ignores the note");
});
test("without app credentials it probes /me and reports expiry as unknown", async () => {
  const { impl } = fetchStub([{ ok: true, body: { id: "1" } }]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "", appSecret: "" });
  assert(s.valid === true && s.expiresAt === null && !s.neverExpires && s.method === "probe", "probe");
});
test("probe 401 / code 190 is invalid; missing token is invalid", async () => {
  const { impl } = fetchStub([{ status: 401, body: { error: { code: 190 } } }]);
  const s = await checkMetaToken({ fetchImpl: impl, token: "t", appId: "", appSecret: "" });
  assert(s.valid === false, "401");
  const m = await checkMetaToken({ fetchImpl: impl, token: "", appId: "", appSecret: "" });
  assert(m.valid === false && m.error === "missing_access_token", "missing");
});

console.log("Daily summary");
test("summary lists numbers, trend and what needs attention", () => {
  const s = buildDailySummary({
    date: "2026-10-10",
    today: { ...EMPTY_DAY, commentsReceived: 42, triggers: 40, repliesSent: 38, dmsSent: 38, commentsFailed: 1, dmsFailed: 1, followVerified: 10, followNotVerified: 30 },
    yesterday: { ...EMPTY_DAY, commentsReceived: 21, dmsSent: 19 },
    token: { valid: true, expiresAt: Date.now() + 3 * 86400000, neverExpires: false, dataAccessExpiresAt: null, method: "debug_token", checkedAt: Date.now(), error: null },
    missingJobMappings: 2, retryableFailures: 2, clicks: 19,
  });
  assert(s.title.includes("2026-10-10"), "title");
  assert(s.body.includes("Comments: 42 (+100% vs yesterday)") && s.body.includes("DMs sent: 38"), "numbers + trend");
  assert(s.body.includes("Link clicks: 19 (50% of DMs)") && s.body.includes("10 of 40"), "clicks + follow");
  assert(s.body.includes("expires in") && s.body.includes("2 post mappings have a job") && s.body.includes("can be retried"), "attention list");
});
test("summary says all good when nothing needs attention", () => {
  const s = buildDailySummary({ date: "d", today: { ...EMPTY_DAY, commentsReceived: 1 } });
  assert(s.body.includes("Nothing needs attention"), "all good");
});

console.log("Retry selection");
const L = (o: Partial<RawLog>): RawLog => ({
  id: "x", type: "comment_sent", username: "u", userId: "U1", mediaId: "m1", commentId: "c1", ruleId: "r1", ruleKeyword: "job",
  commentStatus: null, dmStatus: null, error: null, dryRun: false, timestamp: 1000, ...o,
});
test("failed reply and failed DM are both retryable parts", () => {
  const items = selectRetryable([
    L({ type: "comment_sent", commentStatus: "failed", error: "Error validating access token", timestamp: 2000 }),
    L({ type: "dm_sent", dmStatus: "failed", error: "follow_gate_rejected_401", timestamp: 2100 }),
  ], 0);
  assert(items.length === 1 && items[0].parts.join() === "comment,dm", "both parts");
  assert(items[0].userId === "U1" && items[0].keyword === "job", "context kept");
});
test("a later success clears that part only", () => {
  const items = selectRetryable([
    L({ type: "comment_sent", commentStatus: "failed", timestamp: 2000 }),
    L({ type: "comment_sent", commentStatus: "success", timestamp: 3000 }),
    L({ type: "dm_sent", dmStatus: "failed", timestamp: 2100 }),
  ], 0);
  assert(items.length === 1 && items[0].parts.join() === "dm", "only dm left");
});
test("fully recovered comments disappear", () => {
  const items = selectRetryable([
    L({ type: "comment_sent", commentStatus: "failed", timestamp: 2000 }),
    L({ type: "comment_sent", commentStatus: "success", timestamp: 2500 }),
  ], 0);
  assert(items.length === 0, "empty");
});
test("dry-run, skipped, old and incomplete logs are ignored", () => {
  const items = selectRetryable([
    L({ commentStatus: "failed", dryRun: true, timestamp: 2000, commentId: "a" }),
    L({ commentStatus: "skipped", timestamp: 2000, commentId: "b" }),
    L({ commentStatus: "failed", timestamp: 10, commentId: "c" }),
    L({ commentStatus: "failed", timestamp: 2000, commentId: "d", ruleId: null }),
    L({ commentStatus: "failed", timestamp: 2000, commentId: "e", mediaId: null }),
    L({ type: "keyword_matched", commentStatus: "failed", timestamp: 2000, commentId: "f" }),
  ], 500);
  assert(items.length === 0, "got " + items.length);
});
test("a failure AFTER an earlier success is retryable again; newest first", () => {
  const items = selectRetryable([
    L({ commentId: "old", commentStatus: "failed", timestamp: 2000 }),
    L({ commentId: "new", commentStatus: "failed", timestamp: 5000 }),
    L({ commentId: "again", commentStatus: "success", timestamp: 1000 }),
    L({ commentId: "again", commentStatus: "failed", timestamp: 4000 }),
  ], 0);
  assert(items.map((i) => i.commentId).join() === "new,again,old", "order " + items.map((i) => i.commentId).join());
});

console.log("Simulator");
const rule = (o: Partial<RuleEngineRule> = {}): RuleEngineRule => ({
  id: "r1", channel: "instagram", mode: "keyword", keywords: ["job", "link"], matchType: "contains", scope: "all_posts",
  postId: null, postLabel: null, commentTemplateId: "ct1", commentTemplateIds: [], dmTemplateId: "dt1", replyMode: "comment_and_dm",
  cooldownMinutes: 0, activeFrom: null, activeUntil: null, active: true, createdAt: 1, updatedAt: 1, ...o,
} as RuleEngineRule);
const res1: PostJobResolution = {
  mapped: true, mediaId: "m1", jobId: "j1", jobUrl: "https://site/jobs/1", jobTitle: "Dev", company: "Acme", title: "Dev", location: "Pune",
  links: [{ label: "Dev - Acme", url: "https://site/jobs/1" }], reason: "resolved",
};
const resMulti: PostJobResolution = { ...res1, links: [
  { label: "Dev - Acme", url: "https://site/jobs/1" }, { label: "QA - Globex", url: "https://site/jobs/2" }, { label: "Careers", url: "https://c.example.com" },
] };
function deps(rules: RuleEngineRule[], resolution: PostJobResolution, dm = "Hi {{username}}! {{title}} at {{company}}\n\n[[CTA:Apply Now]]", comments = [{ id: "ct1", text: "Hey {{username}}, check DM 📩" }]) {
  return { readRules: async () => rules, resolve: async () => resolution, commentVariants: async () => comments, dmText: async () => dm, now: 5000, dryRun: false };
}
test("matching comment: shows rule, public reply and a DM with ONE button", async () => {
  const r = await simulateComment({ mediaId: "m1", commentText: "Please send JOB link", username: "sam" }, deps([rule()], res1));
  assert(r.matched && r.rule?.id === "r1" && r.matchedKeyword === "job", "matched");
  assert(r.willPostComment && r.willSendDm, "both");
  assert(r.comment.variants[0].text === "Hey sam, check DM 📩", "comment rendered");
  assert(r.dm?.kind === "button" && r.dm.buttons[0] === "Apply Now" && r.dm.text.includes("Dev at Acme"), "dm button");
});
test("no match explains why and previews nothing", async () => {
  const r = await simulateComment({ mediaId: "m1", commentText: "nice post" }, deps([rule()], res1));
  assert(!r.matched && r.dm === null && r.comment.variants.length === 0 && r.reason.length > 0, "no match");
});
test("replyMode controls what would be sent", async () => {
  const c = await simulateComment({ mediaId: "m1", commentText: "job" }, deps([rule({ replyMode: "comment_only" })], res1));
  assert(c.willPostComment && !c.willSendDm && c.dm === null, "comment only");
  const d = await simulateComment({ mediaId: "m1", commentText: "job" }, deps([rule({ replyMode: "dm_only" })], res1));
  assert(!d.willPostComment && d.willSendDm && d.dm !== null && d.comment.variants.length === 0, "dm only");
});
test("unmapped post warns and sends nothing", async () => {
  const r = await simulateComment({ mediaId: "m1", commentText: "job" }, deps([rule()], { ...res1, mapped: false, reason: "mapping_not_found", links: [] }));
  assert(!r.willPostComment && !r.willSendDm && r.warnings.some((w) => w.includes("no usable mapping")), "warning");
});
test("2-3 links preview as buttons, 4-5 as cards", () => {
  const b = buildDmPreview("Hi {{username}}\n\n{{jobLink}}\n\n[[CTA:x]]", resMulti, "sam");
  assert(b.preview?.kind === "buttons" && b.preview.buttons.length === 3 && b.preview.text.includes("2. QA - Globex"), "buttons");
  const five = { ...resMulti, links: [...resMulti.links, { label: "Four", url: "https://d" }, { label: "Five", url: "https://e" }] };
  const c = buildDmPreview("Hi {{username}}", five, "sam");
  assert(c.preview?.kind === "carousel" && c.preview.cards.length === 5, "carousel");
});
test("template that cannot render is reported (empty variable refuses to send)", async () => {
  const r = await simulateComment({ mediaId: "m1", commentText: "job" }, deps([rule()], { ...res1, location: "" }, "At {{location}}"));
  assert(r.warnings.some((w) => w.includes("cannot be rendered")), "render warning: " + r.warnings.join("|"));
});
test("rotation lists every comment variant", async () => {
  const r = await simulateComment({ mediaId: "m1", commentText: "job" }, deps([rule()], res1, "Hi", [{ id: "a", text: "One {{username}}" }, { id: "b", text: "Two {{username}}" }]));
  assert(r.comment.variants.length === 2 && r.warnings.some((w) => w.includes("Rotation is on")), "variants");
});

console.log("Missing jobs");
test("flags active mappings whose primary or extra job is gone; ignores archived", async () => {
  const exists = async (id: string) => id !== "gone" && id !== "gone2";
  const out = await findMissingJobMappings([
    { mediaId: "a", jobId: "ok", jobTitleCache: "A", status: "active" },
    { mediaId: "b", jobId: "gone", jobTitleCache: "B", status: "active" },
    { mediaId: "c", jobId: "ok", jobTitleCache: "C", status: "active", extraLinks: [{ type: "job", jobId: "gone2" }, { type: "external", url: "https://x" }] },
    { mediaId: "d", jobId: "gone", jobTitleCache: "D", status: "archived" },
    { mediaId: "e", jobId: "", jobTitleCache: "E", status: "active", extraLinks: [{ type: "external", url: "https://x" }] },
  ], exists);
  assert(out.map((o) => o.mediaId).join() === "b,c", "got " + out.map((o) => o.mediaId).join());
  assert(out[0].primaryMissing && out[1].missingExtraJobIds.join() === "gone2", "details");
});

console.log("Click tracking");
test("tracking is opt-in and URLs are built from the mapping, not user input", () => {
  assert(trackingBaseUrl({} as NodeJS.ProcessEnv) === null, "off by default");
  assert(trackingBaseUrl({ TRACKING_BASE_URL: "javascript:alert(1)" } as unknown as NodeJS.ProcessEnv) === null, "bad scheme");
  const base = trackingBaseUrl({ TRACKING_BASE_URL: "https://api.example.com/" } as unknown as NodeJS.ProcessEnv)!;
  assert(base === "https://api.example.com", "trailing slash stripped");
  assert(buildTrackedUrl(base, "1789 0", 2) === "https://api.example.com/r/1789%200/2", "encoded");
});
test("link-preview bots are not counted but Instagram's in-app browser is", () => {
  assert(isCrawlerUserAgent("facebookexternalhit/1.1") && isCrawlerUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"), "bots");
  assert(!isCrawlerUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Instagram 300.0.0.0 Android"), "real user");
});
test("click summary groups by day, post and link", () => {
  const s = summarizeClicks([
    { date: "2026-10-09", byPost: { m1: { "0": 3, "1": 1 } } },
    { date: "2026-10-10", byPost: { m1: { "0": 2 }, m2: { "0": 5 } } },
  ], new Map([["m1", "Dev - Acme"]]));
  assert(s.total === 11 && s.daily[1].clicks === 7, "totals");
  // m1 = 3+1+2 = 6 clicks, m2 = 5 clicks, so m1 ranks first.
  assert(s.byPost[0].mediaId === "m1" && s.byPost[0].clicks === 6 && s.byPost[0].label === "Dev - Acme" && s.byPost[0].byLink.length === 2, "by post");
  assert(s.byPost[1].mediaId === "m2" && s.byPost[1].label === "Instagram post m2", "fallback label");
  assert(lastDates(3, Date.UTC(2026, 9, 10, 12)).length === 3, "dates");
});

console.log("Cards: role as title, company and location as subtitle");
const cardJobs: Record<string, { jobTitle: string; company: string; location: string }> = {
  a: { jobTitle: "Data Analyst", company: "Barclays", location: "Pune" },
  b: { jobTitle: "QA Engineer", company: "Umbrella", location: "Remote" },
};
function cardReader(extra: unknown[]): DataReader {
  return { getPostMapping: async () => ({ jobId: "a", jobTitleCache: null, status: "active", extraLinks: extra as never }), getJob: async (id) => cardJobs[id] ?? null };
}
test("resolved links carry the role (title) and 'Company · Location' (subtitle)", async () => {
  const r = await resolvePostJobWithReader("m", cardReader([{ type: "job", jobId: "b", label: null }, { type: "external", url: "https://www.careers.example.com/apply", label: "Company careers" }]), "https://site.test");
  assert(r.mapped && r.links.length === 3, "3 links");
  assert(r.links[0].title === "Data Analyst" && r.links[0].subtitle === "Barclays · Pune", "primary job");
  assert(r.links[1].title === "QA Engineer" && r.links[1].subtitle === "Umbrella · Remote", "extra job");
  assert(r.links[2].title === "Company careers" && r.links[2].subtitle === "careers.example.com", "external: name + host");
  assert(r.links[0].label === "Data Analyst - Barclays", "label for text/buttons is unchanged");
});
test("card element: title, subtitle and one button; image only when DM_CARD_IMAGE_URL is a https URL", () => {
  const link = { label: "Data Analyst - Barclays", url: "https://x/1", title: "Data Analyst", subtitle: "Barclays · Pune" };
  const plain = cardElement(link, {} as NodeJS.ProcessEnv);
  assert(plain.title === "Data Analyst" && plain.subtitle === "Barclays · Pune" && plain.buttons.length === 1 && !("image_url" in plain), "no image by default");
  const withImg = cardElement(link, { DM_CARD_IMAGE_URL: "https://cdn.example.com/card.png" } as unknown as NodeJS.ProcessEnv);
  assert(withImg.image_url === "https://cdn.example.com/card.png", "https image used");
  const http = cardElement(link, { DM_CARD_IMAGE_URL: "http://insecure.example/x.png" } as unknown as NodeJS.ProcessEnv);
  assert(!("image_url" in http), "http image ignored");
  const bare = cardElement({ label: "Only a label", url: "https://x/2" }, {} as NodeJS.ProcessEnv);
  assert(bare.title === "Only a label" && bare.subtitle === "Tap to view & apply", "falls back to the label");
});
test("the 5-link carousel really sends role as title and company as subtitle", async () => {
  const calls: any[] = [];
  const impl = (async (_u: string, init: any) => { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ message_id: "m" }), { status: 200 }); }) as unknown as typeof fetch;
  const links = Array.from({ length: 5 }, (_, i) => ({ label: `Role ${i} - Co ${i}`, url: `https://x/${i}`, title: `Role ${i}`, subtitle: `Co ${i} · City` }));
  const r = await sendDirectMessage("u1", "fallback", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig", linkButtons: links });
  assert(r.success, "sent");
  const els = calls[0].message.attachment.payload.elements;
  assert(els.length === 5 && els[0].title === "Role 0" && els[0].subtitle === "Co 0 · City" && els[0].buttons[0].url === "https://x/0", "elements");
});

console.log("Manual send");
function pagedFetch(pages: unknown[]): { impl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  let i = 0;
  const impl = (async (url: string) => { urls.push(String(url)); return new Response(JSON.stringify(pages[Math.min(i++, pages.length - 1)]), { status: 200 }); }) as unknown as typeof fetch;
  return { impl, urls };
}
test("comments are read from Instagram: paged, filtered by username, own comments skipped, newest first", async () => {
  const { impl, urls } = pagedFetch([
    { data: [{ id: "c1", text: "link", username: "Sankhar2003", timestamp: "2026-10-12T04:30:00+0000", from: { id: "U1" } }, { id: "c2", text: "mine", username: "hire_daily", timestamp: "2026-10-12T04:40:00+0000", from: { id: "ig_123" } }],
      paging: { next: "https://graph.instagram.com/v24.0/m1/comments?after=abc" } },
    { data: [{ id: "c3", text: "🙌", username: "sankhar2003", timestamp: "2026-10-12T05:00:00+0000", from: { id: "U1" } }, { id: "c4", text: "x", username: "other", timestamp: "2026-10-12T05:10:00+0000", from: { id: "U2" } }],
      paging: { next: "https://evil.example.com/steal?token=1" } },
  ]);
  const r = await fetchPostComments({ mediaId: "m1", token: "tok", ownUserId: "ig_123", username: "@sankhar", fetchImpl: impl });
  assert(r.error === null && r.comments.map((c) => c.commentId).join() === "c3,c1", "filtered + newest first: " + r.comments.map((c) => c.commentId).join());
  assert(r.comments[0].userId === "U1", "commenter id kept");
  assert(urls.length === 2 && !urls.some((u) => u.includes("evil.example.com")), "only graph.instagram.com paging links are followed");
});
test("an Instagram error is reported, never thrown", async () => {
  const f = (async () => new Response(JSON.stringify({ error: { message: "Invalid OAuth access token" } }), { status: 400 })) as unknown as typeof fetch;
  const r = await fetchPostComments({ mediaId: "m1", token: "tok", fetchImpl: f });
  assert(r.comments.length === 0 && /Invalid OAuth/.test(r.error ?? ""), "error text");
});
test("per-comment status and the user's timeline come from the logs", () => {
  const logs = [
    L({ commentId: "c1", type: "comment_sent", commentStatus: "failed", error: "An unknown error has occurred.", timestamp: 2000, username: "Sankhar2003" }),
    L({ commentId: "c1", type: "dm_sent", dmStatus: "success", timestamp: 2100, username: "Sankhar2003" }),
    L({ commentId: "c9", type: "dm_sent", dmStatus: "failed", timestamp: 2200, username: "other" }),
    L({ commentId: null, type: "keyword_matched", detail: "any_comment rule matched — SKIPPED: cooldown", timestamp: 1900, username: "sankhar2003" }),
  ];
  const st = commentStatuses(["c1", "c2"], logs);
  assert(st.get("c1")!.reply === "failed" && st.get("c1")!.dm === "success" && st.get("c1")!.lastError === "An unknown error has occurred.", "c1 status");
  assert(st.get("c2")!.reply === "none" && st.get("c2")!.dm === "none", "c2 untouched");
  const tl = userTimeline(logs, "@SANKHAR2003");
  assert(tl.length === 3 && tl[0].at === 2100 && tl[2].detail!.includes("SKIPPED"), "timeline newest first, case-insensitive, includes the skip reason");
  assert(userTimeline(logs, "").length === 0, "no username, no timeline");
});
test("custom text is validated (required, DM max 1000, reply max 2200)", () => {
  assert(!validateCustomText("dm", "   ").ok && !validateCustomText("dm", 5).ok, "required");
  assert(validateCustomText("dm", "x".repeat(1000)).ok && !validateCustomText("dm", "x".repeat(1001)).ok, "dm limit");
  assert(validateCustomText("reply", "x".repeat(2200)).ok && !validateCustomText("reply", "x".repeat(2201)).ok, "reply limit");
  const v = validateCustomText("dm", "  hi  ");
  assert(v.ok && v.text === "hi", "trimmed");
});

console.log("Public reply: Meta unknown-error retry (never creates a duplicate)");
const UNKNOWN = { error: { message: "An unknown error has occurred.", code: 2, is_transient: true } };
function replyStub(script: { method: string; status: number; body: unknown }[]) {
  const calls: { method: string; url: string }[] = [];
  let i = 0;
  const impl = (async (url: string, init?: any) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url: String(url) });
    const step = script[Math.min(i++, script.length - 1)];
    return new Response(JSON.stringify(step.body), { status: step.status });
  }) as unknown as typeof fetch;
  return { calls, impl };
}
test("which Meta errors count as transient", () => {
  assert(isTransientMetaError(500, null) && isTransientMetaError(400, UNKNOWN) && isTransientMetaError(400, { error: { code: 1 } }), "transient");
  assert(!isTransientMetaError(400, { error: { code: 100 } }) && !isTransientMetaError(401, { error: { code: 190 } }), "permanent");
});
test("transient error + no reply exists yet -> exactly one retry, then success", async () => {
  const { calls, impl } = replyStub([{ method: "POST", status: 400, body: UNKNOWN }, { method: "GET", status: 200, body: { data: [] } }, { method: "POST", status: 200, body: { id: "r1" } }]);
  const r = await replyToComment("c1", "Check your DM", "tok", { fetchImpl: impl, retryDelayMs: 0 });
  assert(r.success && r.externalId === "r1", "success after retry: " + r.error);
  assert(calls.filter((c) => c.method === "POST").length === 2 && calls.some((c) => c.url.includes("/replies")), "checked replies, posted twice");
});
test("transient error but our reply is already there -> NO second post (no duplicate)", async () => {
  const { calls, impl } = replyStub([{ method: "POST", status: 400, body: UNKNOWN }, { method: "GET", status: 200, body: { data: [{ id: "mine1", from: { id: "ig_123" } }] } }]);
  const r = await replyToComment("c1", "Check your DM", "tok", { fetchImpl: impl, retryDelayMs: 0 });
  assert(r.success && r.externalId === "mine1" && calls.filter((c) => c.method === "POST").length === 1, "adopted existing reply");
});
test("transient error and the replies lookup itself fails -> no retry (never risk a duplicate)", async () => {
  const { calls, impl } = replyStub([{ method: "POST", status: 400, body: UNKNOWN }, { method: "GET", status: 500, body: {} }]);
  const r = await replyToComment("c1", "Check your DM", "tok", { fetchImpl: impl, retryDelayMs: 0 });
  assert(!r.success && calls.filter((c) => c.method === "POST").length === 1, "failed, one post only");
});
test("permanent errors are not retried", async () => {
  const { calls, impl } = replyStub([{ method: "POST", status: 400, body: { error: { message: "Invalid parameter", code: 100 } } }]);
  const r = await replyToComment("c1", "Hi", "tok", { fetchImpl: impl, retryDelayMs: 0 });
  assert(!r.success && calls.length === 1, "one call");
});

console.log("Tracking self-check (the 404 bug)");
function headResp(status: number, routeHeader: boolean): typeof fetch {
  return (async () => new Response(null, { status, headers: routeHeader ? { "x-hd-click-route": "1" } : {} })) as unknown as typeof fetch;
}
test("TRACKING_BASE_URL pointing at the WEBSITE is rejected without any network call", async () => {
  let called = false;
  const f = (async () => { called = true; return new Response(null, { status: 404 }); }) as unknown as typeof fetch;
  const c = await verifyTrackingBase("https://hire-daily.vercel.app", { fetchImpl: f });
  assert(!c.ok && c.problem === "points_to_website" && !called, "website host blocked");
});
test("a host that is not this backend (404, no click-route header) is rejected", async () => {
  const c = await verifyTrackingBase("https://some-other-app.vercel.app", { fetchImpl: headResp(404, false) });
  assert(!c.ok && c.problem === "not_this_backend", "wrong host");
});
test("the real backend (redirect + click-route header) passes", async () => {
  const c = await verifyTrackingBase("https://hiredaily-backend.vercel.app", { fetchImpl: headResp(302, true) });
  assert(c.ok && c.problem === null, "backend ok");
});
test("unreachable host fails safe (direct links), and is retried sooner than a conclusive result", async () => {
  const boom = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
  const c = await verifyTrackingBase("https://hiredaily-backend.vercel.app", { fetchImpl: boom });
  assert(!c.ok && c.problem === "unreachable", "unreachable");
  resetTrackingCheckCache();
  let calls = 0;
  const counting = (async () => { calls++; return new Response(null, { status: 302, headers: { "x-hd-click-route": "1" } }); }) as unknown as typeof fetch;
  const values = { TRACKING_BASE_URL: "https://hiredaily-backend.vercel.app" } as unknown as NodeJS.ProcessEnv;
  const a = await getTrackingCheck({ values, fetchImpl: counting, now: 1_000_000 });
  const b = await getTrackingCheck({ values, fetchImpl: counting, now: 1_000_000 + 5 * 60_000 });
  assert(a.check?.ok && b.check?.ok && calls === 1, "conclusive result is cached for 10 minutes");
  resetTrackingCheckCache();
  const off = await getTrackingCheck({ values: {} as NodeJS.ProcessEnv, fetchImpl: counting });
  assert(off.base === null && off.check === null, "off when not configured");
});

console.log("Rate guard");
test("caps and delay come from env with safe defaults", () => {
  const d = capsFromEnv({} as NodeJS.ProcessEnv);
  assert(d.comment === 0 && d.dm === 0, "no limit unless configured");
  const c = capsFromEnv({ AUTOMATION_MAX_COMMENTS_PER_HOUR: "600", AUTOMATION_MAX_DMS_PER_HOUR: "abc" } as unknown as NodeJS.ProcessEnv);
  assert(c.comment === 600 && c.dm === 0, "explicit cap used, garbage falls back to unlimited");
  assert(delayRangeFromEnv({} as NodeJS.ProcessEnv).min === 800, "delay default");
  const off = delayRangeFromEnv({ AUTOMATION_DELAY_MIN_MS: "0", AUTOMATION_DELAY_MAX_MS: "0" } as unknown as NodeJS.ProcessEnv);
  assert(randomDelayMs(off.min, off.max) === 0, "delay off");
  const maxOnly = delayRangeFromEnv({ AUTOMATION_DELAY_MAX_MS: "0" } as unknown as NodeJS.ProcessEnv);
  assert(maxOnly.min === 0 && maxOnly.max === 0, "MAX=0 alone switches the pause off (was a fixed 0.8s before)");
  const big = delayRangeFromEnv({ AUTOMATION_DELAY_MIN_MS: "999999", AUTOMATION_DELAY_MAX_MS: "999999" } as unknown as NodeJS.ProcessEnv);
  assert(big.max <= 5000, "delay capped at 5s so the webhook never stalls");
  assert(randomDelayMs(1000, 2000, () => 0.5) === 1500, "random range");
});

Promise.all(pending).then(() => {
  console.log("\n" + "-".repeat(40));
  console.log(`Update 4 tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log("Failing tests:"); failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
});
