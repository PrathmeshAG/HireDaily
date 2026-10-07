// Multi-link support (one DM, up to 5 named links) — unit tests.
// In-memory stubs only: no Firebase, no Meta calls.

import { sanitizeExtraLinks, buildLinksBlock, normalizeExternalUrl, MAX_TOTAL_LINKS } from "../src/services/job-links.js";
import { resolvePostJobWithReader, type DataReader } from "../src/services/post-mapping.service.js";
import { sendDirectMessage, renderCommentReply, jobLinkValue } from "../src/services/instagram.service.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];
const pending: Promise<void>[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  pending.push(
    Promise.resolve()
      .then(fn)
      .then(() => { passed++; console.log("  ✓ " + name); })
      .catch((err: unknown) => {
        failed++; failures.push(name);
        console.error("  ✗ " + name);
        console.error("    " + (err instanceof Error ? err.message : String(err)));
      }),
  );
}
function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(msg); }

const jobs: Record<string, { jobTitle: string; company: string; location: string }> = {
  j1: { jobTitle: "Frontend Dev", company: "Acme", location: "Pune" },
  j2: { jobTitle: "Backend Dev", company: "Globex", location: "Remote" },
};
function reader(extra?: unknown[]): DataReader {
  return {
    getPostMapping: async () => ({ jobId: "j1", jobTitleCache: null, status: "active", extraLinks: extra as never }),
    getJob: async (id) => jobs[id] ?? null,
  };
}

console.log("Multi-link — sanitize");
test("rejects non-http(s) and credentials in external URLs", () => {
  assert(normalizeExternalUrl("javascript:alert(1)") === null, "js url");
  assert(normalizeExternalUrl("https://user:pw@x.com") === null, "creds");
  assert(normalizeExternalUrl("https://example.com/a b") === null, "space");
  assert(normalizeExternalUrl(" https://example.com/apply ") === "https://example.com/apply", "ok url");
});
test("caps at 4 extras, drops invalid + duplicates + primary", () => {
  const raw = [
    { type: "job", jobId: "j1" },
    { type: "job", jobId: "j2" },
    { type: "job", jobId: "j2" },
    { type: "external", url: "https://a.com", label: "A" },
    { type: "external", url: "https://a.com", label: "A again" },
    { type: "external", url: "ftp://bad", label: "Bad" },
    { type: "external", url: "https://b.com", label: "" },
    { type: "external", url: "https://c.com", label: "C" },
    { type: "external", url: "https://d.com", label: "D" },
    { type: "external", url: "https://e.com", label: "E" },
  ];
  const out = sanitizeExtraLinks(raw, "j1");
  assert(out.length === 4, "got " + out.length);
  assert(out[0].type === "job" && (out[0] as { jobId: string }).jobId === "j2", "first extra is j2");
});
test("non-array input gives empty list", () => {
  assert(sanitizeExtraLinks(undefined).length === 0 && sanitizeExtraLinks("x").length === 0, "empty");
});

console.log("Multi-link — resolution");
test("legacy mapping resolves to exactly one link", async () => {
  const r = await resolvePostJobWithReader("m1", reader(), "https://site.test");
  assert(r.mapped && r.links.length === 1 && r.links[0].url === r.jobUrl, "single link");
});
test("job + external extras resolve in order, primary first", async () => {
  const r = await resolvePostJobWithReader(
    "m1",
    reader([{ type: "job", jobId: "j2", label: null }, { type: "external", url: "https://x.com/apply", label: "Company site" }]),
    "https://site.test",
  );
  assert(r.links.length === 3, "3 links");
  assert(r.links[0].url === r.jobUrl, "primary first");
  assert(r.links[1].label === "Backend Dev - Globex", "job label");
  assert(r.links[2].label === "Company site" && r.links[2].url === "https://x.com/apply", "external");
});
test("missing extra job is skipped and never blocks the primary", async () => {
  const r = await resolvePostJobWithReader("m1", reader([{ type: "job", jobId: "gone", label: null }]), "https://site.test");
  assert(r.mapped && r.links.length === 1, "primary only");
});

console.log("Multi-link — rendering");
test("links block: numbered, name above each link, fits one message", () => {
  const links = Array.from({ length: MAX_TOTAL_LINKS }, (_, i) => ({
    label: "Very long job title number " + i + " at some company with a long name",
    url: "https://hire-daily.vercel.app/jobs/remote/some-long-role-title/some-company/" + "x".repeat(60) + i,
  }));
  const block = buildLinksBlock(links);
  assert(block.length <= 900, "len " + block.length);
  assert(block.split("\n\n").length === 5, "5 entries");
  assert(block.startsWith("1. ") && block.includes("\nhttps://"), "label then url");
});
test("jobLinkValue keeps legacy URL for single link and uses block for many", () => {
  assert(jobLinkValue({ jobUrl: "https://a.test/jobs/1", links: [{ label: "A", url: "https://a.test/jobs/1" }] }) === "https://a.test/jobs/1", "single");
  const many = jobLinkValue({ jobUrl: "u1", links: [{ label: "A", url: "u1" }, { label: "B", url: "u2" }] });
  assert(many.includes("1. A\nu1") && many.includes("2. B\nu2"), "block");
});
test("template {{jobLink}} receives the multi-link block", () => {
  const block = jobLinkValue({ jobUrl: "u1", links: [{ label: "A", url: "u1" }, { label: "B", url: "u2" }] });
  const r = renderCommentReply("Hi {{username}}!\n{{jobLink}}", {
    commentReplyText: "", username: "sam", company: "c", title: "t", location: "l", jobLink: block,
  });
  assert(r.ok && r.rendered.includes("2. B\nu2"), "rendered");
});

console.log("Multi-link — DM transport");
test("plain multi-link DM goes via comment_id private reply, single message, no button", async () => {
  const calls: { body: any }[] = [];
  const impl = (async (_u: string, init: any) => { calls.push({ body: JSON.parse(init.body) }); return new Response(JSON.stringify({ message_id: "mid1" }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await sendDirectMessage("u1", "Hi\n\n1. A\nu1\n\n2. B\nu2", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig1", allowDirectRecipient: true });
  assert(r.success, "success " + r.error);
  assert(calls.length === 1, "one request");
  assert(calls[0].body.recipient.comment_id === "c1" && !calls[0].body.message.attachment, "text private reply");
});
test("after follow-gate (no comment id) multi-link DM uses recipient.id", async () => {
  const calls: { body: any }[] = [];
  const impl = (async (_u: string, init: any) => { calls.push({ body: JSON.parse(init.body) }); return new Response(JSON.stringify({ message_id: "mid2" }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await sendDirectMessage("u1", "1. A\nu1\n\n2. B\nu2", "tok", { fetchImpl: impl, commentId: null, instagramBusinessId: "ig1", allowDirectRecipient: true });
  assert(r.success && calls[0].body.recipient.id === "u1", "recipient id");
});
test("without allowDirectRecipient the legacy comment_id_missing error is preserved", async () => {
  const impl = (async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
  const r = await sendDirectMessage("u1", "plain", "tok", { fetchImpl: impl, commentId: null, instagramBusinessId: "ig1" });
  assert(!r.success && r.error === "comment_id_missing", "legacy error");
});

console.log("Multi-link — native buttons");
const L = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `Role number ${i + 1} - Company ${i + 1} with a long name`, url: `https://hire.test/jobs/${i + 1}` }));
function recorder(responses: { status: number; body: unknown }[]) {
  const calls: { body: any }[] = [];
  let i = 0;
  const impl = (async (_u: string, init: any) => {
    calls.push({ body: JSON.parse(init.body) });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { calls, impl };
}
test("2-3 links: ONE button template, one web_url button per link, titles <= 20 chars", async () => {
  const { calls, impl } = recorder([{ status: 200, body: { message_id: "m" } }]);
  const r = await sendDirectMessage("u1", "fallback text", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig1", allowDirectRecipient: true, linkButtons: L(3), buttonText: "Hi!\n\n1. A\n2. B\n3. C" });
  assert(r.success && calls.length === 1, "single request");
  const p = calls[0].body.message.attachment.payload;
  assert(p.template_type === "button" && p.buttons.length === 3, "3 buttons");
  assert(p.buttons.every((b: any) => b.type === "web_url" && b.title.length <= 20), "titles <= 20");
  assert(p.buttons[1].url === "https://hire.test/jobs/2" && p.buttons[1].title.startsWith("2. "), "numbered + url");
  assert(calls[0].body.recipient.comment_id === "c1", "private reply");
});
test("4-5 links: ONE generic carousel, one element per link, each with a button", async () => {
  const { calls, impl } = recorder([{ status: 200, body: { message_id: "m" } }]);
  const r = await sendDirectMessage("u1", "fallback", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig1", linkButtons: L(5) });
  assert(r.success && calls.length === 1, "single request");
  const p = calls[0].body.message.attachment.payload;
  assert(p.template_type === "generic" && p.elements.length === 5, "5 elements");
  assert(p.elements.every((e: any) => e.buttons.length === 1 && e.buttons[0].type === "web_url" && e.title.length <= 80), "button per element");
});
test("Meta rejects the structured message -> falls back to plain text list (still one message delivered)", async () => {
  const { calls, impl } = recorder([{ status: 400, body: { error: { message: "bad template" } } }, { status: 200, body: { message_id: "m2" } }]);
  const r = await sendDirectMessage("u1", "1. A\nhttps://a\n\n2. B\nhttps://b", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig1", allowDirectRecipient: true, linkButtons: L(2) });
  assert(r.success, "fallback success: " + r.error);
  assert(calls.length === 2 && typeof calls[1].body.message.text === "string" && !calls[1].body.message.attachment, "text fallback");
});
test("emoji-safe titles (never split a surrogate pair)", async () => {
  const { calls, impl } = recorder([{ status: 200, body: { message_id: "m" } }]);
  const emojiLinks = [{ label: "🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀", url: "https://a.test" }, { label: "Plain job", url: "https://b.test" }];
  await sendDirectMessage("u1", "x", "tok", { fetchImpl: impl, commentId: "c1", instagramBusinessId: "ig1", linkButtons: emojiLinks });
  const t = calls[0].body.message.attachment.payload.buttons[0].title as string;
  assert(Array.from(t).length <= 20 && !/[\ud800-\udbff]$/.test(t), "no lone surrogate: " + t);
});

Promise.all(pending).then(() => {
  console.log("\n" + "-".repeat(40));
  console.log(`Multi-link tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.log("Failing tests:"); failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
});
