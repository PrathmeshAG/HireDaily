import crypto from "node:crypto";

const required = ["EMERGENCY_ADMIN_SECRET", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_D1_DATABASE_ID", "CLOUDFLARE_D1_API_TOKEN"] as const;
function cfg(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Emergency service is not configured: missing ${name}`);
  return value;
}
export function emergencyConfigured(): boolean {
  return required.every((name) => !!process.env[name]?.trim());
}
function token(): string { return cfg("CLOUDFLARE_D1_API_TOKEN"); }
async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg("CLOUDFLARE_ACCOUNT_ID"))}/d1/database/${encodeURIComponent(cfg("CLOUDFLARE_D1_DATABASE_ID"))}/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
  });
  if (!response.ok) throw new Error("Emergency storage request failed");
  const payload = await response.json() as { success?: boolean; errors?: unknown[]; result?: Array<{ results?: T[] }> };
  if (!payload.success) throw new Error("Emergency storage query failed");
  return payload.result?.[0]?.results ?? [];
}
export async function initializeEmergencyStore(): Promise<void> {
  await query(`CREATE TABLE IF NOT EXISTS emergency_mappings (
    media_id TEXT PRIMARY KEY, role TEXT NOT NULL, location TEXT NOT NULL,
    experience TEXT NOT NULL, apply_url TEXT NOT NULL, updated_at TEXT NOT NULL
  )`);
  await query(`CREATE TABLE IF NOT EXISTS emergency_actions (
    action_id TEXT PRIMARY KEY, created_at TEXT NOT NULL
  )`);
}
export async function saveEmergencyMapping(input: {
  mediaId: string; role: string; location: string; experience: string; applyUrl: string;
}): Promise<void> {
  await initializeEmergencyStore();
  await query(`INSERT INTO emergency_mappings(media_id,role,location,experience,apply_url,updated_at)
    VALUES(?,?,?,?,?,?) ON CONFLICT(media_id) DO UPDATE SET role=excluded.role,location=excluded.location,
    experience=excluded.experience,apply_url=excluded.apply_url,updated_at=excluded.updated_at`,
    [input.mediaId, input.role, input.location, input.experience, input.applyUrl, new Date().toISOString()]);
}

export async function getEmergencyMapping(mediaId: string): Promise<{ mediaId: string; role: string; location: string; experience: string; applyUrl: string } | null> {
  await initializeEmergencyStore();
  const rows = await query<{ mediaId: string; role: string; location: string; experience: string; applyUrl: string }>(
    "SELECT media_id AS mediaId, role, location, experience, apply_url AS applyUrl FROM emergency_mappings WHERE media_id = ? LIMIT 1",
    [mediaId],
  );
  return rows[0] ?? null;
}
export async function claimEmergencyAction(actionId: string): Promise<boolean> {
  await initializeEmergencyStore();
  const url = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(cfg("CLOUDFLARE_ACCOUNT_ID")) + "/d1/database/" + encodeURIComponent(cfg("CLOUDFLARE_D1_DATABASE_ID")) + "/query";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
    body: JSON.stringify({ sql: "INSERT OR IGNORE INTO emergency_actions(action_id,created_at) VALUES(?,?)", params: [actionId, new Date().toISOString()] }),
  });
  if (!response.ok) throw new Error("Emergency action claim failed");
  const payload = await response.json() as { success?: boolean; result?: Array<{ meta?: { changes?: number } }> };
  if (!payload.success) throw new Error("Emergency action claim failed");
  return (payload.result?.[0]?.meta?.changes ?? 0) === 1;
}
export async function listEmergencyMappings(): Promise<Array<Record<string, unknown>>> {
  await initializeEmergencyStore();
  return query("SELECT media_id AS mediaId, role, location, experience, apply_url AS applyUrl, updated_at AS updatedAt FROM emergency_mappings ORDER BY updated_at DESC LIMIT 100");
}
export function verifyEmergencySecret(candidate: string): boolean {
  const expected = cfg("EMERGENCY_ADMIN_SECRET");
  // Match the normalization used when reading/signing the configured secret.
  // Avoid rejecting a correct code copied with accidental leading/trailing whitespace.
  const normalizedCandidate = candidate.trim();
  const a = crypto.createHash("sha256").update(normalizedCandidate).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
