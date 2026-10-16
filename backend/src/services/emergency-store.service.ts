
import crypto from "node:crypto";

const required = [
  "EMERGENCY_ADMIN_EMAIL",
  "EMERGENCY_ADMIN_PASSWORD_HASH",
  "EMERGENCY_SESSION_SECRET",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_D1_DATABASE_ID",
  "CLOUDFLARE_D1_API_TOKEN",
] as const;

function cfg(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Emergency service is not configured: missing ${name}`);
  return value;
}

export function emergencyConfigured(): boolean {
  return required.every((name) => !!process.env[name]?.trim());
}

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; changes: number }> {
  const url =
    `https://api.cloudflare.com/client/v4/accounts/` +
    `${encodeURIComponent(cfg("CLOUDFLARE_ACCOUNT_ID"))}/d1/database/` +
    `${encodeURIComponent(cfg("CLOUDFLARE_D1_DATABASE_ID"))}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg("CLOUDFLARE_D1_API_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) throw new Error("Emergency storage request failed");

  const payload = (await response.json()) as {
    success?: boolean;
    result?: Array<{ results?: T[]; meta?: { changes?: number } }>;
  };

  if (!payload.success) throw new Error("Emergency storage query failed");

  const result = payload.result?.[0];
  return {
    rows: result?.results ?? [],
    changes: result?.meta?.changes ?? 0,
  };
}

export async function initializeEmergencyStore(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS emergency_admin_credentials (
      email TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS emergency_mappings (
      media_id TEXT PRIMARY KEY,
      company TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      location TEXT NOT NULL,
      experience TEXT NOT NULL,
      apply_url TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  try {
    await query(
      "ALTER TABLE emergency_mappings ADD COLUMN company TEXT NOT NULL DEFAULT ''",
    );
  } catch {
    // Column already exists.
  }

  await query(`
    CREATE TABLE IF NOT EXISTS emergency_actions (
      action_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    )
  `);

  // Existing rows are marked unknown, not retried automatically.
  // This prevents re-sending messages whose delivery state cannot be verified.
  try {
    await query(
      "ALTER TABLE emergency_actions ADD COLUMN public_reply_status TEXT NOT NULL DEFAULT 'legacy_unknown'",
    );
  } catch {
    // Column already exists.
  }

  try {
    await query(
      "ALTER TABLE emergency_actions ADD COLUMN dm_status TEXT NOT NULL DEFAULT 'legacy_unknown'",
    );
  } catch {
    // Column already exists.
  }

  try {
    await query(
      "ALTER TABLE emergency_actions ADD COLUMN public_reply_text TEXT",
    );
  } catch {
    // Column already exists.
  }

  try {
    await query(
      "ALTER TABLE emergency_actions ADD COLUMN updated_at TEXT",
    );
  } catch {
    // Column already exists.
  }

  await query(
    `INSERT INTO emergency_admin_credentials(email,password_hash,updated_at)
     VALUES(?,?,?)
     ON CONFLICT(email) DO UPDATE SET
       password_hash=excluded.password_hash,
       updated_at=excluded.updated_at`,
    [
      cfg("EMERGENCY_ADMIN_EMAIL").toLowerCase(),
      cfg("EMERGENCY_ADMIN_PASSWORD_HASH").toLowerCase(),
      new Date().toISOString(),
    ],
  );
}

export async function verifyEmergencyCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  await initializeEmergencyStore();

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail !== cfg("EMERGENCY_ADMIN_EMAIL").toLowerCase() ||
    !password ||
    password.length > 256
  ) {
    return false;
  }

  const result = await query<{
    email: string;
    password_hash: string;
  }>(
    "SELECT email,password_hash FROM emergency_admin_credentials WHERE email=? LIMIT 1",
    [normalizedEmail],
  );

  const row = result.rows[0];
  if (!row) return false;

  const supplied = crypto.createHash("sha256").update(password).digest();
  const expected = Buffer.from(row.password_hash, "hex");

  return (
    expected.length === supplied.length &&
    crypto.timingSafeEqual(expected, supplied)
  );
}

export async function saveEmergencyMapping(input: {
  mediaId: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  applyUrl: string;
}): Promise<void> {
  await initializeEmergencyStore();

  await query(
    `INSERT INTO emergency_mappings
      (media_id,company,role,location,experience,apply_url,updated_at)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(media_id) DO UPDATE SET
       company=excluded.company,
       role=excluded.role,
       location=excluded.location,
       experience=excluded.experience,
       apply_url=excluded.apply_url,
       updated_at=excluded.updated_at`,
    [
      input.mediaId,
      input.company,
      input.role,
      input.location,
      input.experience,
      input.applyUrl,
      new Date().toISOString(),
    ],
  );
}

export async function deleteEmergencyMapping(mediaId: string): Promise<boolean> {
  await initializeEmergencyStore();
  const result = await query("DELETE FROM emergency_mappings WHERE media_id=?", [mediaId]);
  return result.changes === 1;
}

export async function getEmergencyMapping(mediaId: string): Promise<{
  mediaId: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  applyUrl: string;
} | null> {
  await initializeEmergencyStore();

  const result = await query<{
    mediaId: string;
    company: string;
    role: string;
    location: string;
    experience: string;
    applyUrl: string;
  }>(
    `SELECT media_id AS mediaId,company,role,location,
            experience,apply_url AS applyUrl
     FROM emergency_mappings WHERE media_id=? LIMIT 1`,
    [mediaId],
  );

  return result.rows[0] ?? null;
}

export async function claimEmergencyAction(actionId: string): Promise<boolean> {
  await initializeEmergencyStore();

  const result = await query(
    "INSERT OR IGNORE INTO emergency_actions(action_id,created_at) VALUES(?,?)",
    [actionId, new Date().toISOString()],
  );

  return result.changes === 1;
}

export async function listEmergencyMappings(): Promise<
  Array<Record<string, unknown>>
> {
  await initializeEmergencyStore();

  return (
    await query(
      `SELECT media_id AS mediaId,company,role,location,experience,
              apply_url AS applyUrl,updated_at AS updatedAt
       FROM emergency_mappings ORDER BY updated_at DESC LIMIT 100`,
    )
  ).rows;
}

export async function getEmergencyInstagramSubscription(subscribe = false): Promise<{ subscribedFields: string[]; subscribed: boolean; message: string }> {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("META_ACCESS_TOKEN is not configured");
  const endpoint = "https://graph.instagram.com/v24.0/me/subscribed_apps";
  const response = await fetch(endpoint, {
    method: subscribe ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    ...(subscribe ? { body: new URLSearchParams({ subscribed_fields: "comments,messages" }).toString() } : {}),
  });
  const body = await response.json().catch(() => ({})) as { data?: Array<{ subscribed_fields?: string[] }>; subscribed_fields?: string[]; success?: boolean; error?: { message?: string } };
  if (!response.ok || body.error) throw new Error(`Meta subscription check failed (${response.status}): ${body.error?.message || "Meta API rejected request"}`);
  const fields = Array.isArray(body.data) ? body.data.flatMap((row) => Array.isArray(row.subscribed_fields) ? row.subscribed_fields : []) : Array.isArray(body.subscribed_fields) ? body.subscribed_fields : [];
  return { subscribedFields: [...new Set(fields)], subscribed: fields.includes("comments"), message: subscribe ? "Subscription request sent; verify callback URL and fields in Meta Dashboard." : "Subscription fields read from Meta." };
}
export async function processEmergencyInstagramComment(input: {
  commentId: string;
  mediaId: string;
  commentText: string;
  username: string | null;
}): Promise<{ processed: boolean; reason: string }> {
  if (!input.commentId || !input.mediaId) {
    return { processed: false, reason: "missing_comment_or_media_id" };
  }

  await initializeEmergencyStore();

  const mapped = await getEmergencyMapping(input.mediaId);
  if (!mapped) return { processed: false, reason: "no_job_mapping" };

  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) {
    return { processed: false, reason: "meta_credentials_not_configured" };
  }

  const actionId = `comment:${input.commentId}`;
  const now = new Date().toISOString();

  await query(
    `INSERT OR IGNORE INTO emergency_actions
      (action_id,created_at,public_reply_status,dm_status,updated_at)
     VALUES(?,?,'pending','pending',?)`,
    [actionId, now, now],
  );

  const result = await query<{
    public_reply_status: string;
    dm_status: string;
    public_reply_text: string | null;
  }>(
    `SELECT public_reply_status,dm_status,public_reply_text
     FROM emergency_actions WHERE action_id=? LIMIT 1`,
    [actionId],
  );

  const action = result.rows[0];
  if (!action) throw new Error("Emergency action state could not be loaded");

  if (
    action.public_reply_status === "legacy_unknown" ||
    action.dm_status === "legacy_unknown"
  ) {
    return { processed: false, reason: "legacy_action_delivery_unknown" };
  }

  if (
    action.public_reply_status === "sent" &&
    action.dm_status === "sent"
  ) {
    return { processed: false, reason: "duplicate" };
  }

  // Instagram API with Instagram Login must use graph.instagram.com.
  const graph = "https://graph.instagram.com/v24.0";

  // Select exactly one public reply per comment; persist it before sending so retries never choose a different reply.
  const replies = [
    "Just sent you the details in DM 📩",
    "Check your DM for the job link! ✨",
    "Details are in your inbox 📬",
    "Sent you the application link via DM 🚀",
    "Application details are on the way—check your inbox! 💼",
  ];

  // Step 1: public reply
  if (action.public_reply_status !== "sent") {
    if (action.public_reply_status !== "pending") {
      return {
        processed: false,
        reason: "public_reply_in_progress_or_unknown",
      };
    }

    const publicText =
      action.public_reply_text ||
      replies[Math.floor(Math.random() * replies.length)];

    const claim = await query(
      `UPDATE emergency_actions
       SET public_reply_status='sending',public_reply_text=?,updated_at=?
       WHERE action_id=? AND public_reply_status='pending'`,
      [publicText, new Date().toISOString(), actionId],
    );

    if (claim.changes !== 1) {
      return { processed: false, reason: "public_reply_in_progress_or_unknown" };
    }

    // Network failures can have an ambiguous outcome. Keep "sending" in that
    // case rather than risk automatically posting the same reply twice.
    const replyResponse = await fetch(
      `${graph}/${encodeURIComponent(input.commentId)}/replies`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: publicText }),
      },
    );

    if (!replyResponse.ok) {
      const body = await replyResponse.text().catch(() => "");

      // Explicit API rejection: return this step to pending for a later retry.
      await query(
        `UPDATE emergency_actions
         SET public_reply_status='pending',updated_at=?
         WHERE action_id=? AND public_reply_status='sending'`,
        [new Date().toISOString(), actionId],
      );

      throw new Error(
        `Meta public reply failed (${replyResponse.status}): ${body.slice(0, 250)}`,
      );
    }

    await query(
      `UPDATE emergency_actions
       SET public_reply_status='sent',updated_at=?
       WHERE action_id=? AND public_reply_status='sending'`,
      [new Date().toISOString(), actionId],
    );
  }

  // Read current DM state after the public reply has been confirmed.
  const latest = await query<{ dm_status: string }>(
    "SELECT dm_status FROM emergency_actions WHERE action_id=? LIMIT 1",
    [actionId],
  );

  const dmStatus = latest.rows[0]?.dm_status;

  if (dmStatus === "sent") {
    return { processed: true, reason: "reply_and_dm_already_sent" };
  }

  if (dmStatus !== "pending") {
    return { processed: false, reason: "dm_in_progress_or_unknown" };
  }

  const dmClaim = await query(
    `UPDATE emergency_actions SET dm_status='sending',updated_at=?
     WHERE action_id=? AND dm_status='pending'
       AND public_reply_status='sent'`,
    [new Date().toISOString(), actionId],
  );

  if (dmClaim.changes !== 1) {
    return {
      processed: false,
      reason: "dm_in_progress_or_public_reply_not_confirmed",
    };
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
  ].join("\n");

  const instagramUserId =
    process.env.INSTAGRAM_BUSINESS_ID?.trim() ||
    process.env.INSTAGRAM_USER_ID?.trim() ||
    process.env.META_INSTAGRAM_USER_ID?.trim();

  if (!instagramUserId) {
    await query(
      `UPDATE emergency_actions SET dm_status='pending',updated_at=?
       WHERE action_id=? AND dm_status='sending'`,
      [new Date().toISOString(), actionId],
    );
    throw new Error("Instagram Login DM requires INSTAGRAM_BUSINESS_ID (or INSTAGRAM_USER_ID)");
  }

  // Instagram Login private replies use the Instagram Send API with
  // recipient.comment_id; the Facebook Login /private_replies route is not used.
  const dmResponse = await fetch(
    `${graph}/${encodeURIComponent(instagramUserId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { comment_id: input.commentId },
        message: { text: dm },
      }),
    },
  );

  if (!dmResponse.ok) {
    const body = await dmResponse.text().catch(() => "");

    await query(
      `UPDATE emergency_actions SET dm_status='pending',updated_at=?
       WHERE action_id=? AND dm_status='sending'`,
      [new Date().toISOString(), actionId],
    );

    throw new Error(
      `Meta private reply failed (${dmResponse.status}): ${body.slice(0, 250)}`,
    );
  }

  await query(
    `UPDATE emergency_actions SET dm_status='sent',updated_at=?
     WHERE action_id=? AND dm_status='sending'`,
    [new Date().toISOString(), actionId],
  );

  return { processed: true, reason: "reply_and_dm_sent" };
}
