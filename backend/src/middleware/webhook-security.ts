import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

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

/**
 * Meta escaped-Unicode representation used only as a diagnostic candidate.
 * It does NOT participate in the verification decision in this diagnostic
 * build. This prevents another representation guess from masking the root
 * cause.
 */
export function escapeUnicodeForMetaSignature(rawBody: Buffer): Buffer {
  const text = rawBody.toString("utf8");
  let escaped = "";

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

    if (code > 0x7f) {
      escaped += `\\u${code.toString(16).padStart(4, "0")}`;
    } else {
      escaped += text[index];
    }
  }

  return Buffer.from(escaped, "utf8");
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

function diagnosticFingerprint(value: Buffer | string): string {
  return createHmac("sha256", "hire-daily-diagnostic")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

function sha256Fingerprint(value: Buffer): string {
  return createHmac("sha256", "hire-daily-body-diagnostic")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

function bodyCharacteristics(body: Buffer): {
  utf8Valid: boolean;
  hasBom: boolean;
  hasCrLf: boolean;
  hasLf: boolean;
  hasCr: boolean;
  hasNonAscii: boolean;
  hasNullByte: boolean;
  firstBytes: string;
  lastBytes: string;
} {
  const utf8 = body.toString("utf8");

  return {
    utf8Valid: !utf8.includes("\uFFFD"),
    hasBom:
      body.length >= 3 &&
      body[0] === 0xef &&
      body[1] === 0xbb &&
      body[2] === 0xbf,
    hasCrLf: utf8.includes("\r\n"),
    hasLf: utf8.includes("\n"),
    hasCr: utf8.includes("\r"),
    hasNonAscii: /[\u0080-\uFFFF]/.test(utf8),
    hasNullByte: body.includes(0),
    firstBytes: body.subarray(0, 16).toString("hex"),
    lastBytes: body.subarray(Math.max(0, body.length - 16)).toString("hex"),
  };
}

function emitDiagnostics(
  req: Request,
  verificationResult:
    | "valid"
    | "invalid"
    | "missing_raw_body",
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
): void {
  const contentLengthHeader = req.get("content-length");
  const contentLength = contentLengthHeader
    ? Number(contentLengthHeader)
    : null;

  const contentEncoding = req.get("content-encoding") ?? null;
  const transferEncoding = req.get("transfer-encoding") ?? null;

  const providedDigest = extractProvidedDigest(signatureHeader);
  const secret = normalizeConfiguredSecret(env.meta.appSecret);

  const rawExpectedDigest =
    rawBody && secret
      ? computeMetaDigest(rawBody, secret)
      : null;

  let rawMatch = false;
  let escapedMatch = false;
  let reSerializedMatch = false;

  let parsedBodySha256: string | null = null;
  let rawBodySha256: string | null = null;
  let bodyInfo = {
    utf8Valid: false,
    hasBom: false,
    hasCrLf: false,
    hasLf: false,
    hasCr: false,
    hasNonAscii: false,
    hasNullByte: false,
    firstBytes: "",
    lastBytes: "",
  };

  if (rawBody && secret && providedDigest) {
    rawMatch =
      !!rawExpectedDigest &&
      safeEqualHex(rawExpectedDigest, providedDigest);

    try {
      const escaped = escapeUnicodeForMetaSignature(rawBody);
      const escapedDigest = computeMetaDigest(escaped, secret);
      escapedMatch = safeEqualHex(escapedDigest, providedDigest);
    } catch {
      escapedMatch = false;
    }

    try {
      const parsed = JSON.parse(rawBody.toString("utf8"));
      const reSerialized = Buffer.from(
        JSON.stringify(parsed),
        "utf8",
      );
      const reSerializedDigest = computeMetaDigest(
        reSerialized,
        secret,
      );
      reSerializedMatch = safeEqualHex(
        reSerializedDigest,
        providedDigest,
      );

      parsedBodySha256 = sha256Fingerprint(reSerialized);
    } catch {
      reSerializedMatch = false;
    }

    rawBodySha256 = sha256Fingerprint(rawBody);
    bodyInfo = bodyCharacteristics(rawBody);
  }

  logger.info("Instagram webhook signature diagnostics", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split("?", 1)[0],

    contentType: req.get("content-type") ?? null,
    contentLength: Number.isFinite(contentLength)
      ? contentLength
      : null,
    contentEncoding,
    transferEncoding,

    signaturePresent: !!signatureHeader,
    signatureAlgorithm: providedDigest
      ? "sha256"
      : signatureHeader
        ? "invalid"
        : null,

    metaAppSecretPresent: secret ? "<redacted>" : false,
    secretFingerprint: secret
      ? diagnosticFingerprint(secret)
      : null,
    metaAppIdPresent: !!env.meta.appId,
    metaAppIdPrefix: env.meta.appId
      ? env.meta.appId.slice(0, 8)
      : null,

    bodyKind: Buffer.isBuffer(rawBody)
      ? "buffer"
      : bodyKind(req.body),

    rawBodyPresent: !!rawBody,
    rawBodyLength: rawBody?.length ?? 0,

    rawBodySha256Fingerprint: rawBodySha256,
    parsedBodySha256Fingerprint: parsedBodySha256,

    bodyUtf8Valid: bodyInfo.utf8Valid,
    bodyHasBom: bodyInfo.hasBom,
    bodyHasCrLf: bodyInfo.hasCrLf,
    bodyHasLf: bodyInfo.hasLf,
    bodyHasCr: bodyInfo.hasCr,
    bodyHasNonAscii: bodyInfo.hasNonAscii,
    bodyHasNullByte: bodyInfo.hasNullByte,

    // These are byte fingerprints, not the actual body.
    firstBytesHex: bodyInfo.firstBytes,
    lastBytesHex: bodyInfo.lastBytes,

    providedSignaturePrefix: providedDigest
      ? providedDigest.slice(0, 12)
      : null,
    rawExpectedSignaturePrefix: rawExpectedDigest
      ? rawExpectedDigest.slice(0, 12)
      : null,

    rawMatch,
    escapedMatch,
    reSerializedMatch,

    parsedBodyType: bodyKind(req.body),
    verificationResult,
  });
}

function bodyKind(body: unknown): string {
  if (Buffer.isBuffer(body)) return "buffer";
  if (typeof body === "string") return "string";
  if (body === undefined) return "undefined";
  if (body === null) return "null";

  return typeof body === "object" ? "object" : typeof body;
}

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
    emitDiagnostics(
      req,
      "missing_raw_body",
      rawBody,
      signatureHeader,
    );

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
    emitDiagnostics(
      req,
      "invalid",
      rawBody,
      signatureHeader,
    );

    res.status(401).json({
      error: "invalid_webhook_signature",
    });
    return;
  }

  emitDiagnostics(
    req,
    "valid",
    rawBody,
    signatureHeader,
  );

  next();
}