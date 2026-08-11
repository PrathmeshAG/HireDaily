import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const META_SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

export function computeMetaSignature(rawBody: Buffer | string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

function computeMetaDigest(rawBody: Buffer, appSecret: string): string {
  return createHmac("sha256", appSecret).update(rawBody).digest("hex");
}

/**
 * Meta's documented escaped-Unicode signing representation.
 * This does not parse/re-serialize JSON; ASCII whitespace, key order and
 * punctuation remain untouched.
 */
export function escapeUnicodeForMetaSignature(rawBody: Buffer): Buffer {
  const text = rawBody.toString("utf8");
  let escaped = "";

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);

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

function diagnosticFingerprint(value: Buffer | string): string {
  return createHmac("sha256", "hire-daily-diagnostic")
    .update(value)
    .digest("hex")
    .slice(0, 12);
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

  const rawDigest = computeMetaDigest(body, secret);

  if (safeEqualHex(rawDigest, providedDigest)) {
    return true;
  }

  // Meta escaped-Unicode fallback. This is still an HMAC using the same
  // server-side App Secret; it is not a bypass.
  if (/[\u0080-\uFFFF]/.test(body.toString("utf8"))) {
    const escapedDigest = computeMetaDigest(
      escapeUnicodeForMetaSignature(body),
      secret,
    );

    if (safeEqualHex(escapedDigest, providedDigest)) {
      return true;
    }
  }

  return false;
}

/** Capture exact bytes before JSON parsing. */
export function captureRawBody(
  req: Request,
  _res: Response,
  buffer: Buffer,
): void {
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

  const providedDigest = extractProvidedDigest(signatureHeader);
  const secret = normalizeConfiguredSecret(env.meta.appSecret);

  const rawExpectedDigest =
    rawBody && secret
      ? createHmac("sha256", secret).update(rawBody).digest("hex")
      : null;

  // Diagnostic-only comparisons.
  // IMPORTANT: these values do NOT change the actual verification decision.
  let rawMatch = false;
  let escapedMatch = false;
  let reSerializedMatch = false;

  if (rawBody && secret && providedDigest) {
    rawMatch =
      !!rawExpectedDigest &&
      safeEqualHex(rawExpectedDigest, providedDigest);

    try {
      const text = rawBody.toString("utf8");

      if (/[\u0080-\uFFFF]/.test(text)) {
        const escaped = escapeUnicodeForMetaSignature(rawBody);

        const escapedDigest = createHmac("sha256", secret)
          .update(escaped)
          .digest("hex");

        escapedMatch = safeEqualHex(
          escapedDigest,
          providedDigest,
        );
      }
    } catch {
      escapedMatch = false;
    }

    try {
      const parsed = JSON.parse(rawBody.toString("utf8"));

      const reSerialized = Buffer.from(
        JSON.stringify(parsed),
        "utf8",
      );

      const reSerializedDigest = createHmac("sha256", secret)
        .update(reSerialized)
        .digest("hex");

      reSerializedMatch = safeEqualHex(
        reSerializedDigest,
        providedDigest,
      );
    } catch {
      reSerializedMatch = false;
    }
  }

  logger.info("Instagram webhook signature diagnostics", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl.split("?", 1)[0],
    contentType: req.get("content-type") ?? null,
    contentLength: Number.isFinite(contentLength)
      ? contentLength
      : null,

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

    accessTokenPresent: !!env.meta.accessToken,
    accessTokenFingerprint: env.meta.accessToken
      ? diagnosticFingerprint(env.meta.accessToken)
      : null,

    instagramBusinessIdPrefix: env.meta.instagramBusinessId
      ? env.meta.instagramBusinessId.slice(0, 8)
      : null,

    appSecretLength: secret.length,

    bodyKind: bodyKind(req.body),
    rawBodyPresent: !!rawBody,
    rawBodyLength: rawBody?.length ?? 0,

    bodyFingerprint: rawBody
      ? diagnosticFingerprint(rawBody)
      : null,

    providedSignaturePrefix: providedDigest
      ? providedDigest.slice(0, 12)
      : null,

    rawExpectedSignaturePrefix: rawExpectedDigest
      ? rawExpectedDigest.slice(0, 12)
      : null,

    // The only new diagnostic values we need.
    rawMatch,
    escapedMatch,
    reSerializedMatch,

    parsedBodyType: bodyKind(req.body),
    verificationResult,
  });
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

    res
      .status(401)
      .json({ error: "webhook_signature_unavailable" });

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

    res
      .status(401)
      .json({ error: "invalid_webhook_signature" });

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