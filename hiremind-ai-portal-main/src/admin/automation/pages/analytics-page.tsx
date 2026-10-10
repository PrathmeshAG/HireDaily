import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Download, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw, BookOpen, ChevronDown,
  CheckCircle2, AlertTriangle, Info as InfoIcon, XCircle, MousePointerClick,
} from "lucide-react";
import { getAnalytics, getClickStats } from "../services/automation-service";
import type { DailyAnalytics } from "../types";
import { PageHeader } from "../components/page-header";
import { AnimatedNumber } from "../components/animated-number";
import { InfoTip } from "../components/info-tip";
import { AnalyticsArt, EmptyArt } from "../components/illustrations";

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#fff",
};

type Range = 7 | 14;
type SeriesKey = "Received" | "Matched" | "Replies" | "DMs" | "Clicks";
type Tone = "good" | "warn" | "bad" | "info";
interface Insight { tone: Tone; title: string; text: string }

const SERIES: { key: SeriesKey; color: string; grad: string; meaning: string }[] = [
  { key: "Received", color: "#00e5ff", grad: "gRecv", meaning: "all comments on your mapped posts" },
  { key: "Matched", color: "#7c3aed", grad: "gMatch", meaning: "comments that matched a rule" },
  { key: "Replies", color: "#f59e0b", grad: "gReply", meaning: "public replies posted" },
  { key: "DMs", color: "#34d399", grad: "gDm", meaning: "DMs delivered with your links" },
  { key: "Clicks", color: "#38bdf8", grad: "gClick", meaning: "taps on the link buttons inside your DMs" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Totals {
  received: number;
  matched: number;
  replies: number;
  dms: number;
  failedReplies: number;
  failedDms: number;
  automationErrors: number;
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
      automationErrors: a.automationErrors + d.automationErrors,
      errors: a.errors + d.commentsFailed + d.dmsFailed + d.automationErrors,
      verified: a.verified + (d.followVerified ?? 0),
      notVerified: a.notVerified + (d.followNotVerified ?? 0),
      unsupported: a.unsupported + (d.followUnsupported ?? 0),
    }),
    { received: 0, matched: 0, replies: 0, dms: 0, failedReplies: 0, failedDms: 0, automationErrors: 0, errors: 0, verified: 0, notVerified: 0, unsupported: 0 },
  );
}

const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Percent change vs the previous period; null when there is nothing to compare. */
function delta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Comment received", meaning: "Any comment Instagram sends to your backend on a post that has a mapping, whether or not it matches a rule." },
  { term: "Rule match", meaning: "A comment that fits one of your active rules (keyword, or any comment). Only matches can trigger a reply or DM." },
  { term: "Public reply", meaning: "The short reply the bot posts under the comment. Rules set to DM only never post one." },
  { term: "DM sent", meaning: "The private message with your job links. Rules set to comment only never send one." },
  { term: "Follow verified", meaning: "The person already followed your account when the follow gate checked, so they got the link right away." },
  { term: "Not following", meaning: "The person was asked to follow first. They receive the link after tapping the follow confirmation." },
  { term: "Match rate", meaning: "Rule matches divided by comments received. Low means your keywords miss how people actually comment." },
  { term: "Link click", meaning: "A tap on a job button inside a DM, counted by the click tracker (needs TRACKING_BASE_URL). Click rate = clicks divided by DMs sent." },
  { term: "Delivered %", meaning: "Sent divided by (sent + failed). Anything under 95% is worth a look in Logs." },
];

export function AnalyticsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["automation", "analytics"],
    queryFn: getAnalytics,
    staleTime: 15_000,
  });
  const { data: clickData } = useQuery({
    queryKey: ["automation", "clicks"],
    queryFn: () => getClickStats(14),
    staleTime: 30_000,
    retry: false,
  });
  const [range, setRange] = useState<Range>(14);
  const [hidden, setHidden] = useState<SeriesKey[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);

  const all = data?.daily ?? [];
  const days = useMemo(() => all.slice(-range), [all, range]);
  // A previous period only exists for the 7-day view (we have 14 days of data).
  const previousDays = useMemo(() => (range === 7 ? all.slice(-14, -7) : []), [all, range]);

  const t = useMemo(() => sum(days), [days]);
  const prev = useMemo(() => sum(previousDays), [previousDays]);
  const hasPrev = previousDays.length > 0;

  const clicksEnabled = clickData?.enabled === true;
  const clicksByDate = new Map((clickData?.daily ?? []).map((d) => [d.date, d.clicks]));
  const clicksTotal = days.reduce((a, d) => a + (clicksByDate.get(d.date) ?? 0), 0);
  const clickRate = pct(clicksTotal, days.reduce((a, d) => a + d.dmsSent, 0));
  const visibleSeries = SERIES.filter((x) => x.key !== "Clicks" || clicksEnabled);

  const chartData = days.map((d) => ({
    date: d.date.slice(5),
    Received: d.commentsReceived,
    Matched: d.triggers,
    Replies: d.repliesSent,
    DMs: d.dmsSent,
    Clicks: clicksByDate.get(d.date) ?? 0,
  }));
  const followData = days.map((d) => ({
    date: d.date.slice(5),
    Verified: d.followVerified ?? 0,
    "Not following": d.followNotVerified ?? 0,
    Unsupported: d.followUnsupported ?? 0,
  }));

  // Comments grouped by weekday across the selected range.
  const weekdayData = useMemo(() => {
    const totals = WEEKDAYS.map((name) => ({ name, comments: 0, dms: 0 }));
    for (const d of days) {
      const idx = new Date(`${d.date}T00:00:00`).getDay();
      if (Number.isNaN(idx)) continue;
      totals[idx].comments += d.commentsReceived;
      totals[idx].dms += d.dmsSent;
    }
    return totals;
  }, [days]);
  const bestWeekday = weekdayData.reduce((b, w) => (w.comments > b.comments ? w : b), weekdayData[0]);

  const matchRate = pct(t.matched, t.received);
  const replyRate = pct(t.replies, t.replies + t.failedReplies);
  const dmRate = pct(t.dms, t.dms + t.failedDms);
  const followTotal = t.verified + t.notVerified;
  const followRate = pct(t.verified, followTotal);

  const busiest = days.reduce<DailyAnalytics | null>((b, d) => (!b || d.commentsReceived > b.commentsReceived ? d : b), null);
  const activeDays = days.filter((d) => d.commentsReceived > 0).length;
  const avgPerDay = days.length ? Math.round((t.received / days.length) * 10) / 10 : 0;

  const keywords = data?.topKeywords ?? [];
  const keywordTotal = keywords.reduce((a, k) => a + k.count, 0);
  const topPosts = data?.topPosts ?? [];
  const topPostsTotal = topPosts.reduce((a, p) => a + p.triggers, 0);

  const insights = useMemo<Insight[]>(() => {
    if (t.received === 0) {
      return [{ tone: "info", title: "No comments in this period", text: "Post a mapped job and ask people to comment your keyword. Insights appear as soon as data arrives." }];
    }
    const out: Insight[] = [];

    out.push({
      tone: "info",
      title: "Average activity",
      text: `${avgPerDay} comments per day, active on ${activeDays} of ${days.length} days. At this pace expect about ${Math.round(avgPerDay * 7)} comments in a week.`,
    });
    if (busiest && busiest.commentsReceived > 0) {
      out.push({
        tone: "info",
        title: "Busiest day",
        text: `${busiest.date} brought ${busiest.commentsReceived} comments, ${pct(busiest.commentsReceived, t.received)}% of this period. Check which post you published around then and repeat the format.`,
      });
    }
    const quiet = days.length - activeDays;
    if (quiet >= 3) {
      out.push({ tone: "warn", title: "Quiet days", text: `${quiet} of ${days.length} days had no comments. Posting a mapped job on those days keeps the audience engaged.` });
    }
    if (bestWeekday && bestWeekday.comments > 0) {
      out.push({ tone: "info", title: "Strongest weekday", text: `${bestWeekday.name} gets the most comments (${bestWeekday.comments}). Schedule your best jobs for that day.` });
    }

    if (matchRate !== null) {
      if (matchRate >= 80) out.push({ tone: "good", title: "Keywords are working", text: `${matchRate}% of comments matched a rule. People are using the words you expect.` });
      else if (matchRate < 50) out.push({ tone: "warn", title: "Low match rate", text: `Only ${matchRate}% of comments matched a rule. Add spelling variations or enable "any comment" on popular posts.` });
      else out.push({ tone: "info", title: "Match rate", text: `${matchRate}% of comments matched a rule. Adding a few more keyword variations can push this higher.` });
    }
    if (t.received - t.matched > 0) {
      out.push({ tone: "info", title: "Unmatched comments", text: `${t.received - t.matched} comments matched no rule. They may be questions or new wording. Scan them in Instagram and add keywords where useful.` });
    }
    if (t.matched - t.dms > 0) {
      out.push({ tone: "info", title: "Matches without a DM", text: `${t.matched - t.dms} matched comments did not get a DM. That is normal for comment-only rules or people who have not confirmed the follow yet. If it is unexpected, check Logs for failures.` });
    }

    if (dmRate !== null) {
      if (dmRate >= 95) out.push({ tone: "good", title: "DM delivery is healthy", text: `${dmRate}% of DMs were delivered (${t.dms} sent, ${t.failedDms} failed).` });
      else out.push({ tone: dmRate < 80 ? "bad" : "warn", title: "DM delivery needs attention", text: `${dmRate}% delivered, ${t.failedDms} failed. Open Logs to see the reason. An expired access token is the most common cause.` });
    }
    if (replyRate !== null && replyRate < 95) {
      out.push({ tone: replyRate < 80 ? "bad" : "warn", title: "Public replies failing", text: `${replyRate}% of public replies were posted, ${t.failedReplies} failed. Check Logs for the Meta error.` });
    }

    if (followTotal > 0) {
      out.push({
        tone: "info",
        title: "Follow gate",
        text: `${t.verified} of ${followTotal} checked people already followed (${followRate}%). ${t.notVerified} were asked to follow before getting the link, which turns commenters into followers.`,
      });
    }

    if (t.errors === 0) {
      out.push({ tone: "good", title: "No errors", text: "Everything ran clean in this period. ✅" });
    } else {
      out.push({
        tone: "bad",
        title: `${t.errors} error${t.errors === 1 ? "" : "s"}`,
        text: `${t.failedReplies} reply, ${t.failedDms} DM and ${t.automationErrors} automation errors. Open Logs and filter by Errors.`,
      });
    }

    if (hasPrev) {
      const dc = delta(t.received, prev.received);
      if (dc !== null && Math.abs(dc) >= 10) {
        out.push({ tone: dc > 0 ? "good" : "warn", title: "Trend vs previous 7 days", text: `Comments are ${dc > 0 ? "up" : "down"} ${Math.abs(dc)}% (${t.received} vs ${prev.received}).` });
      }
      const dd = delta(t.dms, prev.dms);
      if (dd !== null && Math.abs(dd) >= 10) {
        out.push({ tone: dd > 0 ? "good" : "warn", title: "DM trend", text: `DMs sent are ${dd > 0 ? "up" : "down"} ${Math.abs(dd)}% (${t.dms} vs ${prev.dms}).` });
      }
    }

    if (clicksEnabled && t.dms > 0) {
      if (clickRate !== null && clickRate >= 30) {
        out.push({ tone: "good", title: "Strong click rate", text: `${clicksTotal} link clicks from ${t.dms} DMs (${clickRate}%). People are opening your jobs.` });
      } else if (clickRate !== null && clickRate < 10 && t.dms >= 10) {
        out.push({ tone: "warn", title: "Few DM clicks", text: `Only ${clickRate}% of DMs led to a click. Try a clearer button label, a shorter message, or a more exciting first line.` });
      } else {
        out.push({ tone: "info", title: "Link clicks", text: `${clicksTotal} clicks from ${t.dms} DMs${clickRate !== null ? ` (${clickRate}%)` : ""}.` });
      }
      const bestClickPost = clickData?.byPost[0];
      if (bestClickPost && bestClickPost.clicks > 0) {
        out.push({ tone: "info", title: "Most clicked post", text: `${bestClickPost.label} got ${bestClickPost.clicks} click${bestClickPost.clicks === 1 ? "" : "s"}.` });
      }
    }

    if (keywords[0] && keywordTotal > 0) {
      out.push({
        tone: "info",
        title: "Top keyword",
        text: `"${keywords[0].keyword}" drives ${pct(keywords[0].count, keywordTotal)}% of keyword matches${keywords[1] ? `, followed by "${keywords[1].keyword}"` : ""}.`,
      });
    }
    if (topPosts[0] && topPostsTotal > 0) {
      out.push({
        tone: "info",
        title: "Best performing post",
        text: `${topPosts[0].postLabel} produced ${topPosts[0].triggers} matches, ${pct(topPosts[0].triggers, topPostsTotal)}% of all matches from your top posts.`,
      });
    }
    return out;
  }, [t, prev, hasPrev, days.length, avgPerDay, activeDays, busiest, bestWeekday, matchRate, dmRate, replyRate, followTotal, followRate, keywords, keywordTotal, topPosts, topPostsTotal, clicksEnabled, clicksTotal, clickRate, clickData]);

  const funnel = [
    { label: "Comments received", value: t.received, color: "from-[#00e5ff] to-[#22d3ee]", note: "Every comment on your mapped posts." },
    { label: "Matched a rule", value: t.matched, color: "from-[#22d3ee] to-[#7c3aed]", note: t.received - t.matched > 0 ? `${t.received - t.matched} comments matched no rule.` : "Every comment matched a rule." },
    { label: "Public replies sent", value: t.replies, color: "from-[#7c3aed] to-[#a78bfa]", note: t.matched - t.replies > 0 ? `${t.matched - t.replies} matches got no public reply (DM-only rules, failures or skipped duplicates).` : "Every match got a public reply." },
    { label: "DMs sent", value: t.dms, color: "from-[#34d399] to-[#22d3ee]", note: t.matched - t.dms > 0 ? `${t.matched - t.dms} matches got no DM (comment-only rules, waiting for follow, or failed).` : "Every match got a DM." },
    ...(clicksEnabled
      ? [{ label: "Link clicked", value: clicksTotal, color: "from-[#38bdf8] to-[#7c3aed]", note: t.dms > 0 ? `${clicksTotal} taps on job buttons${clickRate !== null ? `, ${clickRate}% of DMs sent` : ""}. A person who taps twice counts twice.` : "No DMs sent in this period." }]
      : []),
    { label: "Follow verified", value: t.verified, color: "from-[#f59e0b] to-[#34d399]", note: followTotal > 0 ? `${t.verified} of ${followTotal} checked people already followed.` : "No follow checks yet." },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const exportCsv = () => {
    const header = ["date", "comments_received", "rule_matches", "replies_sent", "dms_sent", "link_clicks", "reply_failures", "dm_failures", "errors", "follow_verified", "follow_not_following", "follow_unsupported"];
    const rows = days.map((d) => [d.date, d.commentsReceived, d.triggers, d.repliesSent, d.dmsSent, clicksByDate.get(d.date) ?? 0, d.commentsFailed, d.dmsFailed, d.automationErrors, d.followVerified ?? 0, d.followNotVerified ?? 0, d.followUnsupported ?? 0]);
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

      {/* How to read */}
      <section className="glass rounded-2xl">
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          aria-expanded={guideOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-[#67e8f9]" />
            <span>
              <span className="block text-sm font-semibold text-white">How to read this page</span>
              <span className="block text-xs text-white/45">What each term means. Tap the i icons next to any chart for a detailed explanation.</span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
        </button>
        {guideOpen && (
          <dl className="grid gap-2.5 border-t border-white/5 p-4 md:grid-cols-2">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
                <dt className="text-xs font-semibold text-white">{g.term}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-white/55">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* KPI row */}
      <div className={`grid gap-3 sm:grid-cols-2 ${clicksEnabled ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => <div key={i} className="glass shimmer-loading h-28 rounded-2xl" />)
        ) : (
          <>
            <Kpi label="Comments received" value={t.received} dot="#00e5ff" change={hasPrev ? delta(t.received, prev.received) : null} hint={`${avgPerDay}/day avg · ${activeDays} active day${activeDays === 1 ? "" : "s"}`}
              help="Every comment Instagram sent us on your mapped posts, matched or not. In the 7-day view the badge compares with the 7 days before." />
            <Kpi label="Rule matches" value={t.matched} dot="#7c3aed" change={hasPrev ? delta(t.matched, prev.matched) : null} hint={matchRate !== null ? `${matchRate}% of comments` : undefined}
              help="Comments that matched an active rule. Match rate = matches ÷ comments received. Only matches can trigger a reply or DM." />
            <Kpi label="Public replies sent" value={t.replies} dot="#f59e0b" change={hasPrev ? delta(t.replies, prev.replies) : null} hint={replyRate !== null ? `${replyRate}% delivered` : undefined}
              help="Replies posted under the comment. Delivered % = sent ÷ (sent + failed). Rules set to DM only do not post public replies." />
            <Kpi label="DMs sent" value={t.dms} dot="#34d399" change={hasPrev ? delta(t.dms, prev.dms) : null} hint={dmRate !== null ? `${dmRate}% delivered` : undefined}
              help="Private messages delivered with your job links. Delivered % = sent ÷ (sent + failed). Comment-only rules never send a DM." />
            <Kpi label="Follow verified" value={t.verified} dot="#22d3ee" change={hasPrev ? delta(t.verified, prev.verified) : null} hint={followRate !== null ? `${followRate}% already followed` : undefined}
              help="People who already followed your account when the follow gate checked. % = verified ÷ (verified + not following)." />
            {clicksEnabled && (
              <>
                <Kpi label="Link clicks" value={clicksTotal} dot="#38bdf8" hint={clickRate !== null ? `${clickRate}% of DMs were clicked` : "No DMs yet"}
                  help="Taps on the job buttons inside your DMs, counted by the click tracker. Click rate = clicks ÷ DMs sent. One person tapping twice counts twice." />
              </>
            )}
            <Kpi label="Errors" value={t.errors} dot="#fb7185" bad={t.errors > 0} change={hasPrev ? delta(t.errors, prev.errors) : null} invert hint={data?.users !== undefined ? `${data.users.toLocaleString()} unique users overall` : undefined}
              help="Failed replies + failed DMs + automation errors. Open the Logs page and filter by Errors to see the reason for each. For this card, a drop is good news." />
          </>
        )}
      </div>

      {/* Activity chart */}
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="Daily activity"
            subtitle="One line per stage of the funnel, per day. Tap a chip to hide or show a line."
            tipTitle="Daily activity"
            tip={
              <>
                <p>Each point is one day. The four lines follow a comment through your automation:</p>
                <ul className="mt-2 space-y-1">
                  {visibleSeries.map((s) => (
                    <li key={s.key}><span className="font-semibold" style={{ color: s.color }}>{s.key}</span>: {s.meaning}</li>
                  ))}
                </ul>
                <p className="mt-2">Lines that sit far apart mean comments are dropping out between stages. Hover the chart to read exact numbers.</p>
              </>
            }
          />
          <div className="flex flex-wrap gap-1.5">
            {visibleSeries.map((s) => {
              const off = hidden.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  aria-pressed={!off}
                  title={s.meaning}
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
                  {visibleSeries.map((s) => (
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
                {visibleSeries.filter((s) => !hidden.includes(s.key)).map((s) => (
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
          <SectionTitle
            title="Conversion funnel"
            subtitle="From the first comment to a verified follower, with where people drop out."
            tipTitle="Conversion funnel"
            tip={
              <>
                <p>Each bar is a stage, sized against the biggest stage. The % is the share of all comments received.</p>
                <p className="mt-2">The grey sentence under a bar explains who did not make it to that stage. Large gaps are normal for DM-only or comment-only rules and for people who have not followed yet.</p>
                <p className="mt-2">Act on it: a big gap after &quot;Matched a rule&quot; usually means failures. Check Logs.</p>
              </>
            }
          />
          <div className="mt-5 space-y-5">
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
                  <p className="mt-1 text-[11px] text-white/35">{f.note}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <SectionTitle
            title="Delivery health"
            subtitle="How reliably messages reach people."
            tipTitle="Delivery health"
            tip={
              <>
                <p><span className="font-semibold text-emerald-300">Green</span> is 95% or more, <span className="font-semibold text-amber-300">amber</span> is 80 to 94%, <span className="font-semibold text-rose-300">red</span> is below 80%.</p>
                <p className="mt-2">Public reply and DM success = sent ÷ (sent + failed). Rule match rate and Already following are informational, so they use a neutral colour.</p>
                <p className="mt-2">Red usually means an expired token or Meta permission problem. Check Settings.</p>
              </>
            }
          />
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
        <SectionTitle
          title="Insights"
          icon={<Lightbulb className="h-4 w-4 text-amber-300" />}
          subtitle="Plain-language findings written from your numbers. They update with the date range."
          tipTitle="Insights"
          tip={
            <>
              <p>These are generated automatically from the same numbers shown on this page. Nothing is guessed.</p>
              <p className="mt-2"><span className="font-semibold text-emerald-300">Green</span> = going well, <span className="font-semibold text-amber-300">amber</span> = worth improving, <span className="font-semibold text-rose-300">red</span> = needs attention, <span className="font-semibold text-[#67e8f9]">blue</span> = good to know.</p>
            </>
          }
        />
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
          {insights.map((ins) => (
            <InsightCard key={ins.title + ins.text} insight={ins} />
          ))}
        </ul>
      </section>

      {/* Weekday + follow gate */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <SectionTitle
            title="Comments by weekday"
            subtitle="Which days of the week bring the most comments."
            tipTitle="Comments by weekday"
            tip={
              <>
                <p>All comments in the selected range, grouped by the day of the week they arrived. The tallest bar is highlighted.</p>
                <p className="mt-2">Use it to pick the best day to publish a mapped job. With only 7 to 14 days of data, treat it as a hint, not a rule.</p>
              </>
            }
          />
          <div className="mt-4 h-56">
            {isLoading ? (
              <div className="shimmer-loading h-full rounded-xl" />
            ) : t.received === 0 ? (
              <EmptyChart label="No comments in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="comments" name="Comments" radius={[6, 6, 0, 0]}>
                    {weekdayData.map((w) => (
                      <Cell key={w.name} fill={w.name === bestWeekday?.name && w.comments > 0 ? "#00e5ff" : "#7c3aed"} fillOpacity={w.name === bestWeekday?.name && w.comments > 0 ? 1 : 0.55} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <SectionTitle
              title="Follow gate by day"
              subtitle="Did commenters already follow you?"
              tipTitle="Follow gate"
              tip={
                <>
                  <p>Before sending the link, the bot checks whether the commenter follows your account.</p>
                  <ul className="mt-2 space-y-1">
                    <li><span className="font-semibold text-emerald-300">Verified</span>: already follows, link sent at once.</li>
                    <li><span className="font-semibold text-amber-300">Not following</span>: asked to follow first, link sent after they confirm.</li>
                    <li><span className="font-semibold text-slate-300">Could not verify</span>: Instagram did not allow the check for this person.</li>
                  </ul>
                  <p className="mt-2">A big amber bar means the gate is turning commenters into new followers.</p>
                </>
              }
            />
            <span className="text-[11px] text-white/40">
              {followTotal > 0 ? `${t.verified} of ${followTotal} already followed` : "No follow checks yet"}
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
      </div>

      {/* Keywords + posts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-6">
          <SectionTitle
            title="Top keywords"
            subtitle="The words people comment that trigger your rules."
            tipTitle="Top keywords"
            tip={
              <>
                <p>Counts how often each keyword triggered a rule. The % is the share of all keyword matches, so the list adds up to 100%.</p>
                <p className="mt-2">If one word dominates, keep it in your post text. If a word you expected is missing, people may be spelling it differently.</p>
              </>
            }
          />
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
          <div className="flex items-start justify-between gap-3">
            <SectionTitle
              title="Top posts"
              subtitle="Mapped posts ranked by rule matches."
              tipTitle="Top posts"
              tip={
                <>
                  <p>Posts ranked by how many comments matched a rule, not by likes. It shows which jobs make people act.</p>
                  <p className="mt-2">Tap the arrow to open the Instagram post. Reuse the format of the top posts.</p>
                </>
              }
            />
            <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 ring-1 ring-white/10">Top 6</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer-loading h-14 rounded-xl" />)
            ) : topPosts.length === 0 ? (
              <div className="h-40"><EmptyChart label="No mapped post matches yet" /></div>
            ) : (
              topPosts.map((p, index) => {
                const max = topPosts[0]?.triggers || 1;
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

      {/* Link clicks */}
      <section className="glass rounded-2xl p-6">
        <SectionTitle
          title="Link clicks by post"
          icon={<MousePointerClick className="h-4 w-4 text-[#38bdf8]" />}
          subtitle="Which posts and which links people actually tap after receiving the DM."
          tipTitle="Link clicks"
          tip={
            <>
              <p>When click tracking is on, every job button in a DM goes through your backend once, is counted, then opens the job.</p>
              <p className="mt-2">&quot;Link 1&quot; is the first job in the DM, &quot;Link 2&quot; the second, and so on. Compare them to see which job is more popular.</p>
              <p className="mt-2">Preview bots are not counted. Covers the last 14 days.</p>
            </>
          }
        />
        {!clicksEnabled ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/60">
            <p className="font-medium text-white/80">Click tracking is off</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              To see how many people tap your job buttons, set <code className="rounded bg-black/30 px-1">TRACKING_BASE_URL</code> on the backend to its public address (for example https://your-backend.vercel.app) and redeploy. Links keep working exactly as before while it is off.
            </p>
          </div>
        ) : (clickData?.byPost.length ?? 0) === 0 ? (
          <div className="mt-4 h-40"><EmptyChart label="No clicks yet in the last 14 days" /></div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {clickData!.byPost.slice(0, 8).map((p, i) => {
              const max = clickData!.byPost[0].clicks || 1;
              return (
                <div key={p.mediaId} className="rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[11px] text-white/55">{i + 1}</span>
                      <span className="truncate text-xs font-medium text-white/85" title={p.label}>{p.label}</span>
                    </span>
                    <span className="shrink-0 rounded-md bg-[#38bdf8]/10 px-2 py-1 text-[11px] font-semibold text-[#7dd3fc]">{p.clicks} click{p.clicks === 1 ? "" : "s"}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="hd-bar-grow h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-[#7c3aed]" style={{ width: `${Math.max(6, (p.clicks / max) * 100)}%` }} />
                  </div>
                  {p.byLink.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.byLink.map((l) => (
                        <span key={l.index} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/55 ring-1 ring-white/10">Link {l.index + 1}: {l.clicks}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily breakdown */}
      <section className="glass rounded-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
          <SectionTitle
            title="Daily breakdown"
            subtitle="The raw numbers behind every chart, newest day first."
            tipTitle="Daily breakdown"
            tip={
              <>
                <p>One row per day. Every chart above is drawn from these numbers.</p>
                <p className="mt-2">Errors are shown in red when above zero. Use Export CSV to open the table in Excel or Google Sheets.</p>
              </>
            }
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-white/5 text-left text-[11px] uppercase tracking-wider text-white/40">
                {["Date", "Comments", "Matches", "Replies", "DMs", ...(clicksEnabled ? ["Clicks"] : []), "Followed", "Not following", "Errors"].map((h, i) => (
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
                    {clicksEnabled && <Num v={clicksByDate.get(d.date) ?? 0} />}
                    <Num v={d.followVerified ?? 0} />
                    <Num v={d.followNotVerified ?? 0} />
                    <td className={`px-4 py-2.5 text-right ${errs > 0 ? "font-semibold text-rose-300" : "text-white/35"}`}>{errs}</td>
                  </tr>
                );
              })}
              {days.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-white/40">No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
  title, subtitle, tip, tipTitle, icon,
}: {
  title: string;
  subtitle: string;
  tip: ReactNode;
  tipTitle: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
        {icon}
        {title}
        <InfoTip title={tipTitle}>{tip}</InfoTip>
      </h2>
      <p className="mt-1 text-[11px] normal-case leading-relaxed text-white/35">{subtitle}</p>
    </div>
  );
}

const TONE_STYLES: Record<Tone, { ring: string; bg: string; icon: ReactNode }> = {
  good: { ring: "ring-emerald-500/20", bg: "bg-emerald-500/[0.06]", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
  warn: { ring: "ring-amber-500/20", bg: "bg-amber-500/[0.06]", icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
  bad: { ring: "ring-rose-500/25", bg: "bg-rose-500/[0.07]", icon: <XCircle className="h-4 w-4 text-rose-400" /> },
  info: { ring: "ring-white/10", bg: "bg-white/[0.03]", icon: <InfoIcon className="h-4 w-4 text-[#67e8f9]" /> },
};

function InsightCard({ insight }: { insight: Insight }) {
  const s = TONE_STYLES[insight.tone];
  return (
    <li className={`flex gap-3 rounded-xl p-3.5 ring-1 ${s.ring} ${s.bg}`}>
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{insight.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/60">{insight.text}</p>
      </div>
    </li>
  );
}

function Num({ v }: { v: number }) {
  return <td className={`px-4 py-2.5 text-right ${v > 0 ? "text-white/85" : "text-white/30"}`}>{v}</td>;
}

function Kpi({
  label, value, dot, change, hint, bad, invert, help,
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
  /** Explanation shown in the info popover. */
  help?: string;
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
          {help && <InfoTip title={label}>{help}</InfoTip>}
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
