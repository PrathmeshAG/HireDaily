// @ts-nocheck
import * as M from "./meta.js";

export const DAY = 86400000;
export const MAX_ATTEMPTS = 3;
export const DEFAULT_REPLIES = [
  "Just sent you the details in DM 📩",
  "Check your DM for the link! ✨",
  "Details are in your inbox 📬",
  "Sent you the apply link in DM 🚀",
  "Done! Please check your DM 💌",
];

/* Cloudflare Free plan: ek invocation mein ~50 DB/fetch calls. Isliye har kaam "ops" gin kar budget mein rakhte hain. */
export function mkCtx(env) {
  const budget = Math.max(12, Number(env.OP_BUDGET) || 40);
  return { env, ops: 0, left() { return budget - this.ops; } };
}
const run = (c, sql, ...p) => { c.ops++; return c.env.DB.prepare(sql).bind(...p).run(); };
const all = async (c, sql, ...p) => { c.ops++; return (await c.env.DB.prepare(sql).bind(...p).all()).results ?? []; };
const one = (c, sql, ...p) => { c.ops++; return c.env.DB.prepare(sql).bind(...p).first(); };

/* ---------- rules ---------- */
let cache = { t: 0, rules: null };
const toRule = (r) => ({
  ...r,
  links: JSON.parse(r.links),
  replies: JSON.parse(r.replies),
  reply_enabled: !!r.reply_enabled,
  dm_enabled: !!r.dm_enabled,
  enabled: !!r.enabled,
});

export async function getRules(c, fresh = false) {
  if (!fresh && cache.rules && Date.now() - cache.t < 10000) return cache.rules;
  const rows = await all(c, "SELECT * FROM rules");
  cache = { t: Date.now(), rules: rows.map(toRule) };
  return cache.rules;
}

export function matches(rule, text) {
  const ks = String(rule.keywords || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (!ks.length) return true; // koi keyword nahi = har comment
  const t = String(text || "").toLowerCase();
  return ks.some((k) => t.includes(k));
}

const safeUrl = (u) => {
  try {
    const x = new URL(String(u || "").trim());
    if (x.protocol !== "https:" || x.username || x.password || x.href.length > 1900) return null;
    return x.href;
  } catch { return null; }
}

export function validateRule(b) {
  b = b || {};
  const mediaId = String(b.mediaId || "").trim();
  if (!/^\d{5,30}$/.test(mediaId)) return { error: "Post (media) ID galat hai — sirf number hota hai." };

  let keywords = String(b.keywords || "").split(/[,\n]/).map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (keywords.includes("*")) keywords = [];
  keywords = [...new Set(keywords)];
  if (keywords.join(", ").length > 300) return { error: "Keywords bahut lambe hain." };

  const rawLinks = Array.isArray(b.links) ? b.links : [];
  const links = [];
  for (const l of rawLinks) {
    if (!l || !String(l.url || "").trim()) continue; // khali row chhod do
    const url = safeUrl(l.url);
    if (!url) return { error: `Link #${links.length + 1}: sirf https:// wala sahi link chalega.` };
    if (l.type === "external") {
      const label = String(l.label || "").trim();
      if (!label || label.length > 80) return { error: `Link #${links.length + 1}: external link ka naam chahiye (80 akshar tak).` };
      links.push({ type: "external", label, url });
    } else {
      const company = String(l.company || "").trim();
      const role = String(l.role || "").trim();
      if (!company || !role || company.length > 80 || role.length > 80) return { error: `Link #${links.length + 1}: company aur role dono chahiye (80 akshar tak).` };
      links.push({ type: "job", company, role, url });
    }
  }
  if (links.length < 1 || links.length > 5) return { error: "1 se 5 links chahiye." };

  let replies = (Array.isArray(b.replies) ? b.replies : []).map((r) => String(r || "").trim()).filter(Boolean);
  if (replies.some((r) => r.length > 300)) return { error: "Reply 300 akshar se chhota rakho." };
  replies = replies.slice(0, 5);
  if (!replies.length) replies = DEFAULT_REPLIES.slice();

  const replyEnabled = b.replyEnabled !== false;
  const dmEnabled = b.dmEnabled !== false;
  if (!replyEnabled && !dmEnabled) return { error: "Comment reply ya DM — kam se kam ek on rakho." };

  return {
    rule: { mediaId, postLabel: String(b.postLabel || "").trim().slice(0, 120), keywords: keywords.join(", "), links, replies, replyEnabled, dmEnabled },
  };
}

export async function saveRule(c, r) {
  const now = Date.now();
  const row = await one(
    c,
    `INSERT INTO rules(media_id,post_label,keywords,links,replies,reply_enabled,dm_enabled,enabled,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,1,?,?)
     ON CONFLICT(media_id) DO UPDATE SET post_label=excluded.post_label, keywords=excluded.keywords, links=excluded.links,
       replies=excluded.replies, reply_enabled=excluded.reply_enabled, dm_enabled=excluded.dm_enabled, enabled=1, updated_at=excluded.updated_at
     RETURNING id`,
    r.mediaId, r.postLabel, r.keywords, JSON.stringify(r.links), JSON.stringify(r.replies),
    r.replyEnabled ? 1 : 0, r.dmEnabled ? 1 : 0, now, now,
  );
  cache.t = 0;
  return row.id;
}

/* ---------- queue ---------- */
async function enqueue(c, rule, ev, source) {
  const now = Date.now();
  const reply_status = rule.reply_enabled ? "pending" : "skipped";
  const dm_status = rule.dm_enabled ? "pending" : "skipped";
  const res = await run(
    c,
    `INSERT OR IGNORE INTO comments(comment_id,media_id,rule_id,user_id,username,text,source,comment_ts,reply_status,dm_status,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    ev.commentId, rule.media_id, rule.id, ev.userId ?? null, ev.username ?? null, String(ev.text ?? "").slice(0, 500), source,
    ev.ts || now, reply_status, dm_status, now, now,
  );
  if (res.meta?.changes !== 1) return null; // pehle se hai (duplicate webhook / backfill)
  return {
    comment_id: ev.commentId, user_id: ev.userId ?? null, username: ev.username ?? null, comment_ts: ev.ts || now,
    reply_status, dm_status, reply_text: null, attempts: 0,
  };
}

const done = (s) => s === "sent" || s === "skipped";

export async function processRow(c, row, rule) {
  const now = Date.now();
  const claim = await run(
    c,
    "UPDATE comments SET lock_until=?, attempts=attempts+1, updated_at=? WHERE comment_id=? AND lock_until<? AND attempts<?",
    now + 90000, now, row.comment_id, now, MAX_ATTEMPTS,
  );
  if (claim.meta?.changes !== 1) return "busy";

  const prior = row.attempts; // is baar se pehle kitni koshish ho chuki
  let reply = row.reply_status, dm = row.dm_status, replyText = row.reply_text, err = null;

  if (!rule || !rule.enabled) {
    reply = done(reply) ? reply : "skipped";
    dm = done(dm) ? dm : "skipped";
    err = "rule band ya delete ho gaya";
  } else {
    // Rule badalne ke baad jo step ab band hai use skip karo
    if (!rule.reply_enabled && !done(reply)) reply = "skipped";
    if (!rule.dm_enabled && !done(dm)) dm = "skipped";
    // Same banda isi post par dobara comment kare to dusra DM nahi
    if (dm === "pending" && prior === 0 && row.user_id) {
      const dup = await one(c, "SELECT comment_id FROM comments WHERE media_id=? AND user_id=? AND comment_id<>? AND dm_status='sent' LIMIT 1", rule.media_id, row.user_id, row.comment_id);
      if (dup) { reply = done(reply) ? reply : "skipped"; dm = "skipped"; err = "isi user ko is post par DM pehle ja chuka hai"; }
    }
    // Instagram: private reply sirf ~7 din tak
    if (dm === "pending" || dm === "failed") {
      if (now - row.comment_ts > 7 * DAY - 3600000) { dm = "skipped"; err = "comment 7 din se purana hai (Instagram DM limit)"; }
    }

    // 1) public reply
    if (rule.reply_enabled && (reply === "pending" || reply === "failed")) {
      let alreadyThere = false, unknown = false;
      if (prior > 0) {
        const f = await M.findOwnReply(c, row.comment_id);
        if (f.known && f.id) { reply = "sent"; alreadyThere = true; }
        else if (!f.known) unknown = true; // check nahi ho paya: duplicate ke darr se abhi mat bhejo
      }
      if (!alreadyThere && !unknown) {
        const text = replyText || rule.replies[Math.floor(Math.random() * rule.replies.length)];
        const r = await M.sendReply(c, row.comment_id, text);
        if (r.ok) { reply = "sent"; replyText = text; } else { reply = "failed"; err = `reply: ${r.error}`; }
      }
    }

    // 2) DM (ek comment par Meta sirf ek private reply allow karta hai, isliye retry duplicate nahi banata)
    if (rule.dm_enabled && (dm === "pending" || dm === "failed")) {
      const r = await M.sendDm(c, row.comment_id, M.buildDm(rule.links, row.username));
      if (r.ok) dm = "sent";
      else if (prior > 0 && /already/i.test(r.error || "")) dm = "sent"; // pichli koshish pahunch chuki thi
      else { dm = "failed"; err = (err ? err + " | " : "") + `dm: ${r.error}`; }
    }
  }

  if (done(reply) && done(dm) && !/purana|pehle ja chuka|band ya delete/.test(err || "")) err = null;
  await run(
    c,
    "UPDATE comments SET reply_status=?, dm_status=?, reply_text=?, error=?, lock_until=0, updated_at=? WHERE comment_id=?",
    reply, dm, replyText ?? null, err, Date.now(), row.comment_id,
  );
  return "ok";
}

/* ---------- webhook ---------- */
export async function ingestWebhook(c, events) {
  const rules = await getRules(c);
  const byId = new Map(rules.map((r) => [r.id, r]));
  const fresh = [];
  for (const ev of events.slice(0, 30)) {
    if (!ev.commentId || !ev.mediaId) continue;
    if (ev.parentId) continue; // kisi comment ka reply hai (hamare apne reply bhi yahi hain)
    if (ev.userId && ev.userId === c.env.IG_BUSINESS_ID) continue; // apna comment
    const rule = rules.find((r) => r.media_id === ev.mediaId && r.enabled);
    if (!rule || !matches(rule, ev.text)) continue;
    const row = await enqueue(c, rule, ev, "webhook");
    if (row) fresh.push({ row, rule });
  }
  let n = 0;
  for (const { row, rule } of fresh) {
    if (c.left() < 8) break; // baaki cron utha lega
    await processRow(c, row, byId.get(rule.id));
    n++;
  }
  return { received: events.length, queued: fresh.length, processed: n };
}

/* ---------- cron / "Run now" ---------- */
export async function tick(c) {
  const now = Date.now();
  const rules = await getRules(c, true);
  const byId = new Map(rules.map((r) => [r.id, r]));
  let processed = 0;

  const rows = await all(
    c,
    `SELECT * FROM comments WHERE attempts<? AND lock_until<? AND updated_at<?
       AND NOT (reply_status IN ('sent','skipped') AND dm_status IN ('sent','skipped'))
     ORDER BY created_at LIMIT 10`,
    MAX_ATTEMPTS, now, now - 20000,
  );
  for (const row of rows) {
    if (c.left() < 8) break;
    if ((await processRow(c, row, byId.get(row.rule_id))) === "ok") processed++;
  }

  if (c.left() >= 10) {
    const job = await one(c, "SELECT * FROM backfill ORDER BY created_at LIMIT 1");
    if (job) {
      const items = JSON.parse(job.items);
      const rule = byId.get(job.rule_id);
      let i = 0;
      while (i < items.length && c.left() >= 8) {
        const it = items[i++];
        if (!rule || !rule.enabled) continue;
        const row = await enqueue(c, rule, it, "backfill");
        if (row) { await processRow(c, row, rule); processed++; }
      }
      const rest = items.slice(i);
      if (!rest.length) await run(c, "DELETE FROM backfill WHERE rule_id=?", job.rule_id);
      else await run(c, "UPDATE backfill SET items=?, updated_at=? WHERE rule_id=?", JSON.stringify(rest), Date.now(), job.rule_id);
    }
  }
  return { processed, remaining: (await counts(c)).remaining };
}

export async function startBackfill(c, rule) {
  const got = await M.fetchComments(c, rule.media_id, 6);
  const cutoff = Date.now() - 7 * DAY + 3600000;
  const stats = { fetched: got.comments.length, tooOld: 0, noKeyword: 0, queued: 0, error: got.error };
  const items = [];
  for (const cm of got.comments) {
    if (cm.userId && cm.userId === c.env.IG_BUSINESS_ID) continue;
    if (cm.ts && cm.ts < cutoff) { stats.tooOld++; continue; }
    if (!matches(rule, cm.text)) { stats.noKeyword++; continue; }
    items.push({ commentId: cm.commentId, text: cm.text, username: cm.username, userId: cm.userId, ts: cm.ts || Date.now() });
  }
  // sabse purane pehle
  items.sort((a, b) => a.ts - b.ts);
  if (items.length) {
    const now = Date.now();
    await run(c, "INSERT OR REPLACE INTO backfill(rule_id,media_id,items,created_at,updated_at) VALUES(?,?,?,?,?)", rule.id, rule.media_id, JSON.stringify(items), now, now);
  }
  stats.queued = items.length;
  return stats;
}

/* ---------- admin helpers ---------- */
export async function counts(c) {
  const t = await one(
    c,
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(dm_status='sent'),0) AS dm_sent,
       COALESCE(SUM(reply_status='sent'),0) AS reply_sent,
       COALESCE(SUM(NOT (reply_status IN ('sent','skipped') AND dm_status IN ('sent','skipped')) AND attempts>=?),0) AS failed,
       COALESCE(SUM(NOT (reply_status IN ('sent','skipped') AND dm_status IN ('sent','skipped')) AND attempts<?),0) AS pending
     FROM comments`,
    MAX_ATTEMPTS, MAX_ATTEMPTS,
  );
  const b = await one(c, "SELECT COALESCE(SUM(json_array_length(items)),0) AS n FROM backfill");
  return { ...t, backfillLeft: b?.n ?? 0, remaining: (t?.pending ?? 0) + (b?.n ?? 0) };
}

export async function listRulesWithStats(c) {
  const rules = await getRules(c, true);
  const rows = await all(
    c,
    `SELECT rule_id, COUNT(*) AS total, SUM(dm_status='sent') AS dm_sent, SUM(reply_status='sent') AS reply_sent,
       SUM(NOT (reply_status IN ('sent','skipped') AND dm_status IN ('sent','skipped')) AND attempts>=?) AS failed
     FROM comments GROUP BY rule_id`,
    MAX_ATTEMPTS,
  );
  const m = new Map(rows.map((r) => [r.rule_id, r]));
  return rules.map((r) => ({ ...r, stats: m.get(r.id) || { total: 0, dm_sent: 0, reply_sent: 0, failed: 0 } }));
}

export function recentLogs(c, limit = 40) {
  return all(
    c,
    `SELECT comment_id, media_id, username, text, source, reply_status, dm_status, attempts, error, created_at
     FROM comments ORDER BY created_at DESC LIMIT ?`,
    Math.min(Math.max(limit, 1), 100),
  );
}

export async function retryFailed(c) {
  const r = await run(
    c,
    `UPDATE comments SET attempts=1, lock_until=0, updated_at=0,
       reply_status=CASE WHEN reply_status='failed' THEN 'pending' ELSE reply_status END,
       dm_status=CASE WHEN dm_status='failed' THEN 'pending' ELSE dm_status END
     WHERE attempts>=? AND NOT (reply_status IN ('sent','skipped') AND dm_status IN ('sent','skipped'))`,
    MAX_ATTEMPTS,
  );
  // attempts=1 rakha hai (0 nahi): taaki dobara bhejne se pehle "hamara reply pehle se hai kya" check ho
  return r.meta?.changes ?? 0;
}

export async function setEnabled(c, id, enabled) {
  await run(c, "UPDATE rules SET enabled=?, updated_at=? WHERE id=?", enabled ? 1 : 0, Date.now(), id);
  cache.t = 0;
}

export async function deleteRule(c, id) {
  await run(c, "DELETE FROM backfill WHERE rule_id=?", id);
  await run(c, "DELETE FROM rules WHERE id=?", id);
  cache.t = 0;
}
