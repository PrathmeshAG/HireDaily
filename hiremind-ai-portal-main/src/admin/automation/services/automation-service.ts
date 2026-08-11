// Every read/write the Automation UI performs goes through this file.
// It's the ONLY place that knows where data comes from — swapping mocks for
// the real backend means editing this file only, nothing in
// src/admin/automation/pages/* changes.
//
// Phase 6 Checkpoint 2: these methods now call the backend automation API
// (GET/POST/PATCH/DELETE /api/automation/rules, /templates, /post-mappings).
// The backend is the only layer that touches Firebase Admin. No secrets are
// ever sent to or returned from the browser. Jobs remain read-only.

import { auth } from "../../../lib/firebase";
import type {
  AutomationAnalytics,
  AutomationRule,
  AutomationSettings,
AutomationUser,
  DashboardSummary,
  LogEntry,
  LogType,
  PostMapping,
  Template,
} from "../types";

// Backend base URL. In dev the backend runs on :8787 (see backend/package.json).
// In production this would be the deployed backend origin. This is a public
// URL only — no secrets live here.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = path.startsWith("/api/automation/") && auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// ---------- Health / Dashboard ----------

export async function checkBackendHealth(): Promise<{
  status: string;
  service: string;
  firebaseAdmin: boolean;
  timestamp: string;
}> {
  return request("/health");
}

// ---------- Dashboard ----------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const data = await request<DashboardSummary>("/api/automation/summary");
  return data;
}

export async function getRecentLogs(limit = 6): Promise<LogEntry[]> {
  const { logs } = await request<{ logs: LogEntry[] }>(
    `/api/automation/logs?limit=${encodeURIComponent(limit)}`,
  );
  return logs;
}

// ---------- Instagram Media / Post Mappings ----------

export interface InstagramMedia {
  id: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  timestamp: string | null;
  syncedAt: number | null;
}

export async function getInstagramMedia(limit = 50): Promise<InstagramMedia[]> {
  const { media } = await request<{ media: InstagramMedia[] }>(
    `/api/automation/instagram/media?limit=${encodeURIComponent(limit)}`,
  );
  return media;
}

export async function syncInstagramMedia(limit = 50): Promise<InstagramMedia[]> {
  const { media } = await request<{ media: InstagramMedia[] }>(
    "/api/automation/instagram/media/sync",
    {
      method: "POST",
      body: JSON.stringify({ limit }),
    },
  );
  return media;
}

export async function getPostMappings(): Promise<PostMapping[]> {
  const { mappings } = await request<{
    mappings: {
      id: string;
      mediaId: string;
      jobId: string;
      jobTitleCache: string | null;
      instagramPostUrl: string | null;
      mappedAt: number | null;
      updatedAt: number | null;
      status: "active" | "archived";
    }[];
  }>("/api/automation/post-mappings");

  return mappings.map((m) => ({
    id: m.id,
    channel: "instagram",
    mediaId: m.mediaId,
    instagramPostUrl: m.instagramPostUrl ?? "",
    thumbnailUrl: "",
    companyName: "",
    jobTitle: m.jobTitleCache ?? "",
    jobId: m.jobId,
    status: m.status,
    createdAt: m.mappedAt ?? 0,
  }));
}

export async function createPostMapping(
  data: Omit<PostMapping, "id" | "createdAt" | "status">,
): Promise<PostMapping> {
  const created = await request<{ id: string; mediaId: string; jobId: string }>(
    "/api/automation/post-mappings",
    {
      method: "POST",
      body: JSON.stringify({
        mediaId: data.mediaId,
        instagramPostUrl: data.instagramPostUrl,
        jobId: data.jobId,
        jobTitleCache: data.jobTitle || null,
      }),
    },
  );

  return {
    ...data,
    id: created.mediaId,
    status: "active",
    createdAt: Date.now(),
  };
}

export async function updatePostMapping(
  id: string,
  data: Partial<Omit<PostMapping, "id" | "createdAt">>,
): Promise<void> {
  await request(`/api/automation/post-mappings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      instagramPostUrl: data.instagramPostUrl,
      jobId: data.jobId,
      jobTitleCache:
        typeof data.jobTitle === "string" ? data.jobTitle : undefined,
    }),
  });
}

export async function archivePostMapping(id: string): Promise<void> {
  await request(`/api/automation/post-mappings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived" }),
  });
}

export async function deletePostMapping(id: string): Promise<void> {
  await request(`/api/automation/post-mappings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---------- Rules ----------

export async function getRules(): Promise<AutomationRule[]> {
const { rules } = await request<{ rules: AutomationRule[] }>("/api/automation/rules");
  // Backend already returns `mode` (backward-compatible missing => keyword).
  return rules;
}

export async function createRule(
  data: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">,
): Promise<AutomationRule> {
  const res = await request<{ id: string }>("/api/automation/rules", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const now = Date.now();
  return { ...(data as AutomationRule), id: res.id, createdAt: now, updatedAt: now };
}

export async function updateRule(
  id: string,
  data: Partial<Omit<AutomationRule, "id" | "createdAt">>,
): Promise<void> {
  await request(`/api/automation/rules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteRule(id: string): Promise<void> {
  await request(`/api/automation/rules/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------- Templates ----------

export async function getTemplates(): Promise<Template[]> {
  const { templates } = await request<{
    templates: { id: string; kind: string; channel: string; name: string; text: string; updatedAt: number }[];
  }>("/api/automation/templates");
  return templates.map((t) => ({
    id: t.id,
    kind: t.kind === "dm" ? ("dm" as const) : ("comment" as const),
    channel: (t.channel as Template["channel"]) ?? "instagram",
    name: t.name,
    text: t.text,
    updatedAt: t.updatedAt,
  }));
}

export async function createTemplate(
  data: Omit<Template, "id" | "updatedAt">,
): Promise<Template> {
  const res = await request<{ id: string }>("/api/automation/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { ...data, id: res.id, updatedAt: Date.now() };
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id">>,
): Promise<void> {
  await request(`/api/automation/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await request(`/api/automation/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------- Users ----------

export async function getUsers(): Promise<AutomationUser[]> {
  const { users } = await request<{
    users: {
      userId: string;
      username: string | null;
      firstSeenAt: number;
      lastActivityAt: number;
      commentCount: number;
      dmCount: number;
      active: boolean;
      followStatus?: "verified" | "not_verified" | "unsupported" | "unknown";
    }[]
  }>("/api/automation/users");

  return users.map((u) => ({
    id: u.userId,
    channel: "instagram",
    username: u.username ?? "unknown",
    avatarUrl: "",
    lastComment: null,
    lastDM: null,
    followStatus:
      u.followStatus === "verified"
        ? "follower"
        : u.followStatus === "not_verified"
          ? "not_follower"
          : "unknown",
    commentCount: u.commentCount,
    dmCount: u.dmCount,
    lastSeen: u.lastActivityAt,
  }));
}

// ---------- Logs ----------

export async function getLogs(): Promise<LogEntry[]> {
  const { logs } = await request<{
    logs: {
      id: string;
      channel: string;
      type: string;
      username: string;
      detail: string;
      ruleKeyword: string | null;
      timestamp: number;
    }[];
  }>("/api/automation/logs");
  return logs.map((l) => ({
    id: l.id,
    channel: "instagram",
    type: (l.type as LogType) ?? "error",
    username: l.username,
    detail: l.detail,
    ruleKeyword: l.ruleKeyword,
    timestamp: l.timestamp,
  }));
}

// ---------- Analytics ----------

export async function getAnalytics(): Promise<AutomationAnalytics> {
  const data = await request<{
    users: number;
    daily: {
      date: string;
      commentsReceived: number;
      commentsMatched: number;
      commentsSent: number;
      commentsFailed: number;
      dmsSent: number;
      dmsFailed: number;
      followVerified: number;
      followNotVerified: number;
      followUnsupported: number;
      automationErrors: number;
    }[];
    topKeywords: { keyword: string; count: number }[];
    topPosts: {
      postLabel: string;
      triggers: number;
      mediaId?: string;
      postUrl?: string | null;
    }[];
  }>("/api/automation/analytics");

  return {
    daily: data.daily.map((d) => ({
      date: d.date,
      commentsReceived: d.commentsReceived,
      triggers: d.commentsMatched,
      repliesSent: d.commentsSent,
      dmsSent: d.dmsSent,
      commentsFailed: d.commentsFailed,
      dmsFailed: d.dmsFailed,
      automationErrors: d.automationErrors,
    })),
    topKeywords: data.topKeywords,
    topPosts: data.topPosts,
  };
}

// ---------- Settings ----------

export async function getSettings(): Promise<AutomationSettings> {
  const data = await request<{
    firebaseConfigured: boolean;
    metaConfigured: boolean;
    dryRun: boolean;
    webhookConfigured: boolean;
    serviceStatus: string;
    instagram: {
      connected: boolean;
      username: string | null;
      accountType: string | null;
    };
    webhook?: {
      subscribed: boolean;
      lastEventAt: number | null;
      url: string;
    };
    api?: {
      ok: boolean;
      latencyMs: number | null;
      lastCheckedAt: number | null;
    };
  }>("/api/automation/settings");

  return {
    instagram: {
      connected: data.instagram.connected,
      username: data.instagram.username,
      accountType: data.instagram.accountType,
      tokenExpiresAt: null,
    },
    webhook: {
      subscribed: data.webhook?.subscribed ?? data.webhookConfigured,
      lastEventAt: data.webhook?.lastEventAt ?? null,
      url: data.webhook?.url ?? "/webhooks/instagram",
    },
    api: {
      ok: data.api?.ok ?? data.serviceStatus === "operational",
      latencyMs: data.api?.latencyMs ?? null,
      lastCheckedAt: data.api?.lastCheckedAt ?? Date.now(),
    },
  };
}
