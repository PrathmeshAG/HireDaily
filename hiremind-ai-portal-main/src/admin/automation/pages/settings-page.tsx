import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Instagram, Webhook, Activity, ShieldCheck, CheckCircle2, XCircle, KeyRound, RefreshCw, ScrollText, FlaskConical, BellRing, Send, Loader2, MousePointerClick, Gauge,
} from "lucide-react";
import { checkBackendHealth, getSettings, sendTestAlert, sendSummaryNow } from "../services/automation-service";
import type { TokenState } from "../types";
import { StatusBadge } from "../components/status-badge";
import { PageHeader } from "../components/page-header";
import { SettingsArt } from "../components/illustrations";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How to show the access-token expiry, with a severity for colouring. */
function describeToken(token: TokenState | undefined): { text: string; tone: "ok" | "warn" | "bad" | "muted"; detail?: string } {
  if (!token) return { text: "—", tone: "muted" };
  if (token.valid === false) return { text: "Invalid / expired", tone: "bad" };
  if (token.neverExpires) return { text: "Never expires", tone: "ok", detail: "Page token: valid until revoked." };
  if (token.expiresAt) {
    const days = Math.floor((token.expiresAt - Date.now()) / DAY_MS);
    const date = new Date(token.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return {
      text: `${date} (${days <= 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`})`,
      tone: days <= 3 ? "bad" : days <= 7 ? "warn" : "ok",
      detail: days <= 7 ? "Replace the token before this date." : undefined,
    };
  }
  return { text: "Unknown", tone: "muted", detail: "Meta did not report an expiry for this token." };
}

const TONE_TEXT = { ok: "text-emerald-300", warn: "text-amber-300", bad: "text-rose-300", muted: "text-white/60" } as const;

const DISCONNECT_REASONS: Record<string, { title: string; fix?: string }> = {
  token_invalid_or_expired: {
    title: "Access token is invalid or expired.",
    fix: "Generate a new long-lived token, update META_ACCESS_TOKEN on the backend and redeploy.",
  },
  missing_access_token: { title: "META_ACCESS_TOKEN is not set on the backend." },
  missing_business_id: { title: "INSTAGRAM_BUSINESS_ID is not set on the backend." },
  permission_denied: {
    title: "Meta denied permission for this token.",
    fix: "Re-authorize the app with the Instagram messaging and comments permissions.",
  },
  invalid_account_id: {
    title: "INSTAGRAM_BUSINESS_ID looks wrong for this token.",
    fix: "Check that the ID belongs to the account the token was issued for.",
  },
  rate_limited: { title: "Meta is rate limiting requests right now.", fix: "Wait a few minutes and re-check." },
  network_error: { title: "The backend could not reach Meta.", fix: "Usually temporary. Re-check in a minute." },
};

export function SettingsPage({ onNavigate }: { onNavigate?: (page: "logs") => void }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["automation", "settings"], queryFn: getSettings, staleTime: 15_000 });
  const [healthBusy, setHealthBusy] = useState(false);
  const [alertBusy, setAlertBusy] = useState<"test" | "summary" | null>(null);

  const runAlert = async (kind: "test" | "summary") => {
    setAlertBusy(kind);
    try {
      const r = kind === "test" ? await sendTestAlert() : await sendSummaryNow();
      if (r.configured.length === 0) toast.error("No alert channel is configured yet. See the setup steps below.");
      else if (r.failed.length > 0) toast.error(`Could not deliver to: ${r.failed.join(", ")}. Check the credentials.`);
      else toast.success(`${kind === "test" ? "Test alert" : "Summary"} sent to ${r.sent.join(", ")}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAlertBusy(null);
    }
  };

  const refreshConnection = async () => {
    setHealthBusy(true);
    try {
      const health = await checkBackendHealth();
      const refreshed = await refetch();
      const settings = refreshed.data;
      if (settings?.instagram.connected && settings.api.ok) {
        toast.success(`Instagram @${settings.instagram.username ?? "account"} is connected`);
      } else {
        toast.error(health.firebaseAdmin ? "Backend is online, but Instagram connection needs attention" : "Backend is online, but Firebase is not configured");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setHealthBusy(false);
    }
  };

  const runHealthCheck = async () => {
    setHealthBusy(true);
    try {
      const started = performance.now();
      const health = await checkBackendHealth();
      await refetch();
      const latency = Math.round(performance.now() - started);
      await qc.invalidateQueries({ queryKey: ["automation", "settings"] });
      toast.success(`Health check passed in ${latency}ms${health.firebaseAdmin ? "" : " — Firebase unavailable"}`);
    } catch (e) {
      toast.error(`Health check failed: ${(e as Error).message}`);
    } finally {
      setHealthBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Connection and system health for the automation module."
        art={<SettingsArt />}
      />

      {data?.system?.dryRun && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-medium">Dry-run mode is ON.</span> Comment replies and DMs are simulated and logged, but nothing is sent to Instagram. Set <code className="rounded bg-black/30 px-1">META_DRY_RUN=false</code> on the backend to go live.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="shimmer-loading h-44 rounded-2xl" />)}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="glass card-glow rounded-2xl p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/15 ring-1 ring-[#00e5ff]/30">
                <Instagram className="h-[18px] w-[18px] text-[#00e5ff]" />
              </span>
              <h2 className="font-semibold text-white">Instagram Connection</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Status">
                <StatusBadge label={data?.instagram.connected ? "connected" : "disconnected"} tone={data?.instagram.connected ? "success" : "danger"} />
              </Row>
              <Row label="Account">
                <span className="text-white/80">{data?.instagram.username ? `@${data.instagram.username}` : "—"}</span>
              </Row>
              <Row label="Type">
                <span className="text-white/80">{data?.instagram.accountType ?? "—"}</span>
              </Row>
              {!data?.instagram.connected && data?.instagram.reason && (
                <div className="mt-1 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200">
                  <p className="font-medium">{DISCONNECT_REASONS[data.instagram.reason]?.title ?? `Check failed (${data.instagram.reason})`}</p>
                  {DISCONNECT_REASONS[data.instagram.reason]?.fix && <p className="mt-1 text-rose-200/80">{DISCONNECT_REASONS[data.instagram.reason].fix}</p>}
                  {data.instagram.metaErrorCode !== null && data.instagram.metaErrorCode !== undefined && <p className="mt-1 text-rose-200/60">Meta error code: {data.instagram.metaErrorCode}</p>}
                </div>
              )}
              <Row label="Token expires">
                <span className={TONE_TEXT[describeToken(data?.token).tone]} title={describeToken(data?.token).detail}>
                  {describeToken(data?.token).text}
                </span>
              </Row>
              {describeToken(data?.token).detail && describeToken(data?.token).tone !== "ok" && (
                <p className={`text-[11px] ${TONE_TEXT[describeToken(data?.token).tone]}`}>{describeToken(data?.token).detail}</p>
              )}
            </div>
            <button onClick={refreshConnection} disabled={healthBusy} className="btn-ghost-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${healthBusy ? "animate-spin" : ""}`} /> Re-check connection</button>
          </div>

          <div className="glass card-glow rounded-2xl p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/15 ring-1 ring-[#7c3aed]/30">
                <Webhook className="h-[18px] w-[18px] text-[#7c3aed]" />
              </span>
              <h2 className="font-semibold text-white">Webhook Status</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Subscribed">
                <StatusBadge label={data?.webhook.subscribed ? "active" : "inactive"} tone={data?.webhook.subscribed ? "success" : "danger"} />
              </Row>
              <Row label="Last event">
                <span className="text-white/80">
                  {data?.webhook.lastEventAt ? new Date(data.webhook.lastEventAt).toLocaleTimeString() : "—"}
                </span>
              </Row>
              <Row label="Endpoint">
                <span className="truncate text-xs text-white/60">{data?.webhook.url ?? "—"}</span>
              </Row>
            </div>
            <button onClick={() => onNavigate?.("logs")} className="btn-ghost-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm"><ScrollText className="h-3.5 w-3.5" /> View webhook logs</button>
          </div>

          <div className="glass card-glow rounded-2xl p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Activity className="h-[18px] w-[18px] text-emerald-300" />
              </span>
              <h2 className="font-semibold text-white">API Status</h2>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="Health">
                <span className="flex items-center gap-1.5">
                  {data?.api.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-rose-400" />}
                  <span className="text-white/80">{data?.api.ok ? "Operational" : "Degraded"}</span>
                </span>
              </Row>
              <Row label="Latency">
                <span className="text-white/80">{data?.api.latencyMs ? `${data.api.latencyMs}ms` : "—"}</span>
              </Row>
              <Row label="Last checked">
                <span className="text-white/80">
                  {data?.api.lastCheckedAt ? new Date(data.api.lastCheckedAt).toLocaleTimeString() : "—"}
                </span>
              </Row>
            </div>
            <button onClick={runHealthCheck} disabled={healthBusy} className="btn-ghost-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${healthBusy ? "animate-spin" : ""}`} /> Run health check
            </button>
          </div>
        </div>
      )}

      {(data?.token?.valid === false || (data?.token?.expiresAt && data.token.expiresAt - Date.now() < 7 * DAY_MS)) && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-medium">{data?.token?.valid === false ? "The Meta access token is not valid." : "The Meta access token expires soon."}</span>{" "}
            Generate a new token, update <code className="rounded bg-black/30 px-1">META_ACCESS_TOKEN</code> on the backend and redeploy. Until then replies and DMs can fail.
          </p>
        </div>
      )}

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-400/25">
            <BellRing className="h-[18px] w-[18px] text-amber-300" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Alerts, tracking and safety</h2>
            <p className="text-xs text-white/40">Get a message when something breaks, so an outage never goes unnoticed.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40"><BellRing className="h-3.5 w-3.5" /> Alert channels</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(data?.alerts?.channels ?? []).length > 0 ? (
                data!.alerts!.channels.map((c) => (
                  <span key={c} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs capitalize text-emerald-300 ring-1 ring-emerald-500/25">{c}</span>
                ))
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-amber-500/25">Not configured</span>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
              Scheduled checks: {data?.alerts?.cronConfigured ? <span className="text-emerald-300">enabled</span> : <span className="text-amber-300">off (set CRON_SECRET)</span>}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40"><MousePointerClick className="h-3.5 w-3.5" /> Link click tracking</p>
            <p className={`mt-2 text-sm ${data?.tracking?.enabled ? "text-emerald-300" : "text-white/60"}`}>{data?.tracking?.enabled ? "On" : "Off"}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              {data?.tracking?.enabled ? "DM buttons count clicks, shown in Analytics." : "Set TRACKING_BASE_URL (this backend's public URL) to count clicks from DM buttons."}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40"><Gauge className="h-3.5 w-3.5" /> Safety limits</p>
            <p className="mt-2 text-sm text-white/80">
              {data?.safety ? `${data.safety.maxCommentsPerHour || "No limit"} replies and ${data.safety.maxDmsPerHour || "no limit"} DMs per hour` : "—"}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              {data?.safety ? (data.safety.delayMaxMs > 0 ? `Random ${(data.safety.delayMinMs / 1000).toFixed(1)}-${(data.safety.delayMaxMs / 1000).toFixed(1)}s pause between a reply and its DM.` : "No pause between reply and DM.") : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button onClick={() => runAlert("test")} disabled={alertBusy !== null} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            {alertBusy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Send test alert
          </button>
          <button onClick={() => runAlert("summary")} disabled={alertBusy !== null} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            {alertBusy === "summary" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send today&apos;s summary
          </button>
        </div>

        {(data?.alerts?.channels ?? []).length === 0 && !isLoading && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-white/55">
            <p className="font-medium text-white/75">How to turn alerts on (backend environment variables)</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li><span className="text-white/75">Telegram:</span> create a bot with @BotFather, then set <code className="rounded bg-black/30 px-1">TELEGRAM_BOT_TOKEN</code> and <code className="rounded bg-black/30 px-1">TELEGRAM_CHAT_ID</code>.</li>
              <li><span className="text-white/75">Email (Resend):</span> set <code className="rounded bg-black/30 px-1">RESEND_API_KEY</code> and <code className="rounded bg-black/30 px-1">ALERT_EMAIL_TO</code>.</li>
              <li><span className="text-white/75">Slack / Discord:</span> set <code className="rounded bg-black/30 px-1">ALERT_WEBHOOK_URL</code> to an https webhook.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/15 ring-1 ring-[#7c3aed]/30">
            <KeyRound className="h-[18px] w-[18px] text-[#7c3aed]" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Configuration checklist</h2>
            <p className="text-xs text-white/40">Credentials stay server-side. This panel only reports whether each one is configured.</p>
          </div>
        </div>

        <ul className="mt-5 grid gap-2 md:grid-cols-2">
          {[
            { label: "Firebase Admin", ok: data?.system?.firebaseConfigured, help: "Needed to read and write rules, mappings and logs." },
            { label: "Meta access token", ok: data?.system?.metaConfigured, help: "Needed to reply to comments and send DMs." },
            { label: "Webhook verify token", ok: data?.system?.webhookConfigured, help: "Needed for Instagram to deliver comment events." },
            { label: "Instagram account reachable", ok: data?.instagram.connected, help: "Backend can read your Instagram account from Meta." },
          ].map((item) => (
            <li key={item.label} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/5">
              {isLoading ? (
                <div className="shimmer-loading h-5 w-5 rounded-full" />
              ) : item.ok ? (
                <CheckCircle2 className="hd-pop mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div>
                <p className="text-sm text-white">{item.label}</p>
                <p className="text-xs text-white/40">{item.help}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
          <div>
            <p className="text-xs text-white/50">Delivery mode</p>
            <div className="mt-1.5">
              {isLoading ? (
                <div className="shimmer-loading h-5 w-24 rounded-full" />
              ) : (
                <StatusBadge label={data?.system?.dryRun ? "dry-run" : "live"} tone={data?.system?.dryRun ? "warning" : "success"} />
              )}
            </div>
          </div>
          <button onClick={refreshConnection} disabled={healthBusy} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${healthBusy ? "animate-spin" : ""}`} /> Re-check everything
          </button>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <ShieldCheck className="h-[18px] w-[18px] text-white/50" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Follow Verification</h2>
            <StatusBadge label="active" tone="success" />
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          Automatically verifies whether a user follows @hire_daily before unlocking the job application link.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/50">Status:</span>
            <span className="text-emerald-300">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50">Verification:</span>
            <span className="text-white/80">Meta User Profile API</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      {children}
    </div>
  );
}
