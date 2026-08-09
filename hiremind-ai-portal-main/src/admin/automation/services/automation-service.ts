// Every read/write the Automation UI performs goes through this file.
// It's the ONLY place that knows data currently comes from in-memory mocks —
// swapping to real Firebase/backend later means editing this file only,
// nothing in src/admin/automation/pages/* changes.

import {
  mockAnalytics,
  mockLogs,
  mockPostMappings,
  mockRules,
  mockSettings,
  mockTemplates,
  mockUsers,
} from "../mock-data";
import type {
  AutomationAnalytics,
  AutomationRule,
  AutomationSettings,
  AutomationUser,
  DashboardSummary,
  LogEntry,
  PostMapping,
  Template,
} from "../types";

const LATENCY = 350;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// In-memory stores so create/update/delete feel real within a session.
let postMappings = clone(mockPostMappings);
let rules = clone(mockRules);
let templates = clone(mockTemplates);

// ---------- Dashboard ----------

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date().toISOString().slice(0, 10);
  const todaysLogs = mockLogs.filter(
    (l) => new Date(l.timestamp).toISOString().slice(0, 10) === today,
  );
  return delay({
    connected: mockSettings.instagram.connected,
    totalMappings: postMappings.length,
    activeRules: rules.filter((r) => r.active).length,
    todaysComments: todaysLogs.filter((l) => l.type === "comment_sent").length,
    todaysDMs: todaysLogs.filter((l) => l.type === "dm_sent").length,
    failedAutomations: todaysLogs.filter((l) => l.type === "error").length,
  });
}

export async function getRecentLogs(limit = 6): Promise<LogEntry[]> {
  return delay(mockLogs.slice(0, limit));
}

// ---------- Post Mappings ----------

export async function getPostMappings(): Promise<PostMapping[]> {
  return delay(clone(postMappings));
}

export async function createPostMapping(
  data: Omit<PostMapping, "id" | "createdAt" | "status">,
): Promise<PostMapping> {
  const created: PostMapping = { ...data, id: `map_${Date.now()}`, status: "active", createdAt: Date.now() };
  postMappings = [created, ...postMappings];
  return delay(clone(created));
}

export async function updatePostMapping(
  id: string,
  data: Partial<Omit<PostMapping, "id" | "createdAt">>,
): Promise<void> {
  postMappings = postMappings.map((m) => (m.id === id ? { ...m, ...data } : m));
  return delay(undefined);
}

export async function archivePostMapping(id: string): Promise<void> {
  return updatePostMapping(id, { status: "archived" });
}

export async function deletePostMapping(id: string): Promise<void> {
  postMappings = postMappings.filter((m) => m.id !== id);
  return delay(undefined);
}

// ---------- Rules ----------

export async function getRules(): Promise<AutomationRule[]> {
  return delay(clone(rules));
}

export async function createRule(
  data: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">,
): Promise<AutomationRule> {
  const now = Date.now();
  const created: AutomationRule = { ...data, id: `rule_${now}`, createdAt: now, updatedAt: now };
  rules = [created, ...rules];
  return delay(clone(created));
}

export async function updateRule(
  id: string,
  data: Partial<Omit<AutomationRule, "id" | "createdAt">>,
): Promise<void> {
  rules = rules.map((r) => (r.id === id ? { ...r, ...data, updatedAt: Date.now() } : r));
  return delay(undefined);
}

export async function deleteRule(id: string): Promise<void> {
  rules = rules.filter((r) => r.id !== id);
  return delay(undefined);
}

// ---------- Templates ----------

export async function getTemplates(): Promise<Template[]> {
  return delay(clone(templates));
}

export async function createTemplate(
  data: Omit<Template, "id" | "updatedAt">,
): Promise<Template> {
  const created: Template = { ...data, id: `tpl_${Date.now()}`, updatedAt: Date.now() };
  templates = [created, ...templates];
  return delay(clone(created));
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, "id">>,
): Promise<void> {
  templates = templates.map((t) => (t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t));
  return delay(undefined);
}

export async function deleteTemplate(id: string): Promise<void> {
  templates = templates.filter((t) => t.id !== id);
  return delay(undefined);
}

// ---------- Users ----------

export async function getUsers(): Promise<AutomationUser[]> {
  return delay(clone(mockUsers));
}

// ---------- Logs ----------

export async function getLogs(): Promise<LogEntry[]> {
  return delay(clone(mockLogs));
}

// ---------- Analytics ----------

export async function getAnalytics(): Promise<AutomationAnalytics> {
  return delay(clone(mockAnalytics));
}

// ---------- Settings ----------

export async function getSettings(): Promise<AutomationSettings> {
  return delay(clone(mockSettings));
}
