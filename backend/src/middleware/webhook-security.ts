import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const META_SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

export function computeMetaSignature(
  rawBody: Buffer | string,
  appSecret: string,
): string {
  return `sha256=${createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;
}

function computeMetaDigest(rawBody: Buffer, appSecret: string): string {
  return createHmac("sha256", appSecret).update(rawBody).digest("hex");
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

function extractProvidedDigest(
  signatureHeader: string | undefined,
): string | null {
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

// function bodyKind(body: unknown): string {
//   if (Buffer.isBuffer(body)) return "buffer";
//   if (typeof body === "string") return "string";
//   if (body === undefined) return "undefined";
//   if (body === null) return "null";

//   return typeof body === "object" ? "object" : typeof body;
// }

/** Capture exact request bytes before JSON parsing. */
export function captureRawBody(
  req: Request,
  _res: Response,
  buffer: Buffer,
): void {
  req.rawBody = Buffer.from(buffer);
}

export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  const secret = normalizeConfiguredSecret(appSecret);
  const providedDigest = extractProvidedDigest(signatureHeader);

  if (!secret || !providedDigest) return false;

  const body = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody, "utf8");

  // Diagnostic phase intentionally uses ONLY the exact raw bytes for the
  // actual security decision. No guessed normalization is accepted.
  const expectedDigest = computeMetaDigest(body, secret);

  return safeEqualHex(expectedDigest, providedDigest);
}

export function requireMetaWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.method === "GET") {
    next();
    return;
  }

  const rawBody = req.rawBody;
  const signatureHeader =
    req.get("x-hub-signature-256") ?? undefined;

  if (!rawBody) {

    res.status(401).json({
      error: "webhook_signature_unavailable",
    });
    return;
  }

  if (
    !verifyMetaWebhookSignature(
      rawBody,
      signatureHeader,
      env.meta.appSecret,
    )
  ) {

    res.status(401).json({
      error: "invalid_webhook_signature",
    });
    return;
  }

  next();
}
