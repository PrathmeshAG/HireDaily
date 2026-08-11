import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users as UsersIcon } from "lucide-react";
import { getUsers } from "../services/automation-service";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";
import { StatusBadge } from "../components/status-badge";
import { timeAgo } from "./logs-page";
import type { FollowStatus } from "../types";

const FOLLOW_LABEL: Record<FollowStatus, string> = {
  follower: "Follower",
  not_follower: "Not following",
  unknown: "Unknown",
};

export function UsersPage() {
  const { data: users, isLoading } = useQuery({ queryKey: ["automation", "users"], queryFn: getUsers });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    const list = users ?? [];
    if (!search) return list;
    return list.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Users</h1>
      <p className="mt-1 text-sm text-white/50">Everyone who's triggered an automation, most recent first.</p>

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by username…" />

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : paged.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users yet" description="Users will appear here once automations start triggering." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Comments</th>
                  <th className="px-4 py-3 font-medium">DMs</th>
                  <th className="px-4 py-3 font-medium">Follow status</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] text-xs font-bold text-white/70 ring-1 ring-white/10">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <span className="text-white/85">@{u.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{u.commentCount}</td>
                    <td className="px-4 py-3 text-white/70">{u.dmCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={FOLLOW_LABEL[u.followStatus]}
                        tone={u.followStatus === "follower" ? "success" : u.followStatus === "not_follower" ? "warning" : "neutral"}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{timeAgo(u.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar page={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </div>

      <p className="mt-3 text-xs text-white/35">
        Follow status reflects the latest persisted Follow Verification result for each user.
      </p>
    </div>
  );
}
