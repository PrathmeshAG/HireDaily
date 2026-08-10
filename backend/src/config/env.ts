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

const configuredPublicAppUrl = process.env.PUBLIC_APP_URL?.trim() || "";
const configuredUrlIsLocal = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(?:\/|$)/i.test(configuredPublicAppUrl);

export const env = {
  firebase: readFirebaseEnv(),
  // Public base URL used to build the Hire Daily job detail URL:
  //   `${publicAppUrl}/jobs/{jobId}`
  // Production must never generate localhost links, even if an old Vercel
  // environment variable still contains the development URL.
  publicAppUrl:
    configuredPublicAppUrl && !(process.env.NODE_ENV === "production" && configuredUrlIsLocal)
      ? configuredPublicAppUrl.replace(/\/+$/, "")
      : "https://hiredaily.app",
  // Instagram / Meta config for Phase 5 Checkpoint 3 (public comment replies).
  meta: {
    // Never log or expose this token. It is only used to authenticate Meta
    // Graph API requests.
    accessToken: process.env.META_ACCESS_TOKEN?.trim() || "",
    // Instagram Login uses graph.instagram.com. Facebook Login for Business
    // uses graph.facebook.com. The service starts with this host and can
    // safely fall back to the other host only for an explicit OAuth error.
    apiHost: process.env.META_API_HOST?.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "graph.instagram.com",
    // When "true", the comment-reply service builds + validates the request
    // but NEVER calls the real Meta API and returns a simulated success.
    // Production must explicitly set this to "true" to enable dry-run;
    // it is never enabled implicitly.
    dryRun: process.env.META_DRY_RUN?.trim().toLowerCase() === "true",
  },
};
