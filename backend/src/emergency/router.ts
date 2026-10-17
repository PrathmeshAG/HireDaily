import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { api, handleWebhookPayload } from "./core.js";
import { renderPage } from "./ui.js";
import { tick, mkCtx } from "./engine.js";
import { d1RestConfigured, makeD1Rest } from "./d1-rest.js";

/**
 * EMERGENCY AUTOMATION (Cloudflare D1, bina Firebase).
 * Asli backend ke env variables hi use hote hain:
 *   META_ACCESS_TOKEN, META_APP_SECRET, INSTAGRAM_BUSINESS_ID,
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_API_TOKEN, EMERGENCY_SESSION_SECRET
 * Optional: EMERGENCY_DRY_RUN (default "true" = asli message nahi jata), EMERGENCY_OP_BUDGET (default 30), CRON_SECRET
 */
export function emergencyConfigured(): boolean {
  return d1RestConfigured() && !!process.env.EMERGENCY_SESSION_SECRET?.trim();
}

function emergencyEnv() {
  const e = process.env;
  return {
    DB: makeD1Rest(e),
    META_ACCESS_TOKEN: e.META_ACCESS_TOKEN,
    META_APP_SECRET: e.META_APP_SECRET,
    IG_BUSINESS_ID: e.INSTAGRAM_BUSINESS_ID,
    SESSION_SECRET: e.EMERGENCY_SESSION_SECRET,
    DRY_RUN: e.EMERGENCY_DRY_RUN ?? "true",
    OP_BUDGET: e.EMERGENCY_OP_BUDGET ?? "30",
  };
}

/**
 * Webhook ke raste mein (signature check ke BAAD) lagta hai. Emergency mein map hue posts par reply + DM bhejta hai,
 * baaki sab ignore. Kuch bhi fail ho to asli flow pe asar nahi: hamesha next() chalta hai.
 */
export async function emergencyForward(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (req.method === "POST" && req.rawBody && emergencyConfigured()) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const payload: unknown = JSON.parse(req.rawBody.toString("utf8"));
      await Promise.race([
        handleWebhookPayload(emergencyEnv(), payload),
        new Promise((resolve) => { timer = setTimeout(resolve, 9000); }),
      ]);
    } catch (error) {
      console.error("Emergency forward failed", error instanceof Error ? error.message : "unknown_error");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  next();
}

export const emergencyRouter = Router();

// Admin page: /emergency-admin
emergencyRouter.get("/", (_req: Request, res: Response) => {
  res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY" });
  res.send(renderPage("/emergency-admin/api/"));
});

// Admin API: /emergency-admin/api/*  (login D1 ke emergency_admin_credentials table se)
emergencyRouter.use("/api", async (req: Request, res: Response) => {
  if (!emergencyConfigured()) {
    res.status(503).json({ error: "Emergency service configured nahi hai." });
    return;
  }
  try {
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(`https://emergency.local/api${req.url}`, {
      method: req.method,
      headers: { Authorization: req.get("authorization") ?? "", "CF-Connecting-IP": req.ip ?? "unknown", "Content-Type": "application/json" },
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });
    const out = await api(request, emergencyEnv(), new URL(request.url));
    res.status(out.status).type("application/json").send(await out.text());
  } catch (error) {
    console.error("Emergency API failed", error instanceof Error ? error.message : "unknown_error");
    res.status(500).json({ error: "Server error — dobara try karo." });
  }
});

// Optional timer (cron-job.org): GET /emergency-admin/cron  Header: Authorization: Bearer <CRON_SECRET>
emergencyRouter.get("/cron", async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !emergencyConfigured()) { res.status(503).json({ error: "not_configured" }); return; }
  if (req.get("authorization") !== `Bearer ${secret}`) { res.status(401).json({ error: "unauthorized" }); return; }
  try {
    res.json(await tick(mkCtx(emergencyEnv())));
  } catch {
    res.status(500).json({ error: "cron_failed" });
  }
});
