import "dotenv/config";

// Centralized environment access for the backend.
// Reads configuration from process.env.

interface FirebaseEnv {
  databaseURL: string;
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Firebase Admin private keys are PEM-encoded and contain
 * newline characters. Environment variables commonly store
 * them as literal \n sequences, so convert those to real
 * newline characters before Firebase Admin uses the key.
 */
function normalizePrivateKey(raw: string): string {
  if (!raw) return "";

  return raw.replace(/\\n/g, "\n");
}

function readFirebaseEnv(): FirebaseEnv {
  return {
    databaseURL:
      process.env.FIREBASE_DATABASE_URL ?? "",

    projectId:
      process.env.FIREBASE_PROJECT_ID ?? "",

    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL ?? "",

    privateKey:
      normalizePrivateKey(
        process.env.FIREBASE_PRIVATE_KEY ?? "",
      ),
  };
}

export interface AppEnv {
  firebase: FirebaseEnv;

  publicAppUrl: string;

  meta: {
    appId: string;
    accessToken: string;
    appSecret: string;
    instagramBusinessId: string;
    dryRun: boolean;
  };

  auth: {
    adminEmail: string;
  };

  cors: {
    origins: string[];
  };

  rateLimit: {
    windowMs: number;
    max: number;
  };

  port: number;
}

function csv(
  value: string | undefined,
): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallback;
}

export const env: AppEnv = {
  firebase: readFirebaseEnv(),

  publicAppUrl:
    process.env.PUBLIC_APP_URL?.trim() ||
    "https://hire-daily.vercel.app",

  meta: {
    /**
     * Meta App ID
     *
     * This must belong to the same Meta App that owns
     * the Instagram webhook subscription.
     */
    appId:
      process.env.META_APP_ID?.trim() || "",

    /**
     * Instagram / Meta access token.
     */
    accessToken:
      process.env.META_ACCESS_TOKEN?.trim() || "",

    /**
     * Meta App Secret used for
     * X-Hub-Signature-256 verification.
     */
    appSecret:
      process.env.META_APP_SECRET?.trim() || "",

    /**
     * Instagram Business / Professional account ID.
     */
    instagramBusinessId:
      process.env.INSTAGRAM_BUSINESS_ID?.trim() || "",

    /**
     * When true, Instagram actions are simulated.
     */
    dryRun:
      process.env.META_DRY_RUN
        ?.trim()
        .toLowerCase() === "true",
  },

  auth: {
    adminEmail:
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase() || "",
  },

  cors: {
    origins: csv(
      process.env.CORS_ORIGINS ||
        "https://hire-daily.vercel.app,http://localhost:5173",
    ),
  },

  rateLimit: {
    windowMs: positiveInt(
      process.env.API_RATE_LIMIT_WINDOW_MS,
      15 * 60 * 1000,
    ),

    max: positiveInt(
      process.env.API_RATE_LIMIT_MAX,
      120,
    ),
  },

  port: positiveInt(
    process.env.PORT,
    8787,
  ),
};

export interface EnvironmentValidationOptions {
  production?: boolean;
  values?: NodeJS.ProcessEnv;
}

export function validateEnvironment(
  options: EnvironmentValidationOptions = {},
): void {
  const production =
    options.production ??
    process.env.NODE_ENV === "production";

  const values =
    options.values ?? process.env;

  if (!production) {
    return;
  }

  const required = [
    "FIREBASE_DATABASE_URL",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",

    // Meta configuration
    "META_APP_ID",
    "META_APP_SECRET",

    "ADMIN_EMAIL",
    "CORS_ORIGINS",
    "PUBLIC_APP_URL",
  ];

  const missing: string[] =
    required.filter(
      (name) => !values[name]?.trim(),
    );

  /**
   * Webhook verification token.
   */
  if (
    !values.WEBHOOK_VERIFY_TOKEN?.trim() &&
    !values.META_VERIFY_TOKEN?.trim()
  ) {
    missing.push(
      "WEBHOOK_VERIFY_TOKEN (or META_VERIFY_TOKEN)",
    );
  }

  /**
   * Access token and Instagram Business ID
   * are required when dry-run is disabled.
   */
  for (const name of [
    "META_ACCESS_TOKEN",
    "INSTAGRAM_BUSINESS_ID",
  ]) {
    if (
      values.META_DRY_RUN
        ?.trim()
        .toLowerCase() !== "true" &&
      !values[name]?.trim()
    ) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Production configuration missing required environment variable(s): ${missing.join(", ")}`,
    );
  }
}