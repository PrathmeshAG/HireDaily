import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Loader2, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { getRetryableFailures, retryFailed } from "../services/automation-service";
import type { RetryItem, RetryOutcome } from "../types";

function ago(ts: number): string {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function friendlyError(error: string | null): string {
  if (!error) return "Unknown error";
  if (/access token|session has expired|_401|meta_http_401/i.test(error)) return "Access token expired";
  if (error === "hourly_cap_reached") return "Hourly safety limit reached";
  if (/outside of allowed window|allowed window/i.test(error)) return "Too old for Meta to accept";
  return error.length > 70 ? `${error.slice(0, 70)}…` : error;
}

const RANGES = [
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

/**
 * Lists comments whose public reply and/or DM failed (for example while the
 * Meta token had expired) and resends them with one click.
 */
export function RetryPanel() {
  const qc = useQueryClient();
  const [hours, setHours] = useState(72);
  const [selected, setSelected] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [outcome, setOutcome] = useState<{ results: RetryOutcome[]; remaining: number } | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["automation", "retryable", hours],
    queryFn: () => getRetryableFailures(hours),
    refetchInterval: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (ids?: string[]) => retryFailed(ids, hours),
    onSuccess: async (res) => {
      setOutcome({ results: res.results, remaining: res.remaining });
      setSelected([]);
      const ok = res.results.filter((r) => (r.comment === null || r.comment === "success") && (r.dm === null || r.dm === "success") && !r.error).length;
      if (ok === res.attempted) toast.success(`Retried ${res.attempted} comment${res.attempted === 1 ? "" : "s"}`);
      else toast.warning(`${ok} of ${res.attempted} succeeded. See details below.`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["automation", "retryable"] }),
        qc.invalidateQueries({ queryKey: ["automation", "logs"] }),
        qc.invalidateQueries({ queryKey: ["automation", "health-report"] }),
        qc.invalidateQueries({ queryKey: ["automation", "analytics"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list: RetryItem[] = items ?? [];
  const shown = showAll ? list : list.slice(0, 6);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const tokenIssue = list.some((i) => /access token|session has expired|_401|meta_http_401/i.test(i.lastError ?? ""));

  if (isLoading) return <div className="glass shimmer-loading mt-6 h-20 rounded-2xl" />;

  return (
    <section className="glass mt-6 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${list.length > 0 ? "bg-amber-500/10 ring-amber-400/25" : "bg-emerald-500/10 ring-emerald-400/25"}`}>
            {list.length > 0 ? <RotateCcw className="h-[18px] w-[18px] text-amber-300" /> : <CheckCircle2 className="h-[18px] w-[18px] text-emerald-300" />}
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {list.length > 0 ? `${list.length} comment${list.length === 1 ? "" : "s"} can be retried` : "No failed comments to retry"}
            </h2>
            <p className="text-xs text-white/45">
              {list.length > 0
                ? "A public reply or DM did not go through. Retry sends them again with your current rules and templates."
                : `Nothing failed in the last ${RANGES.find((r) => r.hours === hours)?.label ?? `${hours} hours`}.`}
            </p>
          </div>
        </div>
        <div className="flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10" role="group" aria-label="Look back">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => { setHours(r.hours); setSelected([]); setOutcome(null); }}
              aria-pressed={hours === r.hours}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${hours === r.hours ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {list.length > 0 && (
        <div className="border-t border-white/5 px-5 py-4">
          {tokenIssue && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Some failures were caused by an expired access token. Make sure the Meta token is replaced (Settings shows its status) before retrying, or they will fail again.</span>
            </div>
          )}

          <ul className="space-y-1.5">
            {shown.map((item) => (
              <li key={item.commentId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.commentId)}
                    onChange={() => toggle(item.commentId)}
                    className="h-4 w-4 accent-[#00e5ff]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">
                      @{item.username ?? "unknown"}
                      {item.keyword && <span className="ml-2 text-xs text-white/40">&ldquo;{item.keyword}&rdquo;</span>}
                    </p>
                    <p className="truncate text-xs text-rose-300/80">{friendlyError(item.lastError)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.parts.map((p) => (
                      <span key={p} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60 ring-1 ring-white/10">{p === "comment" ? "reply" : "DM"}</span>
                    ))}
                    <span className="ml-1 text-[11px] text-white/35">{ago(item.lastFailedAt)}</span>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          {list.length > 6 && (
            <button onClick={() => setShowAll((v) => !v)} className="mt-2 flex items-center gap-1 text-xs text-white/50 hover:text-[#00e5ff]">
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
              {showAll ? "Show fewer" : `Show all ${list.length}`}
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => mutation.mutate(undefined)}
              disabled={mutation.isPending}
              className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Retry {Math.min(list.length, 15)} {list.length > 15 ? "(first batch)" : "all"}
            </button>
            <button
              onClick={() => mutation.mutate(selected)}
              disabled={mutation.isPending || selected.length === 0}
              className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Retry selected ({selected.length})
            </button>
            <p className="text-[11px] text-white/35">Up to 15 per click. Meta only accepts a reply for about 7 days after the comment.</p>
          </div>
        </div>
      )}

      {outcome && (
        <div className="border-t border-white/5 px-5 py-4 text-xs">
          <p className="font-medium text-white/80">Last retry</p>
          <ul className="mt-2 space-y-1">
            {outcome.results.map((r) => {
              const bad = !!r.error || r.comment === "failed" || r.dm === "failed";
              return (
                <li key={r.commentId} className={`flex flex-wrap items-center gap-2 ${bad ? "text-rose-300" : "text-emerald-300"}`}>
                  {bad ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span className="font-mono text-[11px] text-white/50">{r.commentId.slice(-8)}</span>
                  {r.comment && <span>reply: {r.comment}</span>}
                  {r.dm && <span>DM: {r.dm}</span>}
                  {r.error && <span className="text-white/45">({friendlyError(r.error)})</span>}
                </li>
              );
            })}
          </ul>
          {outcome.remaining > 0 && <p className="mt-2 text-white/45">{outcome.remaining} more can be retried. Click Retry again.</p>}
        </div>
      )}
    </section>
  );
}
