import { useQuery } from "@tanstack/react-query";
import {
  Instagram, Link2, ListChecks, MessageCircle, Send, AlertTriangle,
  MessageSquareText, FileText, Users, ArrowRight, CheckCircle2, Circle, ScrollText, KeyRound, Unlink, RotateCcw, Inbox,
} from "lucide-react";
import { getDashboardSummary, getRecentLogs, getHealthReport } from "../services/automation-service";
import { StatCard } from "../components/stat-card";
import { PageHeader } from "../components/page-header";
import { HeroArt, EmptyArt } from "../components/illustrations";
import { EmptyState } from "../components/empty-state";
import { LogTypeIcon, logTypeLabel, timeAgo } from "./logs-page";
import type { PageId } from "../automation-app";

export function DashboardPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["automation", "summary"],
    queryFn: getDashboardSummary,
  });
  const { data: recentLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["automation", "recent-logs"],
    queryFn: () => getRecentLogs(6),
  });

  const { data: health } = useQuery({
    queryKey: ["automation", "health-report"],
    queryFn: getHealthReport,
    staleTime: 60_000,
    retry: false,
  });

  const failed = summary?.failedAutomations ?? 0;

  // Things that need attention, most urgent first.
  const DAY = 24 * 60 * 60 * 1000;
  const tokenDays = health?.token?.expiresAt ? Math.floor((health.token.expiresAt - Date.now()) / DAY) : null;
  const attention: { key: string; tone: "bad" | "warn" | "info"; icon: typeof KeyRound; title: string; text: string; page: PageId; cta: string }[] = [];
  if (health?.token?.valid === false) {
    attention.push({
      key: "token", tone: "bad", icon: KeyRound, page: "settings", cta: "Open Settings",
      title: "Meta access token is invalid",
      text: "Replies and DMs are failing. Generate a new token, update META_ACCESS_TOKEN and redeploy.",
    });
  } else if (tokenDays !== null && tokenDays <= 7) {
    attention.push({
      key: "token-soon", tone: "warn", icon: KeyRound, page: "settings", cta: "Open Settings",
      title: `Meta access token expires in ${Math.max(0, tokenDays)} day${tokenDays === 1 ? "" : "s"}`,
      text: "Replace it before then so the automation does not stop.",
    });
  }
  if ((health?.retryableFailures ?? 0) > 0) {
    attention.push({
      key: "retry", tone: "warn", icon: RotateCcw, page: "logs", cta: "Retry in Logs",
      title: `${health!.retryableFailures} comment${health!.retryableFailures === 1 ? "" : "s"} did not get a reply or DM`,
      text: "These failed recently and can be sent again with one click.",
    });
  }
  if ((health?.missingJobs.length ?? 0) > 0) {
    attention.push({
      key: "missing", tone: "bad", icon: Unlink, page: "mappings", cta: "Fix mappings",
      title: `${health!.missingJobs.length} post mapping${health!.missingJobs.length === 1 ? " points" : "s point"} to a deleted job`,
      text: `${health!.missingJobs.slice(0, 3).map((m) => m.label).join(", ")}${health!.missingJobs.length > 3 ? "…" : ""}. These posts cannot send links until fixed.`,
    });
  }
  if ((health?.unmatchedComments ?? 0) >= 5) {
    attention.push({
      key: "unmatched", tone: "info", icon: Inbox, page: "rules", cta: "Review comments",
      title: `${health!.unmatchedComments} comments matched no rule`,
      text: "Review them to find new keywords and spelling variations.",
    });
  }

  const cards = [
    {
      label: "Instagram",
      value: summary ? (summary.connected ? "Connected" : "Not connected") : "—",
      icon: Instagram,
      color: "from-[#00e5ff]/20 to-[#22d3ee]/20",
      tone: summary ? (summary.connected ? ("good" as const) : ("bad" as const)) : ("default" as const),
    },
    { label: "Post mappings", value: summary?.totalMappings ?? "—", icon: Link2, color: "from-[#7c3aed]/20 to-[#00e5ff]/20" },
    { label: "Active rules", value: summary?.activeRules ?? "—", icon: ListChecks, color: "from-[#22d3ee]/20 to-[#7c3aed]/20" },
    { label: "Comments today", value: summary?.todaysComments ?? "—", icon: MessageCircle, color: "from-[#00e5ff]/20 to-[#22d3ee]/20" },
    { label: "DMs today", value: summary?.todaysDMs ?? "—", icon: Send, color: "from-[#7c3aed]/20 to-[#00e5ff]/20" },
    {
      label: "Failed automations",
      value: summary?.failedAutomations ?? "—",
      icon: AlertTriangle,
      color: "from-rose-500/20 to-[#7c3aed]/20",
      tone: failed > 0 ? ("bad" as const) : ("default" as const),
      hint: failed > 0 ? "Check the logs" : undefined,
    },
  ];

  const quickActions: { label: string; page: PageId; icon: typeof Link2 }[] = [
    { label: "Map a new post", page: "mappings", icon: Link2 },
    { label: "Create a rule", page: "rules", icon: ListChecks },
    { label: "Edit templates", page: "templates", icon: MessageSquareText },
    { label: "View users", page: "users", icon: Users },
    { label: "Open analytics", page: "analytics", icon: FileText },
  ];

  // Setup checklist: derived only from the existing summary numbers.
  const steps = summary
    ? [
        { label: "Connect Instagram", done: summary.connected, page: "settings" as PageId },
        { label: "Map a post to a job", done: summary.totalMappings > 0, page: "mappings" as PageId },
        { label: "Create an active rule", done: summary.activeRules > 0, page: "rules" as PageId },
      ]
    : [];
  const doneCount = steps.filter((s) => s.done).length;
  const showChecklist = steps.length > 0 && doneCount < steps.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Dashboard"
        subtitle="Comments in, job links out. Watch what your Instagram automation did today."
        art={<HeroArt />}
      >
        {summary && (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ${
              summary.connected ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25" : "bg-rose-500/10 text-rose-300 ring-rose-500/25"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${summary.connected ? "bg-emerald-300 hd-ring-pulse" : "bg-rose-300"}`} />
            {summary.connected ? "Instagram connected" : "Instagram not connected"}
          </span>
        )}
      </PageHeader>

      {attention.length > 0 && (
        <section aria-label="Needs attention" className="space-y-2.5">
          {attention.map((a) => (
            <div
              key={a.key}
              className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ring-1 ${
                a.tone === "bad" ? "bg-rose-500/10 ring-rose-400/25" : a.tone === "warn" ? "bg-amber-500/10 ring-amber-400/25" : "bg-[#00e5ff]/[0.06] ring-[#00e5ff]/20"
              }`}
            >
              <a.icon className={`h-5 w-5 shrink-0 ${a.tone === "bad" ? "text-rose-300" : a.tone === "warn" ? "text-amber-300" : "text-[#67e8f9]"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{a.title}</p>
                <p className="text-xs text-white/55">{a.text}</p>
              </div>
              <button onClick={() => onNavigate(a.page)} className="btn-ghost-glow flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs">
                {a.cta} <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass shimmer-loading h-[124px] rounded-2xl" />
            ))
          : cards.map((c, i) => <StatCard key={c.label} {...c} index={i} />)}
      </div>

      {showChecklist && (
        <section className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Finish setting up</h2>
              <p className="mt-0.5 text-xs text-white/45">{doneCount} of {steps.length} steps done</p>
            </div>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div
                className="hd-bar-grow h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ul className="mt-4 grid gap-2 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.label}>
                <button
                  onClick={() => onNavigate(s.page)}
                  disabled={s.done}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-sm ring-1 transition ${
                    s.done ? "bg-emerald-500/5 text-white/50 ring-emerald-500/20" : "bg-white/[0.03] text-white ring-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-white/40" />}
                  <span className={s.done ? "line-through decoration-white/20" : ""}>{s.label}</span>
                  {!s.done && <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/40" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
            <button onClick={() => onNavigate("logs")} className="flex items-center gap-1 text-xs text-white/50 hover:text-[#00e5ff]">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 space-y-1">
            {logsLoading ? (
              Array.from({ length: 5 }, (_, i) => <div key={i} className="shimmer-loading h-12 rounded-xl" />)
            ) : recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                    <LogTypeIcon type={log.type} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/80">
                      <span className="text-white">@{log.username}</span> — {logTypeLabel(log.type)}
                    </p>
                    <p className="truncate text-xs text-white/40">{log.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-white/40">{timeAgo(log.timestamp)}</span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={ScrollText}
                art={<EmptyArt kind="inbox" />}
                title="No activity yet"
                description="When someone comments a keyword on a mapped post, it shows up here."
              />
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <div className="mt-4 space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.page}
                onClick={() => onNavigate(a.page)}
                className="btn-ghost-glow group flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm"
              >
                <a.icon className="h-4 w-4 text-[#00e5ff]" />
                {a.label}
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#00e5ff]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
