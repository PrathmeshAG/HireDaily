import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { Download, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw } from "lucide-react";
import { getAnalytics } from "../services/automation-service";
import type { DailyAnalytics } from "../types";
import { PageHeader } from "../components/page-header";
import { AnimatedNumber } from "../components/animated-number";
import { AnalyticsArt, EmptyArt } from "../components/illustrations";

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#fff",
};

type Range = 7 | 14;
type SeriesKey = "Received" | "Matched" | "Replies" | "DMs";

const SERIES: { key: SeriesKey; color: string; grad: string }[] = [
  { key: "Received", color: "#00e5ff", grad: "gRecv" },
  { key: "Matched", color: "#7c3aed", grad: "gMatch" },
  { key: "Replies", color: "#f59e0b", grad: "gReply" },
  { key: "DMs", color: "#34d399", grad: "gDm" },
];

interface Totals {
  received: number;
  matched: number;
  replies: number;
  dms: number;
  failedReplies: number;
  failedDms: number;
  errors: number;
  verified: number;
  notVerified: number;
  unsupported: number;
}

function sum(days: DailyAnalytics[]): Totals {
  return days.reduce<Totals>(
    (a, d) => ({
      received: a.received + d.commentsReceived,
      matched: a.matched + d.triggers,
      replies: a.replies + d.repliesSent,
      dms: a.dms + d.dmsSent,
      failedReplies: a.failedReplies + d.commentsFailed,
      failedDms: a.failedDms + d.dmsFailed,
      errors: a.errors + d.commentsFailed + d.dmsFailed + d.automationErrors,
      verified: a.verified + (d.followVerified ?? 0),
      notVerified: a.notVerified + (d.followNotVerified ?? 0),
      unsupported: a.unsupported + (d.followUnsupported ?? 0),
    }),
    { received: 0, matched: 0, replies: 0, dms: 0, failedReplies: 0, failedDms: 0, errors: 0, verified: 0, notVerified: 0, unsupported: 0 },
  );
}

const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Percent change vs the previous period; null when there is nothing to compare. */
function delta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function AnalyticsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["automation", "analytics"],
    queryFn: getAnalytics,
    staleTime: 15_000,
  });
  const [range, setRange] = useState<Range>(14);
  const [hidden, setHidden] = useState<SeriesKey[]>([]);

  const all = data?.daily ?? [];
  const days = useMemo(() => all.slice(-range), [all, range]);
  // A previous period only exists for the 7-day view (we have 14 days of data).
  const previousDays = useMemo(() => (range === 7 ? all.slice(-14, -7) : []), [all, range]);

  const t = useMemo(() => sum(days), [days]);
  const prev = useMemo(() => sum(previousDays), [previousDays]);
  const hasPrev = previousDays.length > 0;

  const chartData = days.map((d) => ({
    date: d.date.slice(5),
    Received: d.commentsReceived,
    Matched: d.triggers,
    Replies: d.repliesSent,
    DMs: d.dmsSent,
  }));
  const followData = days.map((d) => ({
    date: d.date.slice(5),
    Verified: d.followVerified ?? 0,
    "Not following": d.followNotVerified ?? 0,
    Unsupported: d.followUnsupported ?? 0,
  }));

  const matchRate = pct(t.matched, t.received);
  const replyRate = pct(t.replies, t.replies + t.failedReplies);
  const dmRate = pct(t.dms, t.dms + t.failedDms);
  const followTotal = t.verified + t.notVerified;
  const followRate = pct(t.verified, followTotal);

  const busiest = days.reduce<DailyAnalytics | null>((b, d) => (!b || d.commentsReceived > b.commentsReceived ? d : b), null);
  const activeDays = days.filter((d) => d.commentsReceived > 0).length;
  const avgPerDay = days.length ? Math.round((t.received / days.length) * 10) / 10 : 0;

  const insights = useMemo(() => {
    const out: string[] = [];
    if (t.received === 0) return ["No comments yet in this period. Post a mapped job and ask people to comment the keyword."];
    if (busiest && busiest.commentsReceived > 0) out.push(`Busiest day was ${busiest.date} with ${busiest.commentsReceived} comments.`);
    if (matchRate !== null && matchRate < 50) out.push(`Only ${matchRate}% of comments matched a rule. Add more keyword variations to your rules.`);
    if (matchRate !== null && matchRate >= 80) out.push(`${matchRate}% of comments matched a rule, so your keywords are working well.`);
    if (dmRate !== null && dmRate < 90) out.push(`DM delivery is at ${dmRate}%. Check the Logs page for the failure reasons.`);
    if (followRate !== null && followRate < 50 && followTotal >= 5) out.push(`Only ${followRate}% of people were already following, so the follow gate is helping you grow.`);
    if (t.errors === 0) out.push("No errors in this period. Everything ran clean. ✅");
    if (hasPrev) {
      const d = delta(t.received, prev.received);
      if (d !== null && Math.abs(d) >= 10) out.push(`Comments are ${d > 0 ? "up" : "down"} ${Math.abs(d)}% compared to the previous 7 days.`);
    }
    return out.slice(0, 5);
  }, [t, busiest, matchRate, dmRate, followRate, followTotal, hasPrev, prev.received]);

  const funnel = [
    { label: "Comments received", value: t.received, color: "from-[#00e5ff] to-[#22d3ee]" },
    { label: "Matched a rule", value: t.matched, color: "from-[#22d3ee] to-[#7c3aed]" },
    { label: "Public replies sent", value: t.replies, color: "from-[#7c3aed] to-[#a78bfa]" },
    { label: "DMs sent", value: t.dms, color: "from-[#34d399] to-[#22d3ee]" },
    { label: "Follow verified", value: t.verified, color: "from-[#f59e0b] to-[#34d399]" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const keywords = data?.topKeywords ?? [];
  const keywordTotal = keywords.reduce((a, k) => a + k.count, 0);

  const exportCsv = () => {
    const header = ["date", "comments_received", "rule_matches", "replies_sent", "dms_sent", "reply_failures", "dm_failures", "errors", "follow_verified", "follow_not_following", "follow_unsupported"];
    const rows = days.map((d) => [d.date, d.commentsReceived, d.triggers, d.repliesSent, d.dmsSent, d.commentsFailed, d.dmsFailed, d.automationErrors, d.followVerified ?? 0, d.followNotVerified ?? 0, d.followUnsupported ?? 0]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `hiredaily-analytics-${range}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSeries = (k: SeriesKey) =>
    setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="How your Instagram automation is performing: reach, delivery, follow gate and what people comment."
        art={<AnalyticsArt />}
        actions={
          <>
            <div className="flex rounded-xl bg-white/5 p-1 ring-1 ring-white/10" role="group" aria-label="Date range">
              {([7, 14] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={`rounded-lg px-3.5 py-1.5 text-xs transition ${range === r ? "bg-gradient-to-r from-[#00e5ff]/25 to-[#7c3aed]/25 text-white ring-1 ring-[#00e5ff]/30" : "text-white/55 hover:text-white"}`}
                >
                  Last {r} days
                </button>
              ))}
            </div>
            <button onClick={() => refetch()} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={exportCsv} disabled={days.length === 0} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </>
        }
      />

      {isError && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Analytics could not be loaded. Check the backend connection and refresh this page.
        </div>
      )}

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => <div key={i} className="glass shimmer-loading h-28 rounded-2xl" />)
        ) : (
          <>
            <Kpi label="Comments received" value={t.received} dot="#00e5ff" change={hasPrev ? delta(t.received, prev.received) : null} hint={`${avgPerDay}/day avg · ${activeDays} active day${activeDays === 1 ? "" : "s"}`} />
            <Kpi label="Rule matches" value={t.matched} dot="#7c3aed" change={hasPrev ? delta(t.matched, prev.matched) : null} hint={matchRate !== null ? `${matchRate}% of comments` : undefined} />
            <Kpi label="Public replies sent" value={t.replies} dot="#f59e0b" change={hasPrev ? delta(t.replies, prev.replies) : null} hint={replyRate !== null ? `${replyRate}% delivered` : undefined} />
            <Kpi label="DMs sent" value={t.dms} dot="#34d399" change={hasPrev ? delta(t.dms, prev.dms) : null} hint={dmRate !== null ? `${dmRate}% delivered` : undefined} />
            <Kpi label="Follow verified" value={t.verified} dot="#22d3ee" change={hasPrev ? delta(t.verified, prev.verified) : null} hint={followRate !== null ? `${followRate}% already followed` : undefined} />
            <Kpi label="Errors" value={t.errors} dot="#fb7185" bad={t.errors > 0} change={hasPrev ? delta(t.errors, prev.errors) : null} invert hint={data?.users !== undefined ? `${data.users.toLocaleString()} unique users overall` : undefined} />
          </>
        )}
      </div>

      {/* Activity chart */}
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Daily activity</h2>
          <div className="flex flex-wrap gap-1.5">
            {SERIES.map((s) => {
              const off = hidden.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  aria-pressed={!off}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ring-1 transition ${off ? "text-white/30 ring-white/5" : "text-white/80 ring-white/15 hover:bg-white/5"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: off ? "#475569" : s.color }} />
                  {s.key}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 h-72">
          {isLoading ? (
            <div className="shimmer-loading h-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.grad} id={s.grad} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                {SERIES.filter((s) => !hidden.includes(s.key)).map((s) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={`url(#${s.grad})`} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Funnel + health */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Conversion funnel</h2>
          <p className="mt-1 text-[11px] text-white/35">From the first comment to a verified follower.</p>
          <div className="mt-5 space-y-4">
            {funnel.map((f, i) => {
              const ofComments = pct(f.value, t.received);
              return (
                <div key={f.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-white/75">{f.label}</span>
                    <span className="text-white/50">
                      <span className="font-semibold text-white">{f.value.toLocaleString()}</span>
                      {i > 0 && ofComments !== null && <span className="ml-2">{ofComments}% of comments</span>}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`hd-bar-grow h-full rounded-full bg-gradient-to-r ${f.color}`}
                      style={{ width: `${f.value === 0 ? 0 : Math.max(3, (f.value / funnelMax) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Delivery health</h2>
          <div className="mt-5 space-y-5">
            <Health label="Public reply success" value={replyRate} />
            <Health label="DM success" value={dmRate} />
            <Health label="Rule match rate" value={matchRate} neutral />
            <Health label="Already following" value={followRate} neutral />
          </div>
        </section>
      </div>

      {/* Insights */}
      <section className="glass rounded-2xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
          <Lightbulb className="h-4 w-4 text-amber-300" /> Insights
        </h2>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {insights.map((text) => (
            <li key={text} className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/75 ring-1 ring-white/5">{text}</li>
          ))}
        </ul>
      </section>

      {/* Follow gate */}
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Follow gate by day</h2>
          <span className="text-[11px] text-white/40">
            {followTotal > 0 ? `${t.verified} of ${followTotal} checked users already followed` : "No follow checks yet"}
          </span>
        </div>
        <div className="mt-4 h-56">
          {isLoading ? (
            <div className="shimmer-loading h-full rounded-xl" />
          ) : t.verified + t.notVerified + t.unsupported === 0 ? (
            <EmptyChart label="No follow checks in this period" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={followData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="Verified" stackId="f" fill="#34d399" />
                <Bar dataKey="Not following" stackId="f" fill="#f59e0b" />
                <Bar dataKey="Unsupported" stackId="f" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
          <Legend color="#34d399" label="Verified follower" />
          <Legend color="#f59e0b" label="Not following" />
          <Legend color="#64748b" label="Could not verify" />
        </div>
      </section>

      {/* Keywords + posts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top keywords</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer-loading h-9 rounded-xl" />)
            ) : keywords.length === 0 ? (
              <div className="h-40"><EmptyChart label="No matched keywords yet" /></div>
            ) : (
              keywords.map((k, i) => {
                const share = pct(k.count, keywordTotal) ?? 0;
                return (
                  <div key={k.keyword}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-white/80">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] text-white/50">{i + 1}</span>
                        {k.keyword}
                      </span>
                      <span className="text-white/50"><span className="font-semibold text-white">{k.count}</span> · {share}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="hd-bar-grow h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ width: `${Math.max(4, share)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top posts</h2>
              <p className="mt-1 text-[11px] text-white/30">Mapped posts with the most rule matches</p>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 ring-1 ring-white/10">Top 6</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer-loading h-14 rounded-xl" />)
            ) : (data?.topPosts ?? []).length === 0 ? (
              <div className="h-40"><EmptyChart label="No mapped post matches yet" /></div>
            ) : (
              (data?.topPosts ?? []).map((p, index) => {
                const max = data?.topPosts[0]?.triggers || 1;
                return (
                  <div key={p.mediaId ?? `${p.postLabel}-${index}`} className="group rounded-xl border border-white/5 bg-white/[0.025] px-3.5 py-3 transition hover:border-[#00e5ff]/20 hover:bg-white/[0.04]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/15 text-[11px] font-semibold text-white/70 ring-1 ring-white/10">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-xs font-medium text-white/80" title={p.postLabel}>{p.postLabel}</span>
                          <span className="shrink-0 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/60">{p.triggers} {p.triggers === 1 ? "match" : "matches"}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="hd-bar-grow h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ width: `${Math.max(8, (p.triggers / max) * 100)}%` }} />
                        </div>
                      </div>
                      {p.postUrl && (
                        <a href={p.postUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-[#00e5ff]" aria-label={`Open ${p.postLabel} on Instagram`} title="Open Instagram post">↗</a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Daily breakdown */}
      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Daily breakdown</h2>
          <span className="text-[11px] text-white/35">Newest first</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-white/5 text-left text-[11px] uppercase tracking-wider text-white/40">
                {["Date", "Comments", "Matches", "Replies", "DMs", "Followed", "Not following", "Errors"].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 font-medium ${i > 0 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...days].reverse().map((d) => {
                const errs = d.commentsFailed + d.dmsFailed + d.automationErrors;
                return (
                  <tr key={d.date} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 text-white/80">{d.date}</td>
                    <Num v={d.commentsReceived} />
                    <Num v={d.triggers} />
                    <Num v={d.repliesSent} />
                    <Num v={d.dmsSent} />
                    <Num v={d.followVerified ?? 0} />
                    <Num v={d.followNotVerified ?? 0} />
                    <td className={`px-4 py-2.5 text-right ${errs > 0 ? "font-semibold text-rose-300" : "text-white/35"}`}>{errs}</td>
                  </tr>
                );
              })}
              {days.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-white/40">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Num({ v }: { v: number }) {
  return <td className={`px-4 py-2.5 text-right ${v > 0 ? "text-white/85" : "text-white/30"}`}>{v}</td>;
}

function Kpi({
  label, value, dot, change, hint, bad, invert,
}: {
  label: string;
  value: number;
  dot: string;
  /** % change vs previous period. */
  change?: number | null;
  hint?: string;
  bad?: boolean;
  /** For metrics where up is bad (errors). */
  invert?: boolean;
}) {
  let badge: ReactNode = null;
  if (change !== null && change !== undefined) {
    const up = change > 0;
    const flat = change === 0;
    const good = flat ? true : invert ? !up : up;
    const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
    badge = (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${flat ? "bg-white/5 text-white/50" : good ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`} title="Compared with the previous 7 days">
        <Icon className="h-3 w-3" /> {up ? "+" : ""}{change}%
      </span>
    );
  }
  return (
    <div className="glass card-glow rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
          <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
          {label}
        </p>
        {badge}
      </div>
      <p className={`mt-2 text-3xl font-semibold ${bad ? "text-rose-300" : "text-white"}`}>
        <AnimatedNumber value={value} />
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function Health({ label, value, neutral }: { label: string; value: number | null; neutral?: boolean }) {
  const color = value === null ? "bg-white/10" : neutral ? "bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" : value >= 95 ? "bg-emerald-400" : value >= 80 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="font-semibold text-white">{value === null ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`hd-bar-grow h-full rounded-full ${color}`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyChart({ label = "No activity yet" }: { label?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 text-sm text-white/40">
      <div className="w-24 opacity-80"><EmptyArt kind="chart" /></div>
      {label}
    </div>
  );
}
