import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const META_SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

/**
 * Meta signs the exact webhook payload. Keep this function byte-oriented:
 * callers must pass the bytes received from the HTTP request, not a parsed
 * object or JSON.stringify(req.body).
 */
export function computeMetaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

function computeMetaDigest(rawBody: Buffer, appSecret: string): string {
  return createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

/**
 * Meta documents that its webhook signature is generated from an escaped
 * Unicode representation of the payload. This transformation deliberately
 * does NOT parse/re-serialize JSON: whitespace, key order, and punctuation
 * remain untouched. Only actual non-ASCII UTF-16 code units are escaped.
 */
export function escapeUnicodeForMetaSignature(rawBody: Buffer): Buffer {
  const text = rawBody.toString("utf8");
  let escaped = "";

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    // Meta documents escaped-Unicode signing. Its older webhook signature
    // documentation also specifies escaping <, % and @ while leaving / as-is.
    if (code > 0x7f || code === 0x3c || code === 0x25 || code === 0x40) {
      escaped += `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      escaped += text[index];
    }
  }

  return Buffer.from(escaped, "utf8");
}

function normalizeConfiguredSecret(value: string): string {
  const trimmed = value.trim();

  // Vercel's environment-variable UI normally stores the value exactly as
  // entered. If somebody accidentally pasted a dotenv-style quoted value,
  // treating one matching outer quote pair as syntax avoids a false mismatch
  // without weakening the secret itself.
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

  const rawDigest = computeMetaDigest(body, secret);
  if (safeEqualHex(rawDigest, providedDigest)) return true;

  // Meta's documented escaped-Unicode signing representation is only a
  // fallback for payloads that actually contain non-ASCII characters. For
  // ordinary ASCII payloads this performs no second interpretation.
  if (/[\u0080-\uFFFF]/.test(body.toString("utf8"))) {
    const escapedDigest = computeMetaDigest(escapeUnicodeForMetaSignature(body), secret);
    if (safeEqualHex(escapedDigest, providedDigest)) return true;
  }

  return false;
}

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
  verificationResult: "valid_raw" | "valid_escaped_unicode" | "invalid" | "missing_raw_body",
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

  const secret = normalizeConfiguredSecret(env.meta.appSecret);
  const providedDigest = extractProvidedDigest(signatureHeader);

  if (!secret || !providedDigest) {
    emitDiagnostics(req, "invalid", rawBody, signatureHeader);
    res.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }

  const rawDigest = computeMetaDigest(rawBody, secret);
  if (safeEqualHex(rawDigest, providedDigest)) {
    emitDiagnostics(req, "valid_raw", rawBody, signatureHeader);
  } else if (/[\u0080-\uFFFF]/.test(rawBody.toString("utf8"))) {
    const escapedDigest = computeMetaDigest(escapeUnicodeForMetaSignature(rawBody), secret);
    if (safeEqualHex(escapedDigest, providedDigest)) {
      emitDiagnostics(req, "valid_escaped_unicode", rawBody, signatureHeader);
    } else {
      emitDiagnostics(req, "invalid", rawBody, signatureHeader);
      res.status(401).json({ error: "invalid_webhook_signature" });
      return;
    }
  } else {
    emitDiagnostics(req, "invalid", rawBody, signatureHeader);
    res.status(401).json({ error: "invalid_webhook_signature" });
    return;
  }

  // Parse only after signature verification. Downstream webhook business
  // logic receives the same JSON object it received before this security fix.
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
