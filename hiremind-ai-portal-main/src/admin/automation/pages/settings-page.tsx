import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Instagram, Webhook, Activity, ShieldCheck, CheckCircle2, XCircle, KeyRound, RefreshCw, ScrollText, FlaskConical,
} from "lucide-react";
import { checkBackendHealth, getSettings } from "../services/automation-service";
import { StatusBadge } from "../components/status-badge";
import { PageHeader } from "../components/page-header";
import { SettingsArt } from "../components/illustrations";

export function SettingsPage({ onNavigate }: { onNavigate?: (page: "logs") => void }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["automation", "settings"], queryFn: getSettings, staleTime: 15_000 });
  const [healthBusy, setHealthBusy] = useState(false);

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
              <Row label="Token expires">
                <span className="text-white/80">
                  {data?.instagram.tokenExpiresAt ? new Date(data.instagram.tokenExpiresAt).toLocaleDateString() : "—"}
                </span>
              </Row>
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
