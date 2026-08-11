export interface RetryOptions<T = unknown> {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  shouldRetryResult?: (result: T, attempt: number) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isTransientHttpStatus(status: number): boolean {
  return TRANSIENT_HTTP_STATUSES.has(status);
}

export async function retryTransient<T>(operation: () => Promise<T>, options: RetryOptions<T> = {}): Promise<T> {
  const retries = Math.max(0, Math.min(options.retries ?? 2, 5));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 200);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 2000);
  const shouldRetry = options.shouldRetry ?? (() => true);
  const shouldRetryResult = options.shouldRetryResult ?? (() => false);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let attempt = 0;
  while (true) {
    try {
      const result = await operation();
      if (attempt >= retries || !shouldRetryResult(result, attempt)) return result;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      attempt += 1;
      await sleep(delay);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      attempt += 1;
      await sleep(delay);
    }
  }
}
