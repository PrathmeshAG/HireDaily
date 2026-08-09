// Backend-only diagnostic — verify Meta Graph API connectivity for the
// configured Instagram Business Account.
//
// SAFETY (temporary, backend-only):
//   - Reads credentials ONLY from process.env (dotenv).
//   - Two read-only calls:
//       1) GET /me  -> confirms the access token itself is valid.
//       2) GET /{INSTAGRAM_BUSINESS_ID} -> confirms token can access the
//          configured Instagram Business Account.
//   - NEVER prints META_ACCESS_TOKEN or META_APP_SECRET.
//   - Returns only safe info: HTTP status, account ID, username, account
//     type, and whether the connection is valid.
//   - Does NOT write to Firebase or jobs/*, does NOT change META_DRY_RUN,
//     does NOT send real replies/DMs.

import "dotenv/config";

const META_GRAPH_VERSION = "v21.0";

function redactError(msg: string): string {
  return (msg || "").replace(
    /EAAC[^&\s]*|EAA[^&\s]*|IG[A-Z0-9]{10,}|access_token=[^&\s]*|X-Access-Token[^&\s]*/g,
    "<redacted>",
  );
}

async function main(): Promise<void> {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
  const businessId = process.env.INSTAGRAM_BUSINESS_ID?.trim() || "";

  // Report token shape only (never the value).
  const tokenShape = {
    configured: accessToken.length > 0,
    length: accessToken.length,
    prefix: accessToken.slice(0, 4),
    suffix: accessToken.slice(-4),
  };

  console.log("=== Meta Graph API connectivity diagnostic ===");
  console.log("TokenShape:", JSON.stringify(tokenShape));

  if (!accessToken) {
    console.log("Result:", JSON.stringify({ apiReachable: false, tokenValid: false, error: "META_ACCESS_TOKEN not configured" }));
    return;
  }
  if (!businessId) {
    console.log("Result:", JSON.stringify({ apiReachable: false, tokenValid: null, error: "INSTAGRAM_BUSINESS_ID not configured" }));
    return;
  }

  // 1) Validate the token itself via /me (never log the token).
  const meUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  let meOk = false;
  let meStatus = 0;
  let meError: string | null = null;
  try {
    const res = await fetch(meUrl, { method: "GET" });
    meStatus = res.status;
    const json = (await res.json().catch(() => null)) as unknown;
    if (res.ok) {
      meOk = true;
    } else {
      const err = (json as { error?: { message?: string; code?: number } } | null)?.error;
      meError = err ? redactError(err.message ?? `http_${res.status}`) : `http_${res.status}`;
    }
  } catch (err) {
    meError = (err instanceof Error ? err.message : "unknown_network_error");
  }

  // 2) Validate access to the Instagram Business Account.
  const igUrl =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(businessId)}` +
    `?fields=id,username,account_type&access_token=${encodeURIComponent(accessToken)}`;
  let igOk = false;
  let igStatus = 0;
  let igError: string | null = null;
  let igUsername: string | null = null;
  let igType: string | null = null;
  try {
    const res = await fetch(igUrl, { method: "GET" });
    igStatus = res.status;
    const json = (await res.json().catch(() => null)) as unknown;
    if (res.ok) {
      igOk = true;
      const data = json as { id?: string; username?: string; account_type?: string } | null;
      igUsername = data?.username ?? null;
      igType = data?.account_type ?? null;
    } else {
      const err = (json as { error?: { message?: string; code?: number } } | null)?.error;
      igError = err ? redactError(err.message ?? `http_${res.status}`) : `http_${res.status}`;
    }
  } catch (err) {
    igError = err instanceof Error ? err.message : "unknown_network_error";
  }

  const tokenValid = meOk;
  const businessValid = igOk;

  console.log(
    "Result:",
    JSON.stringify({
      apiReachable: (meStatus > 0 || igStatus > 0),
      tokenValid,
      tokenMeStatus: meStatus || null,
      businessIdValid: businessValid,
      businessIdStatus: igStatus || null,
      instagramAccountId: businessId,
      username: igUsername,
      accountType: igType,
      tokenError: meOk ? null : meError,
      businessError: igOk ? null : igError,
    }),
  );
}

main().catch(() => {
  console.log("Result:", JSON.stringify({ apiReachable: false, tokenValid: false, error: "unexpected_failure" }));
  process.exit(1);
});
