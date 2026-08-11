import { isTransientHttpStatus, retryTransient } from "../src/utils/retry.js";

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

function httpError(status: number): Error & { status: number } {
  const error = new Error(`HTTP ${status}`) as Error & { status: number };
  error.status = status;
  return error;
}

const shouldRetryTransient = (error: unknown) => {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status: unknown }).status)
    : 0;
  return isTransientHttpStatus(status);
};

test("Successful operation uses one attempt", async () => {
  let attempts = 0;
  const result = await retryTransient(async () => {
    attempts += 1;
    return "ok";
  }, { retries: 4, baseDelayMs: 1, sleep: async () => undefined });
  assert(result === "ok" && attempts === 1, "successful operation was retried");
});

test("Transient failure retries", async () => {
  let attempts = 0;
  try {
    await retryTransient(async () => {
      attempts += 1;
      throw httpError(503);
    }, { retries: 2, baseDelayMs: 1, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
  } catch { /* expected after bounded retries */ }
  assert(attempts === 3, `expected 3 attempts, got ${attempts}`);
});

test("Transient failure eventually succeeds", async () => {
  let attempts = 0;
  const result = await retryTransient(async () => {
    attempts += 1;
    if (attempts < 3) throw httpError(503);
    return "ok";
  }, { retries: 3, baseDelayMs: 1, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
  assert(result === "ok" && attempts === 3, "transient retry did not eventually succeed");
});

test("Exponential backoff uses 10, 20, 40ms", async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await retryTransient(async () => {
    attempts += 1;
    if (attempts < 4) throw httpError(503);
    return "ok";
  }, {
    retries: 3,
    baseDelayMs: 10,
    maxDelayMs: 100,
    shouldRetry: shouldRetryTransient,
    sleep: async (ms) => { delays.push(ms); },
  });
  assert(result === "ok", "backoff operation did not succeed");
  assert(JSON.stringify(delays) === JSON.stringify([10, 20, 40]), `unexpected backoff sequence: ${delays.join(",")}`);
});

test("Maximum retry attempts are respected", async () => {
  let attempts = 0;
  try {
    await retryTransient(async () => {
      attempts += 1;
      throw httpError(503);
    }, { retries: 2, baseDelayMs: 0, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
    throw new Error("expected final failure");
  } catch (error) {
    assert((error as { status?: number }).status === 503, "wrong final error");
  }
  assert(attempts === 3, `expected 3 attempts, got ${attempts}`);
});

test("Permanent 400 error is not retried", async () => {
  let attempts = 0;
  try {
    await retryTransient(async () => {
      attempts += 1;
      throw httpError(400);
    }, { retries: 4, baseDelayMs: 0, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
  } catch (error) {
    assert((error as { status?: number }).status === 400, "wrong error returned");
  }
  assert(attempts === 1, "400 error was retried");
});

test("Permanent 401 error is not retried", async () => {
  let attempts = 0;
  try {
    await retryTransient(async () => { attempts += 1; throw httpError(401); }, { retries: 4, baseDelayMs: 0, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
  } catch { /* expected */ }
  assert(attempts === 1, "401 error was retried");
});

test("Permanent 403 error is not retried", async () => {
  let attempts = 0;
  try {
    await retryTransient(async () => { attempts += 1; throw httpError(403); }, { retries: 4, baseDelayMs: 0, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
  } catch { /* expected */ }
  assert(attempts === 1, "403 error was retried");
});

test("Final transient failure is returned after maximum attempts", async () => {
  let attempts = 0;
  const final = httpError(503);
  try {
    await retryTransient(async () => { attempts += 1; throw final; }, { retries: 3, baseDelayMs: 0, sleep: async () => undefined, shouldRetry: shouldRetryTransient });
    throw new Error("expected failure");
  } catch (error) {
    assert(error === final, "final error was not returned unchanged");
  }
  assert(attempts === 4, `expected 4 attempts, got ${attempts}`);
});

await Promise.all(pending);
console.log(`\nRetry tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
