export interface InstagramMediaRecord {
  id: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  timestamp: string | null;
  syncedAt: number;
}

interface MetaMediaResponse {
  data?: Array<{
    id?: string;
    permalink?: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    timestamp?: string;
  }>;
  paging?: { next?: string };
  error?: { message?: string; code?: number; type?: string };
}

const DEFAULT_GRAPH_VERSION = "v24.0";

function graphVersions(): string[] {
  const configured = process.env.META_GRAPH_VERSION?.trim();
  return Array.from(new Set([configured, DEFAULT_GRAPH_VERSION, "v23.0", "v22.0", "v21.0"].filter(Boolean) as string[]));
}

function getInstagramBusinessId(): string {
  const value = process.env.INSTAGRAM_BUSINESS_ID?.trim();
  if (!value) throw new Error("INSTAGRAM_BUSINESS_ID is not configured");
  return value;
}

function getAccessToken(): string {
  const value = process.env.META_ACCESS_TOKEN?.trim();
  if (!value) throw new Error("META_ACCESS_TOKEN is not configured");
  return value;
}

const MEDIA_FIELDS = [
  "id",
  "permalink",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "timestamp",
].join(",");

function normalizeMedia(payload: MetaMediaResponse | null, syncedAt: number): InstagramMediaRecord[] {
  return (payload?.data ?? [])
    .filter((item) => typeof item.id === "string" && item.id.trim().length > 0)
    .map((item) => ({
      id: item.id!.trim(),
      permalink: typeof item.permalink === "string" ? item.permalink : null,
      caption: typeof item.caption === "string" ? item.caption : null,
      mediaType: typeof item.media_type === "string" ? item.media_type : null,
      mediaUrl: typeof item.media_url === "string" ? item.media_url : null,
      thumbnailUrl: typeof item.thumbnail_url === "string" ? item.thumbnail_url : null,
      timestamp: typeof item.timestamp === "string" ? item.timestamp : null,
      syncedAt,
    }));
}

async function getJson(url: string): Promise<{ response: Response; payload: MetaMediaResponse | null }> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  let payload: MetaMediaResponse | null = null;
  try {
    payload = (await response.json()) as MetaMediaResponse;
  } catch {
    payload = null;
  }

  return { response, payload };
}

/**
 * Fetch media owned by the configured Instagram Professional account.
 * Supports both Meta Graph host variants because Meta has multiple
 * authentication/API paths for Instagram Professional accounts.
 */
export async function fetchInstagramMedia(limit = 50): Promise<InstagramMediaRecord[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const accountId = getInstagramBusinessId();
  const accessToken = getAccessToken();
  const syncedAt = Date.now();
  const errors: string[] = [];

  // Primary path: Instagram Professional account media through graph.facebook.com.
  for (const version of graphVersions()) {
    const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(accountId)}/media`);
    url.searchParams.set("fields", MEDIA_FIELDS);
    url.searchParams.set("limit", String(safeLimit));
    url.searchParams.set("access_token", accessToken);

    try {
      const { response, payload } = await getJson(url.toString());
      if (response.ok) return normalizeMedia(payload, syncedAt);
      errors.push(`facebook/${version}: ${payload?.error?.message ?? `HTTP ${response.status}`}`);
    } catch (error) {
      errors.push(`facebook/${version}: ${error instanceof Error ? error.message : "network error"}`);
    }
  }

  // Fallback path used by the Instagram API authentication model.
  // Here the token itself identifies the Instagram professional account.
  for (const version of graphVersions()) {
    const url = new URL(`https://graph.instagram.com/${version}/me/media`);
    url.searchParams.set("fields", MEDIA_FIELDS);
    url.searchParams.set("limit", String(safeLimit));
    url.searchParams.set("access_token", accessToken);

    try {
      const { response, payload } = await getJson(url.toString());
      if (response.ok) return normalizeMedia(payload, syncedAt);
      errors.push(`instagram/${version}: ${payload?.error?.message ?? `HTTP ${response.status}`}`);
    } catch (error) {
      errors.push(`instagram/${version}: ${error instanceof Error ? error.message : "network error"}`);
    }
  }

  throw new Error(`Instagram media sync failed. ${errors.slice(0, 3).join(" | ")}`);
}
