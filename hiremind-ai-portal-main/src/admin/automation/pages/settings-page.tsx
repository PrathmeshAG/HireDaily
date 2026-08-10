import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Instagram, Webhook, Activity, ShieldCheck, CheckCircle2, XCircle, KeyRound, Eye, EyeOff, RefreshCw, ScrollText,
} from "lucide-react";
import { checkBackendHealth, getSettings } from "../services/automation-service";
import { StatusBadge } from "../components/status-badge";

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
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Settings</h1>
      <p className="mt-1 text-sm text-white/50">Connection and system health for the automation module.</p>

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
            <h2 className="font-semibold text-white">API Credentials</h2>
            <p className="text-xs text-white/40">Credentials stay server-side. This panel only reports safe configuration status.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <CredentialField label="Meta App ID" placeholder="e.g. 1234567890123456" />
          <CredentialField label="Instagram Business ID" placeholder="e.g. 17841400000000000" />
          <CredentialField label="Facebook Page ID" placeholder="e.g. 102938475610283" />
          <CredentialField label="Webhook Verify Token" placeholder="e.g. hiredaily_verify_token" secret />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
          <div>
            <p className="text-xs text-white/50">Access Token Status</p>
            <div className="mt-1.5">
              {isLoading ? (
                <div className="shimmer-loading h-5 w-24 rounded-full" />
              ) : (
                <StatusBadge
                  label={tokenStatus(data?.instagram.tokenExpiresAt ?? null)}
                  tone={tokenStatusTone(data?.instagram.tokenExpiresAt ?? null)}
                />
              )}
            </div>
          </div>
          <button
            onClick={refreshConnection}
            className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reconnect
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
            <StatusBadge label="planned" tone="neutral" />
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          Automatically checking whether a commenter follows the account is planned for a future phase —
          it needs additional Meta permissions beyond what standard comment/DM automation requires.
          This card is a placeholder so the settings layout won't need to change when it ships.
        </p>
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

function CredentialField({
  label,
  placeholder,
  secret,
}: {
  label: string;
  placeholder: string;
  secret?: boolean;
}) {
  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(!secret);

  return (
    <div>
      <label className="mb-1.5 block text-xs text-white/50">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          type={secret && !reveal ? "password" : "text"}
          className="w-full rounded-xl bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/30 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            aria-label={reveal ? "Hide" : "Reveal"}
          >
            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function tokenStatus(expiresAt: number | null): string {
  if (!expiresAt) return "Not configured";
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  if (daysLeft <= 0) return "Expired";
  if (daysLeft <= 7) return "Expiring soon";
  return "Valid";
}

function tokenStatusTone(expiresAt: number | null): "success" | "warning" | "danger" | "neutral" {
  if (!expiresAt) return "neutral";
  const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
  if (daysLeft <= 0) return "danger";
  if (daysLeft <= 7) return "warning";
  return "success";
}
