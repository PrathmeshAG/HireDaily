import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const META_SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

/**
 * Calculate Meta HMAC signature.
 */
export function computeMetaSignature(
  rawBody: Buffer | string,
  appSecret: string,
): string {
  return `sha256=${createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;
}

function computeMetaDigest(
  rawBody: Buffer,
  appSecret: string,
): string {
  return createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
}

/**
 * Escape Unicode characters for Meta signature diagnostics/fallback.
 */
export function escapeUnicodeForMetaSignature(
  rawBody: Buffer,
): Buffer {
  const text = rawBody.toString("utf8");
  let escaped = "";

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (
      code > 0x7f ||
      code === 0x3c ||
      code === 0x25 ||
      code === 0x40
    ) {
      escaped += `\\u${code
        .toString(16)
        .padStart(4, "0")}`;
    } else {
      escaped += text[index];
    }
  }

  return Buffer.from(escaped, "utf8");
}

function normalizeConfiguredSecret(
  value: string,
): string {
  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    (
      (trimmed.startsWith('"') &&
        trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") &&
        trimmed.endsWith("'"))
    )
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function extractProvidedDigest(
  signatureHeader: string | undefined,
): string | null {
  if (!signatureHeader) {
    return null;
  }

  const match = META_SIGNATURE_RE.exec(
    signatureHeader.trim(),
  );

  return match?.[1]?.toLowerCase() ?? null;
}

function safeEqualHex(
  leftHex: string,
  rightHex: string,
): boolean {
  const left = Buffer.from(leftHex, "hex");
  const right = Buffer.from(rightHex, "hex");

  if (left.length !== 32 || right.length !== 32) {
    return false;
  }

  return timingSafeEqual(left, right);
}

/**
 * Safe diagnostic fingerprint.
 *
 * IMPORTANT:
 * This does NOT expose the actual secret.
 */
function createDiagnosticFingerprint(
  value: Buffer | string,
): string {
  return createHmac(
    "sha256",
    "hire-daily-diagnostic",
  )
    .update(value)
    .digest("hex")
    .slice(0, 12);
}

function getSecretFingerprint(
  secret: string,
): string {
  return createDiagnosticFingerprint(secret);
}

function getBodyFingerprint(
  body: Buffer,
): string {
  return createDiagnosticFingerprint(body);
}

/**
 * Verify Meta webhook signature.
 *
 * Flow:
 *
 * 1. Verify exact raw request body.
 * 2. If that fails and Unicode exists, try Meta escaped-Unicode fallback.
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  const secret =
    normalizeConfiguredSecret(appSecret);

  const providedDigest =
    extractProvidedDigest(signatureHeader);

  if (!secret || !providedDigest) {
    return false;
  }

  const body = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody, "utf8");

  // --------------------------------------------
  // 1. Normal raw-body verification
  // --------------------------------------------

  const rawDigest =
    computeMetaDigest(body, secret);

  if (
    safeEqualHex(
      rawDigest,
      providedDigest,
    )
  ) {
    return true;
  }

  // --------------------------------------------
  // 2. Escaped Unicode fallback
  // --------------------------------------------

  if (
    /[\u0080-\uFFFF]/.test(
      body.toString("utf8"),
    )
  ) {
    const escapedBody =
      escapeUnicodeForMetaSignature(body);

    const escapedDigest =
      computeMetaDigest(
        escapedBody,
        secret,
      );

    if (
      safeEqualHex(
        escapedDigest,
        providedDigest,
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Express JSON verify hook.
 *
 * IMPORTANT:
 * This captures the exact body BEFORE JSON parsing.
 */
export function captureRawBody(
  req: Request,
  _res: Response,
  buffer: Buffer,
): void {
  req.rawBody = Buffer.from(buffer);
}

function bodyKind(
  body: unknown,
): string {
  if (Buffer.isBuffer(body)) {
    return "buffer";
  }

  if (typeof body === "string") {
    return "string";
  }

  if (body === undefined) {
    return "undefined";
  }

  if (body === null) {
    return "null";
  }

  if (typeof body === "object") {
    return "object";
  }

  return typeof body;
}

function emitDiagnostics(
  req: Request,
  verificationResult:
    | "valid_raw"
    | "valid_escaped_unicode"
    | "invalid"
    | "missing_raw_body",
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
): void {
  const contentLengthHeader =
    req.get("content-length");

  const contentLength =
    contentLengthHeader
      ? Number(contentLengthHeader)
      : null;

  const providedDigest =
    extractProvidedDigest(
      signatureHeader,
    );

  const secret =
    normalizeConfiguredSecret(
      env.meta.appSecret,
    );

  const secretFingerprint =
    secret
      ? getSecretFingerprint(secret)
      : null;

  const bodyFingerprint =
    rawBody
      ? getBodyFingerprint(rawBody)
      : null;

  logger.info(
    "Instagram webhook signature diagnostics",
    {
      timestamp: new Date().toISOString(),

      requestId:
        req.requestId,

      method:
        req.method,

      path:
        req.originalUrl.split("?", 1)[0],

      contentType:
        req.get("content-type") ?? null,

      contentLength:
        Number.isFinite(contentLength)
          ? contentLength
          : null,

      signaturePresent:
        !!signatureHeader,

      signatureAlgorithm:
        providedDigest
          ? "sha256"
          : signatureHeader
            ? "invalid"
            : null,

      metaAppSecretPresent:
        !!secret
          ? "<redacted>"
          : false,

      // SAFE: does not expose secret
      secretFingerprint,

      // SAFE: does not expose request body
      bodyFingerprint,

      // Only first 12 hex chars
      // of Meta's provided signature
      providedSignaturePrefix:
        providedDigest
          ? providedDigest.slice(0, 12)
          : null,

      bodyKind:
        bodyKind(req.body),

      rawBodyPresent:
        !!rawBody,

      rawBodyLength:
        rawBody?.length ?? 0,

      parsedBodyType:
        bodyKind(req.body),

      verificationResult,
    },
  );
}

/**
 * Express middleware that validates
 * Meta's X-Hub-Signature-256 header.
 */
export function requireMetaWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Meta webhook verification GET request
  if (req.method === "GET") {
    next();
    return;
  }

  const rawBody =
    req.rawBody;

  const signatureHeader =
    req.get(
      "x-hub-signature-256",
    ) ?? undefined;

  // --------------------------------------------
  // Raw body is mandatory
  // --------------------------------------------

  if (!rawBody) {
    emitDiagnostics(
      req,
      "missing_raw_body",
      rawBody,
      signatureHeader,
    );

    res.status(401).json({
      error:
        "webhook_signature_unavailable",
    });

    return;
  }

  // --------------------------------------------
  // Secret
  // --------------------------------------------

  const secret =
    normalizeConfiguredSecret(
      env.meta.appSecret,
    );

  const providedDigest =
    extractProvidedDigest(
      signatureHeader,
    );

  if (!secret || !providedDigest) {
    emitDiagnostics(
      req,
      "invalid",
      rawBody,
      signatureHeader,
    );

    res.status(401).json({
      error:
        "invalid_webhook_signature",
    });

    return;
  }

  // --------------------------------------------
  // 1. Normal raw-body verification
  // --------------------------------------------

  const rawDigest =
    computeMetaDigest(
      rawBody,
      secret,
    );

  if (
    safeEqualHex(
      rawDigest,
      providedDigest,
    )
  ) {
    emitDiagnostics(
      req,
      "valid_raw",
      rawBody,
      signatureHeader,
    );

    next();
    return;
  }

  // --------------------------------------------
  // 2. Escaped Unicode fallback
  // --------------------------------------------

  if (
    /[\u0080-\uFFFF]/.test(
      rawBody.toString("utf8"),
    )
  ) {
    const escapedBody =
      escapeUnicodeForMetaSignature(
        rawBody,
      );

    const escapedDigest =
      computeMetaDigest(
        escapedBody,
        secret,
      );

    if (
      safeEqualHex(
        escapedDigest,
        providedDigest,
      )
    ) {
      emitDiagnostics(
        req,
        "valid_escaped_unicode",
        rawBody,
        signatureHeader,
      );

      next();
      return;
    }
  }

  // --------------------------------------------
  // Invalid signature
  // --------------------------------------------

  emitDiagnostics(
    req,
    "invalid",
    rawBody,
    signatureHeader,
  );

  res.status(401).json({
    error:
      "invalid_webhook_signature",
  });
}