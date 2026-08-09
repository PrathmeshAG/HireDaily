import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle, Sparkles, Reply, Send, AlertTriangle, RotateCcw, ScrollText,
} from "lucide-react";
import { getLogs } from "../services/automation-service";
import type { LogEntry, LogType } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";

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

const FILTERS: { id: LogType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "comment_received", label: "Comments" },
  { id: "dm_sent", label: "DMs" },
  { id: "error", label: "Errors" },
];

export function LogsPage() {
  const { data: logs, isLoading } = useQuery({ queryKey: ["automation", "logs"], queryFn: getLogs });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogType | "all">("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let list = logs ?? [];
    if (filter !== "all") {
      list = filter === "comment_received"
        ? list.filter((l) => l.type === "comment_received" || l.type === "comment_sent")
        : filter === "dm_sent"
          ? list.filter((l) => l.type === "dm_sent")
          : list.filter((l) => l.type === "error" || l.type === "retry");
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
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Logs</h1>
      <p className="mt-1 text-sm text-white/50">Every webhook event, reply, DM, and error — in order.</p>

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
                </button>
              ))}
            </div>
          }
        />
        {isLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : paged.length === 0 ? (
          <EmptyState icon={ScrollText} title="No logs found" description="Try a different search or filter." />
        ) : (
          <ol className="divide-y divide-white/5">
            {paged.map((log: LogEntry) => (
              <li key={log.id} className="flex items-start gap-3 px-4 py-3.5">
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
                <span className="shrink-0 text-xs text-white/40">{timeAgo(log.timestamp)}</span>
              </li>
            ))}
          </ol>
        )}
        <PaginationBar page={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </div>
    </div>
  );
}
