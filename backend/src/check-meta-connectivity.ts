// Backend-only diagnostic for Meta connectivity.
// Secrets are sent only in Authorization headers and are never printed.

import "dotenv/config";
import { env } from "./config/env.js";
import { redactSensitiveValue } from "./utils/logger.js";

const META_GRAPH_VERSION = "v24.0";

async function main(): Promise<void> {
  const accessToken = env.meta.accessToken;
  const businessId = env.meta.instagramBusinessId;

  console.log("=== Meta Graph API connectivity diagnostic ===");

  if (!accessToken) {
    console.log(JSON.stringify({ apiReachable: false, tokenValid: false, error: "META_ACCESS_TOKEN not configured" }));
    return;
  }
  if (!businessId) {
    console.log(JSON.stringify({ apiReachable: false, tokenValid: null, error: "INSTAGRAM_BUSINESS_ID not configured" }));
    return;
  }

  const headers = { Authorization: `Bearer ${accessToken}` };
  const meUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=id,name`;
  let meOk = false;
  let meStatus = 0;
  let meError: string | null = null;

  try {
    const res = await fetch(meUrl, { method: "GET", headers });
    meStatus = res.status;
    const json = (await res.json().catch(() => null)) as unknown;
    if (res.ok) meOk = true;
    else meError = redactSensitiveValue((json as { error?: { message?: string } } | null)?.error?.message ?? `http_${res.status}`) as string;
  } catch (err) {
    meError = err instanceof Error ? err.message : "unknown_network_error";
  }

  const igUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(businessId)}?fields=id,username,account_type`;
  let igOk = false;
  let igStatus = 0;
  let igError: string | null = null;
  let igUsername: string | null = null;
  let igType: string | null = null;

  try {
    const res = await fetch(igUrl, { method: "GET", headers });
    igStatus = res.status;
    const json = (await res.json().catch(() => null)) as unknown;
    if (res.ok) {
      igOk = true;
      const data = json as { username?: string; account_type?: string } | null;
      igUsername = data?.username ?? null;
      igType = data?.account_type ?? null;
    } else {
      igError = redactSensitiveValue((json as { error?: { message?: string } } | null)?.error?.message ?? `http_${res.status}`) as string;
    }
  } catch (err) {
    igError = err instanceof Error ? err.message : "unknown_network_error";
  }

  console.log(
    JSON.stringify({
      apiReachable: meStatus > 0 || igStatus > 0,
      tokenValid: meOk,
      tokenMeStatus: meStatus || null,
      businessIdValid: igOk,
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
  console.log(JSON.stringify({ apiReachable: false, tokenValid: false, error: "unexpected_failure" }));
  process.exit(1);
});
