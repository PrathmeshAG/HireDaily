import { useQuery } from "@tanstack/react-query";
import {
  Instagram, Link2, ListChecks, MessageCircle, Send, AlertTriangle,
  MessageSquareText, FileText, Users, ArrowRight,
} from "lucide-react";
import { getDashboardSummary, getRecentLogs } from "../services/automation-service";
import { StatCard } from "../components/stat-card";
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

  const cards = [
    {
      label: "Connected Instagram",
      value: summary ? (summary.connected ? "Connected" : "Not connected") : "—",
      icon: Instagram,
      color: "from-[#00e5ff]/20 to-[#22d3ee]/20",
    },
    { label: "Total Post Mappings", value: summary?.totalMappings ?? "—", icon: Link2, color: "from-[#7c3aed]/20 to-[#00e5ff]/20" },
    { label: "Active Rules", value: summary?.activeRules ?? "—", icon: ListChecks, color: "from-[#22d3ee]/20 to-[#7c3aed]/20" },
    { label: "Today's Comments", value: summary?.todaysComments ?? "—", icon: MessageCircle, color: "from-[#00e5ff]/20 to-[#22d3ee]/20" },
    { label: "Today's DMs", value: summary?.todaysDMs ?? "—", icon: Send, color: "from-[#7c3aed]/20 to-[#00e5ff]/20" },
    { label: "Failed Automations", value: summary?.failedAutomations ?? "—", icon: AlertTriangle, color: "from-rose-500/20 to-[#7c3aed]/20" },
  ];

  const quickActions: { label: string; page: PageId; icon: typeof Link2 }[] = [
    { label: "Map a new post", page: "mappings", icon: Link2 },
    { label: "Create a rule", page: "rules", icon: ListChecks },
    { label: "Edit templates", page: "templates", icon: MessageSquareText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
          Automation Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/50">Instagram engagement automation — overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="glass shimmer-loading h-[104px] rounded-2xl" />
            ))
          : cards.map((c, i) => <StatCard key={c.label} {...c} index={i} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <button onClick={() => onNavigate("logs")} className="flex items-center gap-1 text-xs text-white/50 hover:text-[#00e5ff]">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 space-y-1">
            {logsLoading ? (
              Array.from({ length: 5 }, (_, i) => <div key={i} className="shimmer-loading h-12 rounded-xl" />)
            ) : recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02]">
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
              <p className="px-3 py-6 text-center text-sm text-white/50">No activity yet.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.page}
                onClick={() => onNavigate(a.page)}
                className="btn-ghost-glow flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm"
              >
                <a.icon className="h-4 w-4 text-[#00e5ff]" />
                {a.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate("users")}
              className="btn-ghost-glow flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm"
            >
              <Users className="h-4 w-4 text-[#00e5ff]" />
              View users
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="btn-ghost-glow flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm"
            >
              <FileText className="h-4 w-4 text-[#00e5ff]" />
              Open analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
