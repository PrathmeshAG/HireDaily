import express from "express";
import { createServer } from "node:http";
import type { NextFunction, Request, Response as ExpressResponse } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { createCorsMiddleware } from "../src/middleware/cors.js";
import { createFirebaseAuthMiddleware } from "../src/middleware/firebase-auth.js";
import { isAdminUser, requireAdmin } from "../src/middleware/rbac.js";
import { createApiRateLimiter } from "../src/middleware/rate-limit.js";
import { validateEnvironment, env } from "../src/config/env.js";
import { redactSensitiveValue } from "../src/utils/logger.js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

async function getWebhookSecurity() {
  return import("../src/middleware/webhook-security.js");
}

env.meta.appSecret = "test-app-secret";

let passed = 0;
let failed = 0;
const failures: string[] = [];
const pending: Promise<void>[] = [];

function test(name: string, fn: () => Promise<void> | void): void {
  pending.push(Promise.resolve().then(fn).then(() => {
    passed += 1;
    console.log(`  ✓ ${name}`);
  }).catch((error) => {
    failed += 1;
    failures.push(name);
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }));
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function token(email: string, extra: Record<string, unknown> = {}): DecodedIdToken {
  return {
    uid: "test-user",
    email,
    email_verified: true,
    auth_time: 1,
    iat: 1,
    exp: 9999999999,
    aud: "test",
    iss: "https://securetoken.google.com/test",
    sub: "test-user",
    firebase: { identities: {}, sign_in_provider: "password" },
    ...extra,
  } as DecodedIdToken;
}

type TestResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => TestResponse;
  json: (value: unknown) => TestResponse;
};

function mockResponse(): TestResponse {
  const response: TestResponse = {
    statusCode: 200,
    body: null,
    status(code: number): TestResponse {
      response.statusCode = code;
      return response;
    },
    json(value: unknown): TestResponse {
      response.body = value;
      return response;
    },
  };
  return response;
}

function invokeMiddleware(
  middleware: (req: Request, res: ExpressResponse, next: NextFunction) => void | Promise<void>,
  req: Request,
): Promise<{ res: TestResponse; nextCalled: boolean }> {
  const res = mockResponse();
  let nextCalled = false;
  const next = (() => { nextCalled = true; }) as NextFunction;
  return Promise.resolve(middleware(req, res as unknown as ExpressResponse, next))
    .then(() => ({ res, nextCalled }));
}

test("Missing Authorization header returns 401", async () => {
  const middleware = createFirebaseAuthMiddleware(async () => token("admin@example.com"));
  const { res, nextCalled } = await invokeMiddleware(middleware, { get: () => undefined } as unknown as Request);
  assert(res.statusCode === 401, "missing authorization did not return 401");
  assert(!nextCalled, "missing authorization called next");
});

test("Invalid Firebase ID token returns 401", async () => {
  const middleware = createFirebaseAuthMiddleware(async () => { throw new Error("invalid token"); });
  const req = { get: (name: string) => name.toLowerCase() === "authorization" ? "Bearer invalid-token" : undefined } as unknown as Request;
  const { res, nextCalled } = await invokeMiddleware(middleware, req);
  assert(res.statusCode === 401, "invalid token did not return 401");
  assert(!nextCalled, "invalid token called next");
});

test("Valid Firebase ID token authenticates the request", async () => {
  const middleware = createFirebaseAuthMiddleware(async (value) => {
    assert(value === "signed-token", "wrong token passed to Firebase verifier");
    return token("user@example.com");
  });
  const req = { get: (name: string) => name.toLowerCase() === "authorization" ? "Bearer signed-token" : undefined } as unknown as Request;
  const { res, nextCalled } = await invokeMiddleware(middleware, req);
  assert(res.statusCode === 200 && nextCalled, "valid token was not accepted");
  assert((req as Request & { authUser?: DecodedIdToken }).authUser?.email === "user@example.com", "decoded user was not attached");
});

test("Authenticated non-admin receives 403", () => {
  const req = { authUser: token("user@example.com") } as unknown as Request & { authUser?: DecodedIdToken };
  const res = mockResponse();
  let nextCalled = false;
  requireAdmin(req, res as unknown as ExpressResponse, (() => { nextCalled = true; }) as NextFunction);
  assert(res.statusCode === 403 && !nextCalled, "non-admin was not denied");
});

test("Admin user is allowed", () => {
  const req = { authUser: token("admin@example.com", { admin: true }) } as unknown as Request & { authUser?: DecodedIdToken };
  const res = mockResponse();
  let nextCalled = false;
  requireAdmin(req, res as unknown as ExpressResponse, (() => { nextCalled = true; }) as NextFunction);
  assert(nextCalled, "admin was not allowed");
});

test("Valid X-Hub-Signature-256 is accepted by webhook middleware", async () => {
  const body = Buffer.from('{"entry":[]}');
  const { computeMetaSignature, requireMetaWebhookSignature } = await getWebhookSecurity();
  const signature = computeMetaSignature(body, "test-app-secret");
  const req = {
    method: "POST",
    rawBody: body,
    get: (name: string) => name.toLowerCase() === "x-hub-signature-256" ? signature : undefined,
  } as unknown as Request;
  const { res, nextCalled } = await invokeMiddleware(requireMetaWebhookSignature, req);
  assert(nextCalled && res.statusCode === 200, "valid Meta signature was rejected");
});

test("Invalid X-Hub-Signature-256 returns 401", async () => {
  const body = Buffer.from('{"entry":[]}');
  const { requireMetaWebhookSignature } = await getWebhookSecurity();
  const req = {
    method: "POST",
    rawBody: body,
    get: (name: string) => name.toLowerCase() === "x-hub-signature-256" ? "sha256=invalid" : undefined,
  } as unknown as Request;
  const { res, nextCalled } = await invokeMiddleware(requireMetaWebhookSignature, req);
  assert(res.statusCode === 401 && !nextCalled, "invalid Meta signature was not rejected");
});

test("Missing X-Hub-Signature-256 returns 401", async () => {
  const body = Buffer.from('{"entry":[]}');
  const { requireMetaWebhookSignature } = await getWebhookSecurity();
  const req = {
    method: "POST",
    rawBody: body,
    get: () => undefined,
  } as unknown as Request;
  const { res, nextCalled } = await invokeMiddleware(requireMetaWebhookSignature, req);
  assert(res.statusCode === 401 && !nextCalled, "missing Meta signature was not rejected");
});

test("Webhook raw-body integration accepts exact signed bytes and reaches the existing parser", async () => {
  const { captureRawBody, requireMetaWebhookSignature, computeMetaSignature } = await getWebhookSecurity();
  const app = express();
  let parserReceived = false;

  app.use(
    "/webhooks/instagram",
    express.raw({
      type: "application/json",
      limit: "1mb",
      verify: captureRawBody,
    }),
  );
  app.use("/webhooks/instagram", requireMetaWebhookSignature);
  app.post("/webhooks/instagram", (req, res) => {
    parserReceived = !!req.body?.entry;
    res.status(200).json({ received: parserReceived });
  });

  const server = createServer(app);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");

  try {
    const rawBody = Buffer.from(' {"entry":[{"id":"meta-test"}]}\n');
    const signature = computeMetaSignature(rawBody, "test-app-secret");

    let response = await fetch(`http://127.0.0.1:${address.port}/webhooks/instagram`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: rawBody,
    });
    assert(response.status === 200, `valid webhook signature returned ${response.status}`);
    assert(parserReceived, "existing webhook parser did not receive the verified body");

    response = await fetch(`http://127.0.0.1:${address.port}/webhooks/instagram`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=invalid",
      },
      body: rawBody,
    });
    assert(response.status === 401, `invalid webhook signature returned ${response.status}`);

    response = await fetch(`http://127.0.0.1:${address.port}/webhooks/instagram`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: rawBody,
    });
    assert(response.status === 401, `missing webhook signature returned ${response.status}`);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("CORS allows configured frontend origin", async () => {
  const app = express();
  app.use(createCorsMiddleware(["http://localhost:5173"]));
  app.get("/cors", (_req, res) => res.status(200).json({ ok: true }));
  const server = createServer(app);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/cors`, { headers: { Origin: "http://localhost:5173" } });
    assert(response.status === 200, `configured origin returned ${response.status}`);
    assert(response.headers.get("access-control-allow-origin") === "http://localhost:5173", "CORS header missing for allowed origin");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("CORS rejects unknown browser origin", async () => {
  const app = express();
  app.use(createCorsMiddleware(["http://localhost:5173"]));
  app.get("/cors", (_req, res) => res.status(200).json({ ok: true }));
  app.use((error: unknown, _req: Request, res: ExpressResponse, _next: NextFunction) => {
    res.status(error instanceof Error && error.message === "cors_origin_not_allowed" ? 403 : 500).json({ error: "blocked" });
  });
  const server = createServer(app);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/cors`, { headers: { Origin: "https://evil.example" } });
    assert(response.status === 403, `unknown origin returned ${response.status}`);
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("Rate limiter allows requests within configured limit", async () => {
  const app = express();
  app.get("/limited", createApiRateLimiter({ windowMs: 60_000, max: 2 }), (_req, res) => res.status(200).json({ ok: true }));
  const server = createServer(app);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try {
    const first = await fetch(`http://127.0.0.1:${address.port}/limited`);
    const second = await fetch(`http://127.0.0.1:${address.port}/limited`);
    assert(first.status === 200 && second.status === 200, "requests within limit were blocked");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("Rate limiter returns 429 after configured threshold", async () => {
  const app = express();
  app.get("/limited", createApiRateLimiter({ windowMs: 60_000, max: 1 }), (_req, res) => res.status(200).json({ ok: true }));
  const server = createServer(app);
  await new Promise<void>((resolveListen) => server.listen(0, resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try {
    const first = await fetch(`http://127.0.0.1:${address.port}/limited`);
    const second = await fetch(`http://127.0.0.1:${address.port}/limited`);
    assert(first.status === 200 && second.status === 429, "rate limit threshold behaved incorrectly");
  } finally {
    await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
});

test("Health endpoint returns safe response without secrets", async () => {
  const port = 18991;
  const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");
  if (!existsSync(tsxCli)) throw new Error("tsx CLI is required for the health endpoint integration test");
  const child = spawn(process.execPath, [tsxCli, "src/server.ts"], {
    cwd: resolve(process.cwd()),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      META_DRY_RUN: "true",
      FIREBASE_PROJECT_ID: "",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
      FIREBASE_DATABASE_URL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += String(chunk); });
  child.stderr.on("data", (chunk) => { output += String(chunk); });
  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/health`);
        break;
      } catch {
        await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      }
    }
    if (!response) throw new Error(`health server did not start: ${output.slice(-500)}`);
    assert(response.status === 200, `health returned ${response.status}`);
    const body = await response.text();
    assert(body.includes('"status"'), "health response missing status");
    assert(!body.includes("META_ACCESS_TOKEN"), "health response exposed token variable name");
    assert(!body.includes("META_APP_SECRET"), "health response exposed app secret variable name");
    assert(!body.includes("FIREBASE_PRIVATE_KEY"), "health response exposed Firebase private key");
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  }
});

test("Production environment validation passes with complete safe configuration", () => {
  validateEnvironment({
    production: true,
    values: {
      FIREBASE_DATABASE_URL: "https://example.firebaseio.com",
      FIREBASE_PROJECT_ID: "test-project",
      FIREBASE_CLIENT_EMAIL: "firebase@example.com",
      FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
      META_APP_SECRET: "test-app-secret",
      ADMIN_EMAIL: "admin@example.com",
      CORS_ORIGINS: "https://hire-daily.vercel.app",
      PUBLIC_APP_URL: "https://hire-daily.vercel.app",
      WEBHOOK_VERIFY_TOKEN: "webhook-secret",
      META_ACCESS_TOKEN: "meta-test-token",
      INSTAGRAM_BUSINESS_ID: "ig-test-id",
      META_DRY_RUN: "false",
    },
  });
});

test("Production environment validation fails with missing variable name and no secret value", () => {
  const secret = "DO_NOT_LEAK_THIS_SECRET";
  let message = "";
  try {
    validateEnvironment({ production: true, values: { FIREBASE_PROJECT_ID: secret } });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("FIREBASE_DATABASE_URL"), "missing variable name was not reported");
  assert(!message.includes(secret), "secret value leaked in validation error");
});

test("Development/test validation remains compatible without production secrets", () => {
  validateEnvironment({ production: false, values: {} });
});

test("Logger redacts META_ACCESS_TOKEN, Authorization, META_APP_SECRET and private keys", () => {
  const result = redactSensitiveValue({
    META_ACCESS_TOKEN: "meta-token",
    authorization: "Bearer abc123",
    META_APP_SECRET: "app-secret",
    privateKey: "-----BEGIN PRIVATE KEY-----secret",
    clientSecret: "client-secret",
    nested: { accessToken: "nested-token" },
  }) as Record<string, unknown>;
  assert(result.META_ACCESS_TOKEN === "<redacted>", "META_ACCESS_TOKEN was not redacted");
  assert(result.authorization === "<redacted>", "Authorization was not redacted");
  assert(result.META_APP_SECRET === "<redacted>", "META_APP_SECRET was not redacted");
  assert(result.privateKey === "<redacted>", "private key was not redacted");
  assert(result.clientSecret === "<redacted>", "client secret was not redacted");
  assert((result.nested as Record<string, unknown>).accessToken === "<redacted>", "nested token was not redacted");
});

await Promise.all(pending);
console.log(`\nSecurity tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("Failed tests:", failures.join(", "));
  process.exit(1);
}
