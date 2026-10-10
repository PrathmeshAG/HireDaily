// Operator alerts. Sends a short message to every configured channel:
//   - Telegram  : TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   - Email     : RESEND_API_KEY + ALERT_EMAIL_TO (+ optional ALERT_EMAIL_FROM)
//   - Webhook   : ALERT_WEBHOOK_URL (Slack/Discord-compatible `{ text, content }`)
// All optional. With nothing configured, sendAlert is a harmless no-op.
// Secrets are never logged or returned; failures only report the channel name.

import { logger } from "../utils/logger.js";

export type AlertChannel = "telegram" | "email" | "webhook";

export interface AlertResult {
  sent: AlertChannel[];
  failed: AlertChannel[];
  configured: AlertChannel[];
}

export interface AlertMessage {
  title: string;
  body: string;
}

type FetchLike = typeof fetch;

function readEnv(values: NodeJS.ProcessEnv = process.env) {
  const t = (k: string) => values[k]?.trim() ?? "";
  return {
    telegramToken: t("TELEGRAM_BOT_TOKEN"),
    telegramChatId: t("TELEGRAM_CHAT_ID"),
    resendKey: t("RESEND_API_KEY"),
    emailTo: t("ALERT_EMAIL_TO"),
    emailFrom: t("ALERT_EMAIL_FROM") || "HireDaily <onboarding@resend.dev>",
    webhookUrl: t("ALERT_WEBHOOK_URL"),
  };
}

export function getConfiguredChannels(values: NodeJS.ProcessEnv = process.env): AlertChannel[] {
  const e = readEnv(values);
  const out: AlertChannel[] = [];
  if (e.telegramToken && e.telegramChatId) out.push("telegram");
  if (e.resendKey && e.emailTo) out.push("email");
  if (/^https:\/\//i.test(e.webhookUrl)) out.push("webhook");
  return out;
}

async function post(
  fetchImpl: FetchLike,
  url: string,
  init: { headers?: Record<string, string>; body: unknown },
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      body: JSON.stringify(init.body),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Sends the alert to all configured channels. Never throws. */
export async function sendAlert(
  message: AlertMessage,
  opts: { fetchImpl?: FetchLike; values?: NodeJS.ProcessEnv } = {},
): Promise<AlertResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const e = readEnv(opts.values);
  const configured = getConfiguredChannels(opts.values);
  const sent: AlertChannel[] = [];
  const failed: AlertChannel[] = [];
  const text = `${message.title}\n\n${message.body}`.slice(0, 3500);

  const jobs: Promise<void>[] = configured.map(async (channel) => {
    let ok = false;
    if (channel === "telegram") {
      ok = await post(fetchImpl, `https://api.telegram.org/bot${e.telegramToken}/sendMessage`, {
        body: { chat_id: e.telegramChatId, text, disable_web_page_preview: true },
      });
    } else if (channel === "email") {
      ok = await post(fetchImpl, "https://api.resend.com/emails", {
        headers: { Authorization: `Bearer ${e.resendKey}` },
        body: {
          from: e.emailFrom,
          to: e.emailTo.split(",").map((s) => s.trim()).filter(Boolean),
          subject: message.title.slice(0, 150),
          text: message.body,
        },
      });
    } else {
      ok = await post(fetchImpl, e.webhookUrl, { body: { text, content: text } });
    }
    (ok ? sent : failed).push(channel);
    if (!ok) logger.warn("Alert delivery failed", { channel });
  });

  await Promise.all(jobs);
  return { sent, failed, configured };
}
