import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Archive, Link2, Loader2, X, Instagram, ExternalLink, Copy, RefreshCw, Search } from "lucide-react";
import {
  getPostMappings, createPostMapping, updatePostMapping, archivePostMapping, deletePostMapping, getInstagramMedia, syncInstagramMedia,
} from "../services/automation-service";
import { fetchJobs } from "../../../lib/jobs";
import type { Job } from "../../../lib/firebase";
import type { PostMapping } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";
import { StatusBadge } from "../components/status-badge";

export function PostMappingPage() {
  const qc = useQueryClient();
  const { data: mappings, isLoading } = useQuery({ queryKey: ["automation", "mappings"], queryFn: getPostMappings });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: instagramMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ["automation", "instagram-media"],
    queryFn: () => getInstagramMedia(50),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const [editing, setEditing] = useState<PostMapping | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PostMapping | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<PostMapping | null>(null);

  const filtered = useMemo(() => {
    let list = mappings ?? [];
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((m) => `${m.companyName} ${m.jobTitle} ${m.mediaId}`.toLowerCase().includes(t));
    }
    return list;
  }, [mappings, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["automation", "mappings"] });

  const refreshInstagramMedia = async () => {
    try {
      await syncInstagramMedia(50);
      await qc.invalidateQueries({ queryKey: ["automation", "instagram-media"] });
      toast.success("Instagram posts refreshed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doArchive = async () => {
    if (!confirmArchive) return;
    try {
      await archivePostMapping(confirmArchive.id);
      toast.success("Mapping archived");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmArchive(null);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePostMapping(confirmDelete.id);
      toast.success("Mapping deleted");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Post Mapping</h1>
          <p className="mt-1 text-sm text-white/50">Link each Instagram post to the job it should deliver.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshInstagramMedia} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
            <RefreshCw className="h-4 w-4" /> Refresh Posts
          </button>
          <button onClick={() => setEditing("new")} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>
      </div>

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by company, job title, media ID…"
          filters={
            <div className="flex gap-1.5">
              {(["all", "active", "archived"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                    statusFilter === s
                      ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          }
        />
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : paged.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No post mappings yet"
            description="Create one to link an Instagram post to a job."
            action={
              <button onClick={() => setEditing("new")} className="btn-ghost-glow mt-2 rounded-xl px-4 py-2 text-sm">
                Create mapping
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Media ID</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Mapped Job</th>
                  <th className="px-4 py-3 font-medium">Verify</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paged.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const media = instagramMedia?.find((item) => item.id === m.mediaId);
                          return media?.thumbnailUrl || media?.mediaUrl ? (
                            <img
                              src={media.thumbnailUrl ?? media.mediaUrl ?? ""}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10">
                              <Instagram className="h-4 w-4 text-white/40" />
                            </div>
                          );
                        })()}
                        <div className="max-w-[180px] truncate text-xs text-white/70">
                          {instagramMedia?.find((item) => item.id === m.mediaId)?.caption || m.jobTitle || "Instagram post"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-white/60">{m.mediaId}</td>
                    <td className="px-4 py-3 text-white/80">{m.companyName}</td>
                    <td className="px-4 py-3 text-white/80">{m.jobTitle}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 ring-1 ring-white/10">{m.jobId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <a
                          href={m.instagramPostUrl || undefined}
                          target="_blank" rel="noreferrer"
                          aria-label="Open Instagram post"
                          className={`btn-ghost-glow rounded-lg p-1.5 ${!m.instagramPostUrl ? "pointer-events-none opacity-30" : ""}`}
                        >
                          <Instagram className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`/jobs/${m.jobId}`}
                          target="_blank" rel="noreferrer"
                          aria-label="Open job detail page"
                          className="btn-ghost-glow rounded-lg p-1.5"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={jobs?.find((j) => j.id === m.jobId)?.applyLink || undefined}
                          target="_blank" rel="noreferrer"
                          aria-label="Open official apply link"
                          className={`btn-ghost-glow rounded-lg p-1.5 ${!jobs?.find((j) => j.id === m.jobId)?.applyLink ? "pointer-events-none opacity-30" : ""}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={m.status} tone={m.status === "active" ? "success" : "neutral"} />
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditing(m)} className="btn-ghost-glow rounded-lg p-2" aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {m.status === "active" && (
                          <button onClick={() => setConfirmArchive(m)} className="btn-ghost-glow rounded-lg p-2" aria-label="Archive">
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(m)}
                          className="btn-ghost-glow rounded-lg p-2 hover:!border-red-500/30 hover:!bg-red-500/10 hover:!text-red-300"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PaginationBar page={page} totalPages={totalPages} totalItems={filtered.length} perPage={perPage} onPageChange={setPage} />
      </div>

      {editing && (
        <MappingDialog
          mapping={editing === "new" ? null : editing}
          jobs={jobs ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}

      {confirmArchive && (
        <ConfirmDialog
          icon={Archive}
          title="Archive this mapping?"
          description={`"${confirmArchive.jobTitle}" at ${confirmArchive.companyName} will stop delivering via automation, but the record is kept.`}
          confirmLabel="Archive"
          onCancel={() => setConfirmArchive(null)}
          onConfirm={doArchive}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          icon={Trash2}
          danger
          title="Delete this mapping?"
          description={`This permanently removes the link between this Instagram post and "${confirmDelete.jobTitle}". This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function MappingDialog({
  mapping,
  jobs,
  onClose,
  onSaved,
}: {
  mapping: PostMapping | null;
  jobs: Job[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { data: media = [], isLoading: mediaLoading } = useQuery({
    queryKey: ["automation", "instagram-media"],
    queryFn: () => getInstagramMedia(50),
  });

  const [mediaId, setMediaId] = useState(mapping?.mediaId ?? "");
  const [instagramPostUrl, setInstagramPostUrl] = useState(mapping?.instagramPostUrl ?? "");
  const [jobId, setJobId] = useState(mapping?.jobId ?? "");
  const [mediaSearch, setMediaSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const selectedMedia = media.find((item) => item.id === mediaId);
  const jobDetailUrl =
    jobId && typeof window !== "undefined"
      ? `${window.location.origin}/jobs/${jobId}`
      : "";
  const officialApplyUrl = selectedJob?.applyLink ?? "";

  const availableMedia = media.filter((item) => {
    if (!mediaSearch.trim()) return true;
    const q = mediaSearch.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      (item.caption ?? "").toLowerCase().includes(q) ||
      (item.permalink ?? "").toLowerCase().includes(q)
    );
  });

  const selectMedia = (id: string) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;
    setMediaId(item.id);
    setInstagramPostUrl(item.permalink ?? "");
  };

  const submit = async () => {
    if (!mediaId.trim() || !jobId) {
      toast.error("Instagram post and job are required");
      return;
    }

    if (!instagramPostUrl.trim()) {
      toast.error("Selected Instagram post has no permalink");
      return;
    }

    setBusy(true);
    try {
      const jobRef = selectedJob ?? {
        role: mapping?.jobTitle ?? "",
        companyName: mapping?.companyName ?? "",
      };

      if (mapping) {
        await updatePostMapping(mapping.id, {
          mediaId: mapping.mediaId,
          instagramPostUrl: instagramPostUrl.trim(),
          jobId,
          jobTitle: jobRef.role,
          companyName: jobRef.companyName,
        });
        toast.success("Mapping updated");
      } else {
        await createPostMapping({
          channel: "instagram",
          mediaId: mediaId.trim(),
          instagramPostUrl: instagramPostUrl.trim(),
          thumbnailUrl: selectedMedia?.thumbnailUrl ?? selectedMedia?.mediaUrl ?? "",
          jobId,
          jobTitle: jobRef.role,
          companyName: jobRef.companyName,
        });
        toast.success("Mapping created");
      }

      await qc.invalidateQueries({ queryKey: ["automation", "mappings"] });
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";
  const readonlyInput =
    "w-full truncate rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/60 ring-1 ring-white/5";

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong my-8 w-full max-w-2xl rounded-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mapping ? "Edit mapping" : "New post mapping"}
            </h2>
            <p className="mt-1 text-xs text-white/40">
              {mapping
                ? "The Instagram media identity is locked to prevent rule mismatches."
                : "Select an Instagram post. Media ID and permalink are filled automatically."}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost-glow rounded-lg p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {!mapping && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-white/60">
                  Instagram posts
                </label>
                <span className="text-[11px] text-white/30">
                  {media.length} available
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Search caption, media ID or URL..."
                  className={`${input} pl-9`}
                />
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {mediaLoading ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    Loading Instagram posts...
                  </div>
                ) : availableMedia.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    No Instagram posts found. Use Refresh Posts first.
                  </div>
                ) : (
                  availableMedia.map((item) => {
                    const selected = item.id === mediaId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectMedia(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${
                          selected
                            ? "bg-[#00e5ff]/10 ring-1 ring-[#00e5ff]/30"
                            : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/5"
                        }`}
                      >
                        {item.thumbnailUrl || item.mediaUrl ? (
                          <img
                            src={item.thumbnailUrl ?? item.mediaUrl ?? ""}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5">
                            <Instagram className="h-5 w-5 text-white/30" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {item.caption?.split("\n")[0] || "Instagram post"}
                          </p>
                          <p className="mt-1 truncate font-mono text-[10px] text-white/35">
                            {item.id}
                          </p>
                          <p className="truncate text-[10px] text-white/35">
                            {item.permalink || "No permalink"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-white/50">
              Instagram media ID
            </label>
            <input
              value={mediaId}
              readOnly
              className={readonlyInput}
              placeholder="Select an Instagram post"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-white/50">
              Instagram Post URL
            </label>
            <div className="flex gap-1.5">
              <div className={readonlyInput}>{instagramPostUrl || "Select an Instagram post"}</div>
              {instagramPostUrl && (
                <a
                  href={instagramPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost-glow shrink-0 rounded-xl p-2.5"
                  aria-label="Open Instagram post"
                >
                  <Instagram className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-white/50">Linked job</label>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={input}>
              <option value="" className="bg-[#111827]">
                Select a job
              </option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id} className="bg-[#111827]">
                  {j.role} — {j.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-white/10 p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-white/40">
              Verification
            </p>
            <div className="space-y-2.5">
              <div>
                <label className="mb-1 block text-xs text-white/50">Job Detail URL</label>
                <div className="flex gap-1.5">
                  <div className={readonlyInput}>
                    {jobDetailUrl || "Select a job to preview the link"}
                  </div>
                  {jobDetailUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => copy(jobDetailUrl)}
                        className="btn-ghost-glow shrink-0 rounded-xl p-2.5"
                        aria-label="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={jobDetailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost-glow shrink-0 rounded-xl p-2.5"
                        aria-label="Open"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/50">Official Apply URL</label>
                <div className="flex gap-1.5">
                  <div className={readonlyInput}>
                    {officialApplyUrl || "Select a job to preview the link"}
                  </div>
                  {officialApplyUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => copy(officialApplyUrl)}
                        className="btn-ghost-glow shrink-0 rounded-xl p-2.5"
                        aria-label="Copy"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={officialApplyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost-glow shrink-0 rounded-xl p-2.5"
                        aria-label="Open"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {mapping ? "Save changes" : "Create mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  icon: Icon,
  title,
  description,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  icon: typeof Trash2;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong w-full max-w-md rounded-2xl p-6 animate-scale-in">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 ${danger ? "bg-red-500/20 ring-red-500/40" : "bg-[#00e5ff]/20 ring-[#00e5ff]/30"}`}>
          <Icon className={`h-5 w-5 ${danger ? "text-red-400" : "text-[#00e5ff]"}`} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/60">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost-glow rounded-xl px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-[#00e5ff] text-[#050816] hover:bg-[#22d3ee]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
