import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function computeMetaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected = computeMetaSignature(rawBody, appSecret);
  const provided = signatureHeader.trim();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function captureRawBody(req: Request, _res: Response, buffer: Buffer): void {
  req.rawBody = Buffer.from(buffer);
}

export function requireMetaWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET") {
    next();
    return;
  }

  const rawBody = req.rawBody;
  const signatureHeader = req.get("x-hub-signature-256") ?? undefined;

  if (!rawBody) {
    res.status(401).json({ error: "webhook_signature_unavailable" });
    return;
  }

  if (!verifyMetaWebhookSignature(rawBody, signatureHeader, env.meta.appSecret)) {
    res.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }

  // The webhook route uses express.raw so signature verification always sees
  // the exact signed bytes. Restore the parsed JSON body only after the HMAC
  // has been accepted; the existing webhook parser and automation remain
  // unchanged.
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
    } catch {
      res.status(400).json({ error: "invalid_webhook_json" });
      return;
    }
  }

  next();
}
