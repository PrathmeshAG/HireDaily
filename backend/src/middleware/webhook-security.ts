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

/**
 * Meta signs the payload with every non-ASCII character escaped as a lowercase
 * \\uXXXX sequence (their documentation says so), but delivers the body with the
 * real characters. A comment containing an emoji or accented/Hindi text therefore
 * never matches a digest computed over the raw bytes and was rejected with 401.
 * UTF-16 code units are escaped one by one, so an emoji becomes a surrogate pair.
 */
export function escapeUnicodeForMetaSignature(rawBody: Buffer | string): Buffer {
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    out += code > 0x7f ? `\\u${code.toString(16).padStart(4, "0")}` : text[i];
  }
  return Buffer.from(out, "utf8");
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

  // Accept the signature when it matches EITHER the exact raw bytes OR Meta's
  // escaped-Unicode form. Both are HMACs with the app secret, so a forged
  // request still cannot pass: only someone holding the secret can produce either.
  if (safeEqualHex(computeMetaDigest(body, secret), providedDigest)) return true;
  return safeEqualHex(computeMetaDigest(escapeUnicodeForMetaSignature(body), secret), providedDigest);
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
