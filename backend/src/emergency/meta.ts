// @ts-nocheck
// Meta (Instagram) helpers. Asli backend jaisi hi host + endpoints:
//   graph.instagram.com/v24.0  |  POST /{comment}/replies  |  POST /{ig_id}/messages (recipient.comment_id)
export const GRAPH = "https://graph.instagram.com/v24.0";

export function clip(text, max) {
  const s = String(text ?? "");
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  return chars.slice(0, Math.max(1, max - 1)).join("").trimEnd() + "…";
}

/* ---------- signature ---------- */
export async function hmacHex(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, typeof data === "string" ? enc.encode(data) : data);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Meta signature emoji/Hindi ko \uXXXX bana kar banata hai (asli backend ka Update 7 fix)
export function escapeUnicode(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += code > 0x7f ? "\\u" + code.toString(16).padStart(4, "0") : text[i];
  }
  return out;
}

export async function verifySignature(bodyBytes, header, secret) {
  const m = /^sha256=([0-9a-f]{64})$/i.exec((header || "").trim());
  const s = String(secret || "").trim().replace(/^["']|["']$/g, "");
  if (!m || !s) return false;
  const provided = m[1].toLowerCase();
  if (safeEqual(await hmacHex(s, bodyBytes), provided)) return true;
  const text = new TextDecoder().decode(bodyBytes);
  return safeEqual(await hmacHex(s, escapeUnicode(text)), provided);
}

/* ---------- webhook parse ---------- */
export function parseComments(payload) {
  const out = [];
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const ch of Array.isArray(entry?.changes) ? entry.changes : []) {
      const f = String(ch?.field || "").toLowerCase();
      if (f !== "comments" && f !== "live_comments") continue;
      const v = ch.value || {};
      const s = (x) => (typeof x === "string" && x.trim() ? x.trim() : null);
      out.push({
        commentId: s(v.id),
        parentId: s(v.parent_id),
        mediaId: s(v.media?.id),
        userId: s(v.from?.id),
        username: s(v.from?.username),
        text: typeof v.text === "string" ? v.text : "",
      });
    }
  }
  // ek hi payload mein dobara aaye comment hata do
  const seen = new Set();
  return out.filter((e) => !e.commentId || (!seen.has(e.commentId) && seen.add(e.commentId)));
}

/* ---------- graph calls ---------- */
async function gfetch(c, url, init = {}) {
  if (c) c.ops += 1;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${(c?.env?.META_ACCESS_TOKEN || "").trim()}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { ok: res.ok, status: res.status, json };
}

function errText(c, r) {
  let m = r.json?.error?.message;
  m = typeof m === "string" ? m : `meta_http_${r.status}`;
  const t = (c?.env?.META_ACCESS_TOKEN || "").trim();
  if (t) m = m.split(t).join("***");
  return m.slice(0, 200);
}

const dry = (c) => String(c?.env?.DRY_RUN ?? "").toLowerCase() === "true";

export async function sendReply(c, commentId, message) {
  if (dry(c)) return { ok: true, id: "dry-run" };
  try {
    const r = await gfetch(c, `${GRAPH}/${encodeURIComponent(commentId)}/replies`, { method: "POST", body: JSON.stringify({ message }) });
    return r.ok ? { ok: true, id: r.json?.id ?? null } : { ok: false, error: errText(c, r) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

// Hamara apna reply pehle se hai kya? known=false => lookup fail, retry mat karo (duplicate ka darr)
export async function findOwnReply(c, commentId) {
  const own = c?.env?.IG_BUSINESS_ID;
  if (!own) return { known: false, id: null };
  try {
    const r = await gfetch(c, `${GRAPH}/${encodeURIComponent(commentId)}/replies?fields=id,from&limit=25`);
    if (!r.ok || !Array.isArray(r.json?.data)) return { known: false, id: null };
    const mine = r.json.data.find((x) => x.from?.id === own);
    return { known: true, id: mine?.id ?? null };
  } catch {
    return { known: false, id: null };
  }
}

/* ---------- DM builder ---------- */
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const title = (l) => (l.type === "external" ? l.label : `${l.role} – ${l.company}`);
const hi = (u) => (u ? `👋 Hi @${clip(u, 30)}!` : "👋 Hi there!");

export function buildDm(links, username) {
  const n = links.length;
  const plain = [hi(username), ""]
    .concat(links.flatMap((l, i) => {
      const head = l.type === "external" ? `${i + 1}. ${l.label}` : `${i + 1}. 🏢 ${l.company}\n💼 ${l.role}`;
      return [head, `🔗 ${l.url}`, ""];
    }))
    .concat(["Good luck! 🍀 — Hire Daily"]).join("\n");

  let attachment;
  if (n === 1) {
    const l = links[0];
    const text = l.type === "external"
      ? `${hi(username)}\n\n${l.label}\n\nTap the button below 👇`
      : `${hi(username)}\n\n🏢 Company: ${l.company}\n💼 Role: ${l.role}\n\nTap the button below to apply 👇`;
    attachment = { type: "template", payload: { template_type: "button", text: clip(text, 640), buttons: [
      { type: "web_url", url: l.url, title: l.type === "external" ? "Open Link" : "Apply Now" },
    ] } };
  } else if (n <= 3) {
    const text = `${hi(username)} Here are your links:\n\n` + links.map((l, i) => `${i + 1}. ${clip(title(l), 90)}`).join("\n") + "\n\nTap a button below 👇";
    attachment = { type: "template", payload: { template_type: "button", text: clip(text, 640), buttons: links.map((l, i) => ({
      type: "web_url", url: l.url, title: `${i + 1}. ${clip(l.type === "external" ? l.label : l.company, 16)}`,
    })) } };
  } else {
    attachment = { type: "template", payload: { template_type: "generic", elements: links.map((l) => ({
      title: clip(l.type === "external" ? l.label : l.role, 80),
      subtitle: clip(l.type === "external" ? hostOf(l.url) : l.company, 80),
      buttons: [{ type: "web_url", url: l.url, title: l.type === "external" ? "Open Link" : "Apply Now" }],
    })) } };
  }
  return { attachment, plain: clip(plain, 900) };
}

// Comment ka "private reply". Meta structured message reject kare to plain text (reject hone par private reply kharch nahi hota)
export async function sendDm(c, commentId, dm) {
  if (dry(c)) return { ok: true, id: "dry-run" };
  const url = `${GRAPH}/${encodeURIComponent(c.env.IG_BUSINESS_ID)}/messages`;
  const recipient = { comment_id: commentId };
  try {
    const a = await gfetch(c, url, { method: "POST", body: JSON.stringify({ recipient, message: { attachment: dm.attachment } }) });
    if (a.ok) return { ok: true, id: a.json?.message_id ?? null };
    const first = errText(c, a);
    const b = await gfetch(c, url, { method: "POST", body: JSON.stringify({ recipient, message: { text: dm.plain } }) });
    if (b.ok) return { ok: true, id: b.json?.message_id ?? null };
    return { ok: false, error: first };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}

export async function fetchMedia(c, limit = 25) {
  const r = await gfetch(c, `${GRAPH}/me/media?fields=id,permalink,caption,media_type,timestamp&limit=${limit}`);
  if (!r.ok) return { media: [], error: errText(c, r) };
  return { media: (r.json?.data || []).filter((m) => m.id), error: null };
}

export async function fetchComments(c, mediaId, maxPages = 6) {
  const out = [];
  let url = `${GRAPH}/${encodeURIComponent(mediaId)}/comments?fields=id,text,username,timestamp,from&limit=50`;
  for (let p = 0; url && p < maxPages; p++) {
    let r;
    try { r = await gfetch(c, url); } catch { return { comments: out, error: "network_error" }; }
    if (!r.ok) return { comments: out, error: errText(c, r) };
    for (const x of r.json?.data || []) {
      if (!x.id) continue;
      const ts = x.timestamp ? Date.parse(x.timestamp) : NaN;
      out.push({ commentId: x.id, text: x.text ?? "", username: x.username ?? "", userId: x.from?.id ?? null, ts: Number.isFinite(ts) ? ts : 0 });
    }
    const next = r.json?.paging?.next;
    url = typeof next === "string" && next.startsWith("https://graph.instagram.com/") ? next : null;
  }
  return { comments: out, error: null };
}
