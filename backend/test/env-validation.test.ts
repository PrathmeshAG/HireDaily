import { validateEnvironment } from "../src/config/env.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push(name);
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const validProductionEnv: NodeJS.ProcessEnv = {
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
};

test("Valid required production environment passes", () => {
  validateEnvironment({ production: true, values: validProductionEnv });
});

test("Missing required environment variable fails validation", () => {
  const values = { ...validProductionEnv };
  delete values.FIREBASE_PROJECT_ID;
  let threw = false;
  try { validateEnvironment({ production: true, values }); } catch { threw = true; }
  assert(threw, "missing required variable did not fail validation");
});

test("Validation error identifies the missing variable name", () => {
  const values = { ...validProductionEnv };
  delete values.META_APP_SECRET;
  let message = "";
  try { validateEnvironment({ production: true, values }); } catch (error) { message = String(error); }
  assert(message.includes("META_APP_SECRET"), "missing META_APP_SECRET name was not reported");
});

test("Validation error never exposes the actual secret value", () => {
  const secret = "SUPER_PRIVATE_TEST_SECRET";
  const values = { ...validProductionEnv, FIREBASE_PROJECT_ID: secret };
  delete values.FIREBASE_CLIENT_EMAIL;
  let message = "";
  try { validateEnvironment({ production: true, values }); } catch (error) { message = String(error); }
  assert(message.includes("FIREBASE_CLIENT_EMAIL"), "missing variable was not reported");
  assert(!message.includes(secret), "secret value leaked into validation error");
});

test("Production-specific configuration is enforced", () => {
  const values = { ...validProductionEnv };
  delete values.WEBHOOK_VERIFY_TOKEN;
  delete values.META_VERIFY_TOKEN;
  let message = "";
  try { validateEnvironment({ production: true, values }); } catch (error) { message = String(error); }
  assert(message.includes("WEBHOOK_VERIFY_TOKEN"), "webhook secret requirement was not enforced");
});

test("Development/test mode remains compatible without production secrets", () => {
  validateEnvironment({ production: false, values: {} });
});

console.log(`\nEnvironment validation tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
