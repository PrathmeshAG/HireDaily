import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

export function createApiRateLimiter(overrides?: { windowMs?: number; max?: number }) {
  return rateLimit({
    windowMs: overrides?.windowMs ?? env.rateLimit.windowMs,
    limit: overrides?.max ?? env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "rate_limit_exceeded" },
  });
}

export const apiRateLimiter = createApiRateLimiter();
