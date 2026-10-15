import crypto from "node:crypto";

const required = ["EMERGENCY_ADMIN_EMAIL", "EMERGENCY_ADMIN_PASSWORD_HASH", "EMERGENCY_SESSION_SECRET", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_D1_API_TOKEN"] as const;
function cfg(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Emergency service is not configured: missing ${name}`);
  return value;
}
export function emergencyConfigured(): boolean { return required.every((name) => !!process.env[name]?.trim()); }
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<{ rows: T[]; changes: number }> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg("CLOUDFLARE_ACCOUNT_ID"))}/d1/database/${encodeURIComponent(cfg("CLOUDFLARE_D1_DATABASE_ID"))}/query`;
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${cfg("CLOUDFLARE_D1_API_TOKEN")}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql, params }) });
  if (!response.ok) throw new Error("Emergency storage request failed");
  const payload = await response.json() as { success?: boolean; result?: Array<{ results?: T[]; meta?: { changes?: number } }> };
  if (!payload.success) throw new Error("Emergency storage query failed");
  const result = payload.result?.[0];
  return { rows: result?.results ?? [], changes: result?.meta?.changes ?? 0 };
}
export async function initializeEmergencyStore(): Promise<void> {
  await query(`CREATE TABLE IF NOT EXISTS emergency_admin_credentials (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  await query(`CREATE TABLE IF NOT EXISTS emergency_mappings (media_id TEXT PRIMARY KEY, company TEXT NOT NULL DEFAULT '', role TEXT NOT NULL, location TEXT NOT NULL, experience TEXT NOT NULL, apply_url TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  try { await query("ALTER TABLE emergency_mappings ADD COLUMN company TEXT NOT NULL DEFAULT ''"); } catch { /* existing schema already has company */ }
  await query(`CREATE TABLE IF NOT EXISTS emergency_actions (action_id TEXT PRIMARY KEY, created_at TEXT NOT NULL)`);
  // Bootstrap only the one configured admin; authentication checks the stored D1 row.
  await query("INSERT INTO emergency_admin_credentials(email,password_hash,updated_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at", [cfg("EMERGENCY_ADMIN_EMAIL").toLowerCase(), cfg("EMERGENCY_ADMIN_PASSWORD_HASH").toLowerCase(), new Date().toISOString()]);
}
export async function verifyEmergencyCredentials(email: string, password: string): Promise<boolean> {
  await initializeEmergencyStore();
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== cfg("EMERGENCY_ADMIN_EMAIL").toLowerCase() || !password || password.length > 256) return false;
  const result = await query<{ email: string; password_hash: string }>("SELECT email,password_hash FROM emergency_admin_credentials WHERE email=? LIMIT 1", [normalizedEmail]);
  const row = result.rows[0];
  if (!row) return false;
  const supplied = crypto.createHash("sha256").update(password).digest();
  let expected: Buffer;
  try { expected = Buffer.from(row.password_hash, "hex"); } catch { return false; }
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
export async function saveEmergencyMapping(input: { mediaId: string; company: string; role: string; location: string; experience: string; applyUrl: string }): Promise<void> {
  await initializeEmergencyStore();
  await query(`INSERT INTO emergency_mappings(media_id,company,role,location,experience,apply_url,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(media_id) DO UPDATE SET company=excluded.company,role=excluded.role,location=excluded.location,experience=excluded.experience,apply_url=excluded.apply_url,updated_at=excluded.updated_at`, [input.mediaId,input.company,input.role,input.location,input.experience,input.applyUrl,new Date().toISOString()]);
}
export async function getEmergencyMapping(mediaId: string): Promise<{ mediaId: string; company: string; role: string; location: string; experience: string; applyUrl: string } | null> {
  await initializeEmergencyStore();
  const result = await query<{ mediaId: string; company: string; role: string; location: string; experience: string; applyUrl: string }>("SELECT media_id AS mediaId,company,role,location,experience,apply_url AS applyUrl FROM emergency_mappings WHERE media_id=? LIMIT 1",[mediaId]);
  return result.rows[0] ?? null;
}
export async function claimEmergencyAction(actionId: string): Promise<boolean> {
  await initializeEmergencyStore();
  const result = await query("INSERT OR IGNORE INTO emergency_actions(action_id,created_at) VALUES(?,?)",[actionId,new Date().toISOString()]);
  return result.changes === 1;
}
export async function listEmergencyMappings(): Promise<Array<Record<string, unknown>>> {
  await initializeEmergencyStore();
  return (await query("SELECT media_id AS mediaId,company,role,location,experience,apply_url AS applyUrl,updated_at AS updatedAt FROM emergency_mappings ORDER BY updated_at DESC LIMIT 100")).rows;
}


export async function processEmergencyInstagramComment(input: { commentId: string; mediaId: string; commentText: string; username: string | null }): Promise<{ processed: boolean; reason: string }> {
  if (!input.commentId || !input.mediaId) return { processed: false, reason: "missing_comment_or_media_id" };
  await initializeEmergencyStore();
  const mapped = await getEmergencyMapping(input.mediaId);
  if (!mapped) return { processed: false, reason: "no_job_mapping" };
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const igUserId = (process.env.INSTAGRAM_BUSINESS_ID || process.env.INSTAGRAM_USER_ID || process.env.META_INSTAGRAM_USER_ID || "").trim();
  if (!token || !igUserId) return { processed: false, reason: "meta_credentials_not_configured" };
  const claim = await query("INSERT OR IGNORE INTO emergency_actions(action_id,created_at) VALUES(?,?)", ["comment:" + input.commentId, new Date().toISOString()]);
  if (claim.changes !== 1) return { processed: false, reason: "duplicate" };

  const replies = [
    "Just sent you the details in DM 📩",
    "Check your DM for the job link! ✨",
    "Details are in your inbox 📬",
    "Sent you the application link via DM 🚀",
  ];
  const publicReply = replies[Math.floor(Math.random() * replies.length)];
  const graph = "https://graph.facebook.com/v24.0";
  const replyResponse = await fetch(`${graph}/${encodeURIComponent(input.commentId)}/replies`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: publicReply }),
  });
  if (!replyResponse.ok) {
    const body = await replyResponse.text().catch(() => "");
    throw new Error(`Meta public reply failed (${replyResponse.status}): ${body.slice(0, 250)}`);
  }

  const dm = [
    "👋 Hi there! Thanks for your interest in this opportunity.",
    "",
    `🏢 Company: ${mapped.company}`,
    `💼 Role: ${mapped.role}`,
    "",
    "🔗 Apply here:",
    mapped.applyUrl,
    "",
    "Good luck with your application! 🍀",
    "— Hire Daily",
  ].join("\\n");
  const dmResponse = await fetch(`${graph}/${encodeURIComponent(igUserId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: input.commentId }, message: { text: dm } }),
  });
  if (!dmResponse.ok) {
    const body = await dmResponse.text().catch(() => "");
    throw new Error(`Meta private reply failed (${dmResponse.status}): ${body.slice(0, 250)}`);
  }
  return { processed: true, reason: "reply_and_dm_sent" };
}
