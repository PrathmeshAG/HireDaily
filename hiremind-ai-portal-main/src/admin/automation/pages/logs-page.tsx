import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle, Sparkles, Reply, Send, AlertTriangle, RotateCcw, ScrollText, RefreshCw,
} from "lucide-react";
import { getLogs } from "../services/automation-service";
import type { LogEntry, LogType } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";
import { PageHeader } from "../components/page-header";
import { RetryPanel } from "../components/retry-panel";
import { LogsArt, EmptyArt } from "../components/illustrations";

const LOG_ICON: Record<LogType, typeof MessageCircle> = {
  comment_received: MessageCircle,
  keyword_matched: Sparkles,
  comment_sent: Reply,
  dm_sent: Send,
  error: AlertTriangle,
  retry: RotateCcw,
};

const LOG_COLOR: Record<LogType, string> = {
  comment_received: "text-[#22d3ee]",
  keyword_matched: "text-[#7c3aed]",
  comment_sent: "text-[#00e5ff]",
  dm_sent: "text-emerald-300",
  error: "text-rose-300",
  retry: "text-amber-300",
};

export function LogTypeIcon({ type, className }: { type: LogType; className?: string }) {
  const Icon = LOG_ICON[type];
  return <Icon className={`${className ?? "h-4 w-4"} ${LOG_COLOR[type]}`} />;
}

export function logTypeLabel(type: LogType): string {
  switch (type) {
    case "comment_received": return "Comment received";
    case "keyword_matched": return "Keyword matched";
    case "comment_sent": return "Reply sent";
    case "dm_sent": return "DM sent";
    case "error": return "Error";
    case "retry": return "Retry";
  }
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function matchesFilter(l: LogEntry, f: LogType | "all"): boolean {
  if (f === "all") return true;
  if (f === "comment_received") return l.type === "comment_received" || l.type === "comment_sent";
  if (f === "dm_sent") return l.type === "dm_sent";
  return l.type === "error" || l.type === "retry";
}

const FILTERS: { id: LogType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "comment_received", label: "Comments" },
  { id: "dm_sent", label: "DMs" },
  { id: "error", label: "Errors" },
];

export function LogsPage() {
  const [live, setLive] = useState(true);
  const { data: logs, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["automation", "logs"],
    queryFn: getLogs,
    refetchInterval: live ? 15_000 : false,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogType | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let list = logs ?? [];
    if (filter !== "all") {
      list = list.filter((l) => matchesFilter(l, filter));
    }
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((l) => `${l.username} ${l.detail} ${l.ruleKeyword ?? ""}`.toLowerCase().includes(t));
    }
    return list;
  }, [logs, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <PageHeader
        title="Logs"
        subtitle="Every webhook event, reply, DM, and error — in order."
        art={<LogsArt />}
        actions={
          <>
            <button
              onClick={() => refetch()}
              className="btn-ghost-glow flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => setLive((v) => !v)}
              aria-pressed={live}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs ring-1 transition ${
                live ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25" : "text-white/60 ring-white/10 hover:bg-white/5"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-300 hd-ring-pulse" : "bg-white/30"}`} />
              {live ? "Live · every 15s" : "Auto-refresh off"}
            </button>
          </>
        }
      />

      <RetryPanel />

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search logs by user, keyword, detail…"
          filters={
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setFilter(f.id); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${
                    filter === f.id
                      ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {f.label}
                  {logs && <span className="ml-1.5 text-[10px] text-white/40">{logs.filter((l) => matchesFilter(l, f.id)).length}</span>}
                </button>
              ))}
            </div>
          }
        />
        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            art={<EmptyArt kind="search" />}
            title="No logs found"
            description="Try a different search or filter."
          />
        ) : (
          <ol className="divide-y divide-white/5">
            {paged.map((log: LogEntry) => (
              <li
                key={log.id}
                className={`flex items-start gap-3 px-4 py-3.5 transition hover:bg-white/[0.03] ${
                  log.type === "error" ? "border-l-2 border-rose-400/60" : "border-l-2 border-transparent"
                }`}
              >

                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <LogTypeIcon type={log.type} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{logTypeLabel(log.type)}</span>
                    <span className="text-xs text-white/40">@{log.username}</span>
                    {log.ruleKeyword && (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50 ring-1 ring-white/10">
                        {log.ruleKeyword}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-white/60">{log.detail}</p>
                </div>
                <span className="shrink-0 text-right text-xs text-white/40" title={new Date(log.timestamp).toLocaleString()}>
                  {timeAgo(log.timestamp)}
                  <span className="block text-[10px] text-white/25">{dayLabel(log.timestamp)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        <PaginationBar page={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </div>
    </div>
  );
}
