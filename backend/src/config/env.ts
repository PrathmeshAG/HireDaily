import "dotenv/config";

// Centralized environment access for the Phase 4 backend. Reads Firebase
// Admin configuration from process.env (populated by dotenv). Values are
// lazily read so Firebase Admin is only configured once via the certificate.

interface FirebaseEnv {
  databaseURL: string;
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Firebase Admin private keys are PEM-encoded and therefore contain many
 * embedded newline characters. When exported as an environment variable
 * they are almost always written with literal `\n` escape sequences (e.g.
 * in a `.env` file or shell) because a raw multi-line value is hard to
 * manage. dotenv reads the value literally, so `\n` stays as the two
 * characters backslash + 'n' unless we convert them here. We deliberately
 * convert both `\n` and the doubly-escaped `\\n` so the key works whether
 * the source was a `.env` value or was already JSON-unescaped.
 */



function normalizePrivateKey(raw: string): string {
  if (!raw) return "";
  // Replace \\n first so an already-unescaped JSON value isn't mangled,
  // then \n (the two-char literal) with a real newline.
  return raw.replace(/\\n/g, "\n");
}

function readFirebaseEnv(): FirebaseEnv {
  return {
    databaseURL: process.env.FIREBASE_DATABASE_URL ?? "",
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY ?? ""),
  };
}

export const env = {
  firebase: readFirebaseEnv(),
  // Public base URL used to build the Hire Daily job detail URL:
  //   `${publicAppUrl}/jobs/{jobId}`
  // Prefer PUBLIC_APP_URL (e.g. https://hire-daily.vercel.app). For local dev
  // we fall back to the Vite dev server default if not configured.
  publicAppUrl: process.env.PUBLIC_APP_URL?.trim() || "https://hire-daily.vercel.app",
  // Instagram / Meta config for Phase 5 Checkpoint 3 (public comment replies).
  meta: {
    // Never log or expose this token. It is only used to build the Meta
    // Graph API request URL.
    accessToken: process.env.META_ACCESS_TOKEN?.trim() || "",
    instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID?.trim() || "",
    // When "true", the comment-reply service builds + validates the request
    // but NEVER calls the real Meta API and returns a simulated success.
    // Production must explicitly set this to "true" to enable dry-run;
    // it is never enabled implicitly.
    dryRun: process.env.META_DRY_RUN?.trim().toLowerCase() === "true",
  },
};
