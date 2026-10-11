import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users as UsersIcon, Download, ExternalLink, Trophy, Sparkles, MessageCircle } from "lucide-react";
import { getUsers } from "../services/automation-service";
import { TableToolbar } from "../components/table-toolbar";
import { SortSelect } from "../components/sort-select";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { InfoTip } from "../components/info-tip";
import { AnimatedNumber } from "../components/animated-number";
import { UsersArt, EmptyArt } from "../components/illustrations";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";
import { StatusBadge } from "../components/status-badge";
import { timeAgo } from "./logs-page";
import type { AutomationUser, FollowStatus } from "../types";

const FOLLOW_LABEL: Record<FollowStatus, string> = {
  follower: "Follower",
  not_follower: "Not following",
  unknown: "Unknown",
};

type Sort = "recent" | "comments" | "dms" | "newest" | "oldest" | "az";
const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recent activity" },
  { value: "comments", label: "Most comments" },
  { value: "dms", label: "Most DMs" },
  { value: "newest", label: "Newest users" },
  { value: "oldest", label: "Oldest users" },
  { value: "az", label: "Username A to Z" },
];

const WEEK = 7 * 24 * 60 * 60 * 1000;
const MEDAL = ["🥇", "🥈", "🥉"];

function isRealUsername(u: AutomationUser): boolean {
  return !!u.username && u.username !== "unknown";
}

export function UsersPage() {
  const { data: users, isLoading } = useQuery({ queryKey: ["automation", "users"], queryFn: getUsers });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | FollowStatus>("all");
  const [sortBy, setSortBy] = useState<Sort>("recent");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const list = users ?? [];
  const now = Date.now();

  const stats = useMemo(() => {
    const total = list.length;
    const follower = list.filter((u) => u.followStatus === "follower").length;
    const notFollower = list.filter((u) => u.followStatus === "not_follower").length;
    const unknown = total - follower - notFollower;
    const active7 = list.filter((u) => now - u.lastSeen <= WEEK).length;
    const new7 = list.filter((u) => u.firstSeen && now - u.firstSeen <= WEEK).length;
    const comments = list.reduce((a, u) => a + u.commentCount, 0);
    const checked = follower + notFollower;
    return { total, follower, notFollower, unknown, active7, new7, comments, followRate: checked > 0 ? Math.round((follower / checked) * 100) : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  const topCommenters = useMemo(() => [...list].sort((a, b) => b.commentCount - a.commentCount).filter((u) => u.commentCount > 0).slice(0, 5), [list]);
  const topDms = useMemo(() => [...list].sort((a, b) => b.dmCount - a.dmCount).filter((u) => u.dmCount > 0).slice(0, 5), [list]);
  const newest = useMemo(() => [...list].filter((u) => u.firstSeen).sort((a, b) => (b.firstSeen ?? 0) - (a.firstSeen ?? 0)).slice(0, 5), [list]);

  const filtered = useMemo(() => {
    let out = list;
    if (filter !== "all") out = out.filter((u) => u.followStatus === filter);
    if (search) out = out.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));
    const sorted = [...out];
    switch (sortBy) {
      case "comments": sorted.sort((a, b) => b.commentCount - a.commentCount || b.lastSeen - a.lastSeen); break;
      case "dms": sorted.sort((a, b) => b.dmCount - a.dmCount || b.lastSeen - a.lastSeen); break;
      case "newest": sorted.sort((a, b) => (b.firstSeen ?? 0) - (a.firstSeen ?? 0)); break;
      case "oldest": sorted.sort((a, b) => (a.firstSeen ?? Infinity) - (b.firstSeen ?? Infinity)); break;
      case "az": sorted.sort((a, b) => a.username.localeCompare(b.username)); break;
      default: sorted.sort((a, b) => b.lastSeen - a.lastSeen);
    }
    return sorted;
  }, [list, filter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const maxComments = Math.max(1, ...list.map((u) => u.commentCount));

  const exportCsv = () => {
    const header = ["username", "comments", "dms", "follow_status", "first_seen", "last_activity"];
    const rows = filtered.map((u) => [u.username, u.commentCount, u.dmCount, FOLLOW_LABEL[u.followStatus], u.firstSeen ? new Date(u.firstSeen).toISOString() : "", new Date(u.lastSeen).toISOString()]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "hiredaily-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const chips: { id: "all" | FollowStatus; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "follower", label: "Follower", count: stats.follower },
    { id: "not_follower", label: "Not following", count: stats.notFollower },
    { id: "unknown", label: "Unknown", count: stats.unknown },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Everyone who has triggered your automation: who comments the most, who follows you and who is new."
        art={<UsersArt />}
        actions={
          <button onClick={exportCsv} disabled={filtered.length === 0} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }, (_, i) => <div key={i} className="glass shimmer-loading h-24 rounded-2xl" />)
        ) : (
          <>
            <Kpi label="Total users" value={stats.total} hint={`${stats.new7} new this week`} dot="#00e5ff" />
            <Kpi label="Active this week" value={stats.active7} hint={stats.total ? `${Math.round((stats.active7 / stats.total) * 100)}% of all users` : undefined} dot="#7c3aed" />
            <Kpi label="Followers" value={stats.follower} hint={stats.followRate !== null ? `${stats.followRate}% of checked users` : "Not checked yet"} dot="#34d399" />
            <Kpi label="Not following" value={stats.notFollower} hint="Asked to follow first" dot="#f59e0b" />
            <Kpi label="Unknown" value={stats.unknown} hint="No answer from Instagram" dot="#64748b" />
          </>
        )}
      </div>

      {/* What the statuses mean */}
      <section className="glass rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
          What do the follow statuses mean?
          <InfoTip title="Follow status">
            <p>Before sending the link, the follow gate asks Instagram whether the commenter follows your account. The result is saved on the user and shown here. It is the latest result for each person.</p>
          </InfoTip>
        </h2>
        <div className="mt-3 grid gap-2.5 md:grid-cols-3">
          <Meaning tone="success" title="Follower" text="Instagram confirmed this person already follows you. They got the job link straight away." />
          <Meaning tone="warning" title="Not following" text="Instagram says they do not follow you. The bot asked them to follow first and sent the link after they confirmed." />
          <Meaning tone="neutral" title="Unknown" text="No answer. Either the person was never checked (comment-only rules and older users skip the follow gate), or Instagram could not tell for this account. It does not mean they are not following." />
        </div>
      </section>

      {/* Leaderboards */}
      {!isLoading && list.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Board title="Top commenters" icon={<Trophy className="h-4 w-4 text-amber-300" />} tip="Users with the most comments that reached your automation." rows={topCommenters.map((u, i) => ({ u, value: u.commentCount, unit: "comments", medal: MEDAL[i] }))} />
          <Board title="Most DMs received" icon={<MessageCircle className="h-4 w-4 text-[#34d399]" />} tip="Users who received the most DMs from you." rows={topDms.map((u, i) => ({ u, value: u.dmCount, unit: "DMs", medal: MEDAL[i] }))} />
          <Board title="Newest users" icon={<Sparkles className="h-4 w-4 text-[#67e8f9]" />} tip="People who triggered the automation for the first time most recently." rows={newest.map((u) => ({ u, value: null, unit: u.firstSeen ? timeAgo(u.firstSeen) : "", medal: "" }))} />
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by username…"
          sort={<SortSelect value={sortBy} onChange={(v) => { setSortBy(v); setPage(1); }} options={SORTS} />}
          filters={
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setFilter(c.id); setPage(1); }}
                  aria-pressed={filter === c.id}
                  className={`rounded-lg px-3 py-1.5 text-xs transition ${filter === c.id ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30" : "text-white/55 ring-1 ring-white/10 hover:text-white"}`}
                >
                  {c.label} <span className="ml-1 text-[10px] text-white/40">{c.count}</span>
                </button>
              ))}
            </div>
          }
        />

        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : paged.length === 0 ? (
          <EmptyState icon={UsersIcon} art={<EmptyArt kind="inbox" />} title={list.length === 0 ? "No users yet" : "No users match"} description={list.length === 0 ? "Users will appear here once automations start triggering." : "Try a different search or filter."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Comments</th>
                  <th className="px-4 py-3 font-medium">DMs</th>
                  <th className="px-4 py-3 font-medium">Follow status</th>
                  <th className="px-4 py-3 font-medium">First seen</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map((u) => (
                  <tr key={u.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] text-xs font-bold text-white/70 ring-1 ring-white/10">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <span className="text-white/85">@{u.username}</span>
                        {isRealUsername(u) && (
                          <a href={`https://www.instagram.com/${encodeURIComponent(u.username)}/`} target="_blank" rel="noreferrer" aria-label={`Open @${u.username} on Instagram`} className="text-white/30 transition hover:text-[#00e5ff]">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 text-white/80">{u.commentCount}</span>
                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/5 sm:block">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ width: `${Math.max(4, (u.commentCount / maxComments) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{u.dmCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={FOLLOW_LABEL[u.followStatus]}
                        tone={u.followStatus === "follower" ? "success" : u.followStatus === "not_follower" ? "warning" : "neutral"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{u.firstSeen ? timeAgo(u.firstSeen) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{timeAgo(u.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar page={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, dot }: { label: string; value: number; hint?: string; dot: string }) {
  return (
    <div className="glass card-glow rounded-2xl p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white"><AnimatedNumber value={value} /></p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function Meaning({ tone, title, text }: { tone: "success" | "warning" | "neutral"; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3.5 ring-1 ring-white/5">
      <StatusBadge label={title} tone={tone} />
      <p className="mt-2 text-xs leading-relaxed text-white/55">{text}</p>
    </div>
  );
}

function Board({
  title, icon, tip, rows,
}: {
  title: string;
  icon: React.ReactNode;
  tip: string;
  rows: { u: AutomationUser; value: number | null; unit: string; medal: string }[];
}) {
  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
        {icon}
        {title}
        <InfoTip title={title}>{tip}</InfoTip>
      </h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/35">Nothing yet</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map(({ u, value, unit, medal }, i) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-white/[0.04]">
              <span className="w-6 text-center text-sm">{medal || <span className="text-xs text-white/35">{i + 1}</span>}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/85">@{u.username}</span>
              <span className="shrink-0 text-xs text-white/50">
                {value !== null && <span className="mr-1 font-semibold text-white">{value}</span>}
                {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
