// Meta access-token health: validity + expiry date, and auth-error detection.
//
//  - With META_APP_ID + META_APP_SECRET we call Graph `debug_token`, which
//    reports is_valid and expires_at (0 = the token never expires).
//  - Without them (or for Instagram-Login tokens that debug_token cannot
//    inspect) we fall back to a plain validity probe and report the expiry as
//    unknown instead of guessing.

export interface TokenState {
  /** true = valid, false = rejected by Meta, null = could not determine. */
  valid: boolean | null;
  /** Unix ms when the token expires. null when it never expires or is unknown. */
  expiresAt: number | null;
  neverExpires: boolean;
  /** Unix ms when data access expires (Meta's separate 90-day clock), if reported. */
  dataAccessExpiresAt: number | null;
  method: "debug_token" | "probe" | "none";
  checkedAt: number;
  /** Short, safe reason (no secrets) when valid is not true. */
  error: string | null;
}

const GRAPH = "https://graph.facebook.com/v24.0";

/** Detects Meta authentication failures in an error string from any call. */
export function isMetaAuthError(text: string | null | undefined): boolean {
  if (!text) return false;
  return /error validating access token|session has expired|access token (?:has )?expired|invalid oauth access token|oauthexception|(?:^|\D)190(?:\D|$)|meta_http_401|_401:|token_invalid/i.test(text);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(ms: number | null, now: number = Date.now()): number | null {
  if (ms === null) return null;
  return Math.floor((ms - now) / DAY_MS);
}

export async function checkMetaToken(
  opts: {
    fetchImpl?: typeof fetch;
    token?: string;
    appId?: string;
    appSecret?: string;
    now?: number;
  } = {},
): Promise<TokenState> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const token = (opts.token ?? process.env.META_ACCESS_TOKEN ?? "").trim();
  const appId = (opts.appId ?? process.env.META_APP_ID ?? "").trim();
  const appSecret = (opts.appSecret ?? process.env.META_APP_SECRET ?? "").trim();
  const now = opts.now ?? Date.now();

  const base: TokenState = {
    valid: null,
    expiresAt: null,
    neverExpires: false,
    dataAccessExpiresAt: null,
    method: "none",
    checkedAt: now,
    error: null,
  };

  if (!token) return { ...base, valid: false, error: "missing_access_token" };

  let debugSaysInvalid = false;

  if (appId && appSecret) {
    try {
      const url = `${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`;
      const res = await fetchImpl(url);
      const json = (await res.json().catch(() => null)) as {
        data?: { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number };
      } | null;
      const data = json?.data;
      if (res.ok && data && typeof data.is_valid === "boolean") {
        if (data.is_valid) {
          const exp = typeof data.expires_at === "number" ? data.expires_at : null;
          const da = typeof data.data_access_expires_at === "number" && data.data_access_expires_at > 0 ? data.data_access_expires_at * 1000 : null;
          return {
            valid: true,
            expiresAt: exp && exp > 0 ? exp * 1000 : null,
            neverExpires: exp === 0,
            dataAccessExpiresAt: da,
            method: "debug_token",
            checkedAt: now,
            error: null,
          };
        }
        // debug_token can say "invalid" for token types it does not
        // understand (e.g. Instagram-Login tokens). Confirm with real calls.
        debugSaysInvalid = true;
      }
    } catch {
      // fall through to the probes
    }
  }

  // Probe the same two hosts the connection check uses. A token only has to
  // work on ONE of them (Facebook-Login/Page tokens vs Instagram-Login tokens).
  const probes = [
    `${GRAPH}/me?fields=id&access_token=${encodeURIComponent(token)}`,
    `https://graph.instagram.com/v24.0/me?fields=user_id&access_token=${encodeURIComponent(token)}`,
  ];
  let authRejections = 0;
  let otherFailure: string | null = null;
  for (const url of probes) {
    try {
      const res = await fetchImpl(url);
      if (res.ok) return { ...base, valid: true, method: "probe" };
      const json = (await res.json().catch(() => null)) as { error?: { code?: number } } | null;
      if (res.status === 401 || json?.error?.code === 190) authRejections += 1;
      else otherFailure = `meta_http_${res.status}`;
    } catch {
      otherFailure = "network_error";
    }
  }

  // Invalid only when EVERY host rejected the token as an auth failure.
  if (authRejections === probes.length) {
    return { ...base, valid: false, method: "probe", error: "token_invalid_or_expired" };
  }
  if (debugSaysInvalid && authRejections > 0 && !otherFailure) {
    return { ...base, valid: false, method: "probe", error: "token_invalid_or_expired" };
  }
  return { ...base, method: "probe", error: otherFailure };
}
