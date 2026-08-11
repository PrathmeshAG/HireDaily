import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const META_SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

/**
 * Calculate Meta's HMAC over the exact request bytes captured by the JSON
 * parser's verify hook. Never derive the signature from req.body.
 */
export function computeMetaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

function normalizeConfiguredSecret(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractProvidedDigest(signatureHeader: string | undefined): string | null {
  if (!signatureHeader) return null;
  const match = META_SIGNATURE_RE.exec(signatureHeader.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

function safeEqualHex(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");
  if (left.length !== 32 || right.length !== 32) return false;
  return timingSafeEqual(left, right);
}

export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  const secret = normalizeConfiguredSecret(appSecret);
  const providedDigest = extractProvidedDigest(signatureHeader);
  if (!secret || !providedDigest) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const expectedDigest = createHmac("sha256", secret).update(body).digest("hex");
  return safeEqualHex(expectedDigest, providedDigest);
}

/** Express JSON verify hook: called with the exact raw bytes before parsing. */
export function captureRawBody(req: Request, _res: Response, buffer: Buffer): void {
  req.rawBody = Buffer.from(buffer);
}

function bodyKind(body: unknown): string {
  if (Buffer.isBuffer(body)) return "buffer";
  if (typeof body === "string") return "string";
  if (body === undefined) return "undefined";
  if (body === null) return "null";
  return typeof body === "object" ? "object" : typeof body;
}

function emitDiagnostics(
  req: Request,
  verificationResult: "valid" | "invalid" | "missing_raw_body",
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
): void {
  const contentLengthHeader = req.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
  const providedDigest = extractProvidedDigest(signatureHeader);

  logger.info("Instagram webhook signature diagnostics", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split("?", 1)[0],
    contentType: req.get("content-type") ?? null,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    signaturePresent: !!signatureHeader,
    signatureAlgorithm: providedDigest ? "sha256" : signatureHeader ? "invalid" : null,
    metaAppSecretPresent: !!normalizeConfiguredSecret(env.meta.appSecret),
    bodyKind: bodyKind(req.body),
    rawBodyPresent: !!rawBody,
    rawBodyLength: rawBody?.length ?? 0,
    parsedBodyType: bodyKind(req.body),
    verificationResult,
  });
}

export function requireMetaWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "GET") {
    next();
    return;
  }

  const rawBody = req.rawBody;
  const signatureHeader = req.get("x-hub-signature-256") ?? undefined;

  if (!rawBody) {
    emitDiagnostics(req, "missing_raw_body", rawBody, signatureHeader);
    res.status(401).json({ error: "webhook_signature_unavailable" });
    return;
  }

  if (!verifyMetaWebhookSignature(rawBody, signatureHeader, env.meta.appSecret)) {
    emitDiagnostics(req, "invalid", rawBody, signatureHeader);
    res.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }

  emitDiagnostics(req, "valid", rawBody, signatureHeader);
  next();
}
