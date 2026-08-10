import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { getAnalytics } from "../services/automation-service";

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#fff",
};

export function AnalyticsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["automation", "analytics"],
    queryFn: getAnalytics,
    staleTime: 15_000,
  });

  const dailyData = (data?.daily ?? []).map((d) => ({
    date: d.date.slice(5),
    Received: d.commentsReceived,
    Matched: d.triggers,
    DMs: d.dmsSent,
  }));

  const totals = (data?.daily ?? []).reduce(
    (acc, d) => ({
      received: acc.received + d.commentsReceived,
      matched: acc.matched + d.triggers,
      dms: acc.dms + d.dmsSent,
      errors: acc.errors + d.commentsFailed + d.dmsFailed + d.automationErrors,
    }),
    { received: 0, matched: 0, dms: 0, errors: 0 },
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Analytics</h1>
      <p className="mt-1 text-sm text-white/50">Last 14 days of real automation activity, including dry-run triggers.</p>

      {isError && (
        <div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Analytics could not be loaded. Check the backend connection and refresh this page.
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Comments received" value={totals.received} />
        <MetricCard label="Rule matches" value={totals.matched} />
        <MetricCard label="DMs sent" value={totals.dms} />
        <MetricCard label="Errors" value={totals.errors} />
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Daily Activity</h2>
        <div className="mt-4 h-64">
          {isLoading ? (
            <div className="shimmer-loading h-full rounded-xl" />
          ) : dailyData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="matchedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="Received" stroke="#00e5ff" fill="url(#receivedGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Matched" stroke="#7c3aed" fill="url(#matchedGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
          <span>Comments received</span>
          <span>Rule matches</span>
          <span>DMs are included in the KPI above</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top Keywords</h2>
          <div className="mt-4 h-56">
            {isLoading ? (
              <div className="shimmer-loading h-full rounded-xl" />
            ) : (data?.topKeywords ?? []).length === 0 ? (
              <EmptyChart label="No matched keywords yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topKeywords ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="keyword" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="count" fill="#00e5ff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top Posts</h2>
              <p className="mt-1 text-[11px] text-white/30">Mapped posts with the most rule matches</p>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 ring-1 ring-white/10">
              Top 6
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="shimmer-loading h-14 rounded-xl" />
              ))
            ) : (data?.topPosts ?? []).length === 0 ? (
              <EmptyChart label="No mapped post matches yet" />
            ) : (
              (data?.topPosts ?? []).map((p, index) => {
                const max = data?.topPosts[0]?.triggers || 1;
                return (
                  <div
                    key={p.mediaId ?? `${p.postLabel}-${index}`}
                    className="group rounded-xl border border-white/5 bg-white/[0.025] px-3.5 py-3 transition hover:border-[#00e5ff]/20 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/15 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-medium text-white/80" title={p.postLabel}>
                            {p.postLabel}
                          </span>
                          <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60">
                            {p.triggers} {p.triggers === 1 ? "match" : "matches"}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] transition-all"
                            style={{ width: `${Math.max(8, (p.triggers / max) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {p.postUrl && (
                        <a
                          href={p.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-[#00e5ff]"
                          aria-label={`Open ${p.postLabel} on Instagram`}
                          title="Open Instagram post"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyChart({ label = "No activity yet" }: { label?: string }) {
  return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/35">{label}</div>;
}
