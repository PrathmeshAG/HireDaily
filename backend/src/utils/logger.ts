// Dependency-free structured logger for production and local development.
// Sensitive values are redacted before anything reaches stdout/stderr.

type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY = /(access.?token|refresh.?token|private.?key|client.?secret|app.?secret|webhook.?token|password|authorization|cookie|x-hub-signature)/i;
const TOKEN_PATTERN = /(Bearer\s+)[A-Za-z0-9._~+/=-]+|([?&](?:access_token|client_secret|authorization)=[^&\s]+)/gi;

export function redactSensitiveValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(TOKEN_PATTERN, (_match, bearerPrefix: string | undefined) =>
      bearerPrefix ? `${bearerPrefix}<redacted>` : "<redacted>",
    );
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactSensitiveValue(value.message),
    };
  }
  if (Array.isArray(value)) return value.map(redactSensitiveValue);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? "<redacted>" : redactSensitiveValue(item);
    }
    return output;
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: String(redactSensitiveValue(message)),
    ...(meta ? (redactSensitiveValue(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else console.log(line);
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
