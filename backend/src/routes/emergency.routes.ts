import { Router } from "express";
import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { emergencyConfigured, listEmergencyMappings, saveEmergencyMapping, verifyEmergencySecret } from "../services/emergency-store.service.js";

export const emergencyRouter = Router();
const sessions = new Map<string, number>();
const SESSION_MS = 30 * 60 * 1000;
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
function authenticated(req: import("express").Request): boolean {
  const raw = req.header("authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/.exec(raw);
  if (!match) return false;
  const expiry = sessions.get(match[1]);
  if (!expiry || expiry < Date.now()) { sessions.delete(match[1]); return false; }
  return true;
}
emergencyRouter.get("/status", (_req, res) => {
  res.json({ configured: emergencyConfigured(), storage: emergencyConfigured() ? "cloudflare-d1" : "not-configured" });
});
emergencyRouter.post("/login", loginLimiter, (req, res) => {
  if (!emergencyConfigured()) return res.status(503).json({ error: "Emergency service is not configured yet." });
  const secret = typeof req.body?.secret === "string" ? req.body.secret : "";
  if (secret.length < 1 || secret.length > 256 || !verifyEmergencySecret(secret)) {
    return res.status(401).json({ error: "Invalid access code." });
  }
  const session = crypto.randomBytes(32).toString("hex");
  sessions.set(session, Date.now() + SESSION_MS);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ token: session, expiresInSeconds: SESSION_MS / 1000 });
});
emergencyRouter.get("/mappings", async (req, res) => {
  if (!authenticated(req)) return res.status(401).json({ error: "Admin session required." });
  try { return res.json({ mappings: await listEmergencyMappings() }); }
  catch { return res.status(503).json({ error: "Emergency storage unavailable." }); }
});
emergencyRouter.post("/mappings", writeLimiter, async (req, res) => {
  if (!authenticated(req)) return res.status(401).json({ error: "Admin session required." });
  const { mediaId, role, location, experience, applyUrl } = req.body ?? {};
  if (typeof mediaId !== "string" || !/^\d{5,30}$/.test(mediaId) ||
      typeof role !== "string" || !role.trim() || role.length > 100 ||
      typeof location !== "string" || !location.trim() || location.length > 100 ||
      typeof experience !== "string" || experience.length > 50 ||
      typeof applyUrl !== "string" || applyUrl.length > 2048) {
    return res.status(400).json({ error: "Invalid mapping fields." });
  }
  let url: URL;
  try { url = new URL(applyUrl); } catch { return res.status(400).json({ error: "Invalid apply URL." }); }
  if (url.protocol !== "https:" || url.username || url.password) {
    return res.status(400).json({ error: "Apply URL must be a safe HTTPS URL." });
  }
  try {
    await saveEmergencyMapping({ mediaId: mediaId.trim(), role: role.trim(), location: location.trim(), experience: experience.trim(), applyUrl: url.toString() });
    return res.json({ message: "Mapping saved to emergency storage." });
  } catch {
    return res.status(503).json({ error: "Emergency storage unavailable; mapping was not saved." });
  }
});
