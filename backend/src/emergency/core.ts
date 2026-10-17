// @ts-nocheck
// Worker aur Vercel dono yahi file use karte hain (logic ek jagah rahe).
import * as M from "./meta.js";
import * as E from "./engine.js";

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- admin session (password -> signed token, 12 ghante) ---------- */
const sessionKey = (env) => String(env.SESSION_SECRET || "");
const sha256Hex = async (text) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, "0")).join("");
async function makeToken(env) {
  const exp = String(Date.now() + 12 * 3600 * 1000);
  return `${exp}.${await M.hmacHex(sessionKey(env), exp)}`;
}
async function authed(request, env) {
  const key = sessionKey(env);
  const m = /^Bearer (\d{10,16})\.([0-9a-f]{64})$/.exec(request.headers.get("Authorization") || "");
  if (!key || !m || Number(m[1]) < Date.now()) return false;
  return M.safeEqual(await M.hmacHex(key, m[1]), m[2]);
}

/* ---------- admin API ---------- */
export async function api(request, env, url) {
  const path = url.pathname.replace(/^\/api\//, "");
  const method = request.method;

  if (path === "login" && method === "POST") {
    if (!sessionKey(env)) return json({ error: "Session secret set nahi hai (EMERGENCY_SESSION_SECRET / SESSION_SECRET)." }, 503);
    const c0 = E.mkCtx(env);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const since = Date.now() - 15 * 60 * 1000;
    const fails = await c0.env.DB.prepare("SELECT COUNT(*) AS n FROM login_fails WHERE ip=? AND ts>?").bind(ip, since).first();
    if ((fails?.n ?? 0) >= 6) return json({ error: "Bahut galat koshish. 15 minute baad try karo." }, 429);

    const b = await request.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase();
    const pw = String(b.password || "");
    let good = false;
    if (email && pw && pw.length <= 256 && email.length <= 200) {
      const row = await env.DB.prepare("SELECT password_hash FROM emergency_admin_credentials WHERE lower(email)=? LIMIT 1").bind(email).first();
      // row na mile tab bhi hash nikaalte hain, taaki time se pata na chale ki email sahi tha ya nahi
      const stored = String(row?.password_hash || "0".repeat(64)).toLowerCase();
      good = M.safeEqual(await sha256Hex(pw), stored) && !!row;
    }
    if (!good) {
      await env.DB.prepare("INSERT INTO login_fails(ip,ts) VALUES(?,?)").bind(ip, Date.now()).run();
      await env.DB.prepare("DELETE FROM login_fails WHERE ts<?").bind(since).run();
      await sleep(800);
      return json({ error: "Email ya password galat hai." }, 401);
    }
    return json({ token: await makeToken(env) });
  }
  if (!(await authed(request, env))) return json({ error: "login required" }, 401);

  const c = E.mkCtx(env);

  if (path === "status" && method === "GET") {
    return json({
      dryRun: String(env.DRY_RUN ?? "").toLowerCase() === "true",
      config: { token: !!env.META_ACCESS_TOKEN, secret: !!env.META_APP_SECRET, verify: !!env.VERIFY_TOKEN, igId: !!env.IG_BUSINESS_ID && !/^PASTE/.test(env.IG_BUSINESS_ID) },
      counts: await E.counts(c),
    });
  }
  if (path === "media" && method === "GET") return json(await M.fetchMedia(c));
  if (path === "rules" && method === "GET") return json({ rules: await E.listRulesWithStats(c) });
  if (path === "logs" && method === "GET") return json({ logs: await E.recentLogs(c, Number(url.searchParams.get("limit")) || 40) });
  if (path === "run" && method === "POST") return json(await E.tick(c));
  if (path === "retry" && method === "POST") return json({ reset: await E.retryFailed(c) });

  if (path === "rules" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const v = E.validateRule(b);
    if (v.error) return json({ error: v.error }, 400);
    const id = await E.saveRule(c, v.rule);
    const rule = (await E.getRules(c, true)).find((r) => r.id === id);
    const backfill = b.backfill !== false && rule ? await E.startBackfill(c, rule) : null;
    return json({ id, backfill });
  }

  const m = /^rules\/(\d+)(?:\/(toggle))?$/.exec(path);
  if (m) {
    const id = Number(m[1]);
    if (m[2] === "toggle" && method === "POST") {
      const b = await request.json().catch(() => ({}));
      await E.setEnabled(c, id, !!b.enabled);
      return json({ ok: true });
    }
    if (!m[2] && method === "DELETE") { await E.deleteRule(c, id); return json({ ok: true }); }
  }
  return json({ error: "not found" }, 404);
}


/** Meta webhook ka JSON payload -> sirf unhi posts par kaam jo emergency mein map hain. */
export async function handleWebhookPayload(env, payload) {
  const events = M.parseComments(payload);
  if (!events.length) return { received: 0, queued: 0, processed: 0 };
  return E.ingestWebhook(E.mkCtx(env), events);
}
