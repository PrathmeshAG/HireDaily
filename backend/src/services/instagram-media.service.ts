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
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    code?: number;
  };
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

/**
 * Fetches media owned by the configured Instagram Professional account.
 * Tokens remain server-side and are never returned to the caller.
 */
export async function fetchInstagramMedia(limit = 50): Promise<InstagramMediaRecord[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const accountId = getInstagramBusinessId();
  const accessToken = getAccessToken();

  const fields = [
    "id",
    "permalink",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "timestamp",
  ].join(",");

  const url =
    `https://graph.facebook.com/v21.0/${encodeURIComponent(accountId)}/media` +
    `?fields=${encodeURIComponent(fields)}` +
    `&limit=${safeLimit}` +
    `&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url);

  let payload: MetaMediaResponse | null = null;
  try {
    payload = (await response.json()) as MetaMediaResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `Instagram media request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  const syncedAt = Date.now();

  return (payload?.data ?? [])
    .filter((item) => typeof item.id === "string" && item.id.trim().length > 0)
    .map((item) => {
      const id = item.id as string;
      return { 
      id: id.trim(),
      permalink: typeof item.permalink === "string" ? item.permalink : null,
      caption: typeof item.caption === "string" ? item.caption : null,
      mediaType: typeof item.media_type === "string" ? item.media_type : null,
      mediaUrl: typeof item.media_url === "string" ? item.media_url : null,
      thumbnailUrl:
        typeof item.thumbnail_url === "string" ? item.thumbnail_url : null,
      timestamp: typeof item.timestamp === "string" ? item.timestamp : null,
      syncedAt,
      };
    });
}
