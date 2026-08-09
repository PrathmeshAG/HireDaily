import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Phase 4 webhook test runner.
 *
 * Usage (via package.json scripts):
 *   npm run test:webhook:comment   -> tsx test/send-webhook.ts comment
 *   npm run test:webhook:message   -> tsx test/send-webhook.ts message
 *   npm run test:webhook:delivery  -> tsx test/send-webhook.ts delivery
 *
 * It loads test/<name>.json as the EXACT raw request body and POSTs it to
 * the backend's real webhook endpoint (POST /webhooks/instagram), so the
 * backend itself parses the payload and writes the Firebase automation/log
 * entry. No Firebase data is written directly by this script.
 *
 * Security:
 *  - If META_APP_SECRET is set, it computes a real HMAC-SHA256 signature and
 *    sends it as X-Hub-Signature-256 using the exact raw body bytes.
 *  - If META_APP_SECRET is NOT set, it runs in a clearly-labelled
 *    development-only UNSIGNED mode and prints a prominent notice. This never
 *    weakens production verification: the backend decides whether to verify.
 *  - The secret is never printed.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_TYPES = new Set(["comment", "message", "delivery"]);

function usage(): never {
  console.error('Usage: tsx test/send-webhook.ts <comment|message|delivery>');
  process.exit(1);
}

const type = process.argv[2] ?? "";
if (!VALID_TYPES.has(type)) {
  usage();
}

const port = Number(process.env.PORT ?? 8787);
const url = `http://localhost:${port}/webhooks/instagram`;

// Load the exact raw body bytes from the JSON file so signature generation
// uses the same byte-for-byte body that we send.
const bodyPath = path.join(__dirname, `${type}.json`);
const rawBody = readFileSync(bodyPath, "utf8");

const appSecret = process.env.META_APP_SECRET ?? "";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (appSecret.length > 0) {
  // X-Hub-Signature-256 Format: sha256=<hex HMAC-SHA256(secret, rawBody)>
  const signature = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  headers["X-Hub-Signature-256"] = `sha256=${signature}`;
  console.log("Signature: X-Hub-Signature-256 attached (HMAC-SHA256)");
} else {
  console.log(
    "NOTE: META_APP_SECRET is not set — sending an UNSIGNED request (development-only). " +
      "Production signature verification is unaffected; the server controls verification.",
  );
}

async function main(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: rawBody,
    });
  } catch (err) {
    console.error(`Request to ${url} failed — is the backend running on port ${port}?`);
    console.error(err);
    process.exit(1);
  }

  const status = response.status;
  const text = await response.text();

  console.log(`Webhook test: ${type}`);
  console.log(`Target:        ${url}`);
  console.log(`HTTP status:   ${status}`);
  console.log(`Response:      ${text}`);
}

main();
