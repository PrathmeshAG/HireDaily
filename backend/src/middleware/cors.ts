import cors from "cors";
import { env } from "../config/env.js";

export function createCorsMiddleware(origins: string[] = env.cors.origins) {
  const allowedOrigins = new Set(origins);
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("cors_origin_not_allowed"));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Hub-Signature-256"],
    maxAge: 600,
  });
}

export const corsMiddleware = createCorsMiddleware();
