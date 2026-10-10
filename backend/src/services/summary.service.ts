// Builds the plain-text daily summary sent to the operator.

import type { TokenState } from "./token-health.service.js";
import { daysUntil } from "./token-health.service.js";

export interface DayCounters {
  commentsReceived: number;
  triggers: number;
  repliesSent: number;
  dmsSent: number;
  commentsFailed: number;
  dmsFailed: number;
  automationErrors: number;
  followVerified: number;
  followNotVerified: number;
}

export const EMPTY_DAY: DayCounters = {
  commentsReceived: 0, triggers: 0, repliesSent: 0, dmsSent: 0,
  commentsFailed: 0, dmsFailed: 0, automationErrors: 0, followVerified: 0, followNotVerified: 0,
};

export interface SummaryInput {
  date: string;
  today: DayCounters;
  yesterday?: DayCounters | null;
  token?: TokenState | null;
  missingJobMappings?: number;
  retryableFailures?: number;
  unmatchedComments?: number;
  clicks?: number | null;
  dryRun?: boolean;
  now?: number;
}

function trend(today: number, yesterday: number | undefined): string {
  if (yesterday === undefined) return "";
  if (yesterday === 0) return today > 0 ? " (new)" : "";
  const d = Math.round(((today - yesterday) / yesterday) * 100);
  return d === 0 ? " (same as yesterday)" : ` (${d > 0 ? "+" : ""}${d}% vs yesterday)`;
}

export function buildDailySummary(input: SummaryInput): { title: string; body: string } {
  const t = input.today;
  const y = input.yesterday ?? undefined;
  const errors = t.commentsFailed + t.dmsFailed + t.automationErrors;
  const lines: string[] = [];

  lines.push(`Comments: ${t.commentsReceived}${trend(t.commentsReceived, y?.commentsReceived)}`);
  lines.push(`Rule matches: ${t.triggers}`);
  lines.push(`Public replies: ${t.repliesSent}`);
  lines.push(`DMs sent: ${t.dmsSent}${trend(t.dmsSent, y?.dmsSent)}`);
  if (typeof input.clicks === "number") {
    const rate = t.dmsSent > 0 ? ` (${Math.round((input.clicks / t.dmsSent) * 100)}% of DMs)` : "";
    lines.push(`Link clicks: ${input.clicks}${rate}`);
  }
  const followTotal = t.followVerified + t.followNotVerified;
  if (followTotal > 0) lines.push(`Already following: ${t.followVerified} of ${followTotal}`);
  lines.push(`Errors: ${errors}`);

  const attention: string[] = [];
  if (errors > 0) attention.push(`${errors} failed action${errors === 1 ? "" : "s"} today. Check Logs.`);
  if (input.retryableFailures) attention.push(`${input.retryableFailures} comment${input.retryableFailures === 1 ? "" : "s"} can be retried from Logs.`);
  if (input.missingJobMappings) attention.push(`${input.missingJobMappings} post mapping${input.missingJobMappings === 1 ? " has" : "s have"} a job that no longer exists.`);
  if (input.token) {
    if (input.token.valid === false) attention.push("Meta access token is INVALID. Replies and DMs are failing.");
    else {
      const d = daysUntil(input.token.expiresAt, input.now);
      if (d !== null && d <= 7) attention.push(`Meta access token expires in ${Math.max(0, d)} day${d === 1 ? "" : "s"}.`);
    }
  }
  if (input.unmatchedComments) lines.push(`Unmatched comments waiting for review: ${input.unmatchedComments}`);
  if (input.dryRun) attention.push("Dry-run mode is ON. Nothing is actually sent to Instagram.");

  const body = [
    ...lines,
    attention.length ? `\nNeeds attention:\n- ${attention.join("\n- ")}` : "\nAll good. Nothing needs attention. ✅",
  ].join("\n");

  return { title: `📊 HireDaily summary for ${input.date}`, body };
}
