import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const META_SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i;

export function computeMetaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

/**
 * Meta documents that webhook signatures are generated from an escaped-Unicode
 * representation of the payload. This matters for real Instagram payloads
 * containing emoji or other non-ASCII text: the HTTP body can contain the UTF-8
 * characters while Meta's signature is calculated over the equivalent
 * \uXXXX-escaped representation. ASCII-only payloads produce identical bytes,
 * which is why a simple local fixture can pass while a real payload fails.
 *
 * We deliberately do not parse and re-stringify JSON here. The original body
 * string is preserved byte-for-byte for all ASCII characters; only non-ASCII
 * UTF-16 code units are escaped as Meta documents.
 */
function escapeMetaUnicode(rawBody: Buffer): Buffer {
  const text = rawBody.toString("utf8");
  let escaped = "";

  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (codeUnit > 0x7f) {
      escaped += `\\u${codeUnit.toString(16).padStart(4, "0")}`;
    } else {
      escaped += text[index];
    }
  }

  return Buffer.from(escaped, "utf8");
}

function parseSignatureDigest(signatureHeader: string | undefined): Buffer | null {
  if (!signatureHeader) return null;
  const match = META_SIGNATURE_PATTERN.exec(signatureHeader.trim());
  if (!match) return null;
  return Buffer.from(match[1], "hex");
}

function matchesHmac(rawBody: Buffer, digest: Buffer, appSecret: string): boolean {
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return expected.length === digest.length && timingSafeEqual(expected, digest);
}

export type MetaSignatureVerificationResult =
  | "valid_raw"
  | "valid_meta_escaped_unicode"
  | "invalid";

export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  return verifyMetaWebhookSignatureDetailed(rawBody, signatureHeader, appSecret) !== "invalid";
}

export function verifyMetaWebhookSignatureDetailed(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): MetaSignatureVerificationResult {
  if (!appSecret || !signatureHeader) return "invalid";

  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
  const digest = parseSignatureDigest(signatureHeader);
  if (!digest) return "invalid";

  if (matchesHmac(body, digest, appSecret)) {
    return "valid_raw";
  }

  // Meta's documented escaped-Unicode signing representation is a second,
  // narrowly-scoped verification path. It is not JSON.stringify(req.body),
  // and it never replaces the original raw-body path.
  if (matchesHmac(escapeMetaUnicode(body), digest, appSecret)) {
    return "valid_meta_escaped_unicode";
  }

  return "invalid";
}

export function captureRawBody(req: Request, _res: Response, buffer: Buffer): void {
  req.rawBody = Buffer.from(buffer);
}

function bodyKind(value: unknown): string {
  if (Buffer.isBuffer(value)) return "buffer";
  if (typeof value === "string") return "string";
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function logVerificationDiagnostics(
  req: Request,
  verificationResult: MetaSignatureVerificationResult,
): void {
  const rawBody = req.rawBody;
  const signatureHeader = req.get("x-hub-signature-256") ?? undefined;
  const contentLength = req.get("content-length");
  const contentType = req.get("content-type");

  logger.info("Instagram webhook signature diagnostics", {
    requestId: req.requestId ?? null,
    method: req.method,
    path: req.path,
    contentType: contentType ?? null,
    contentLength: contentLength ?? null,
    signaturePresent: Boolean(signatureHeader),
    signatureAlgorithm: signatureHeader?.trim().split("=", 1)[0]?.toLowerCase() || null,
    metaAppSecretPresent: Boolean(process.env.META_APP_SECRET?.trim()),
    bodyKind: bodyKind(req.body),
    rawBodyPresent: Boolean(rawBody),
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
    logVerificationDiagnostics(req, "invalid");
    res.status(401).json({ error: "webhook_signature_unavailable" });
    return;
  }

  const verificationResult = verifyMetaWebhookSignatureDetailed(
    rawBody,
    signatureHeader,
    env.meta.appSecret,
  );
  logVerificationDiagnostics(req, verificationResult);

  if (verificationResult === "invalid") {
    res.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }

  // The webhook route uses express.raw so signature verification always sees
  // the exact request bytes first. Restore parsed JSON only after HMAC acceptance;
  // existing webhook parsing and automation remain unchanged.
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
