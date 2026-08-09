// Minimal structured logger for the Phase 4 backend. Kept intentionally
// small and dependency-free so tests and the dev server can log consistently
// without pulling in a logging framework.

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = `[${level.toUpperCase()}] ${message}`;
  const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  // Errors go to stderr so stdout stays clean for the webhook server.
  if (level === "error") {
    console.error(line + payload);
  } else {
    console.log(line + payload);
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    write("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    write("error", message, meta);
  },
};
