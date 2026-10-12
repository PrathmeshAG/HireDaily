import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Archive, Link2, Loader2, X, Instagram, ExternalLink, Copy, RefreshCw, Search } from "lucide-react";
import {
  getPostMappings, createPostMapping, updatePostMapping, archivePostMapping, deletePostMapping, getInstagramMedia, syncInstagramMedia,
} from "../services/automation-service";
import { fetchJobs } from "../../../lib/jobs";
import type { Job } from "../../../lib/firebase";
import type { PostMapping, ExtraLink } from "../types";
import { MAX_TOTAL_LINKS } from "../types";
import { SearchablePicker } from "../components/searchable-picker";
import { TableToolbar } from "../components/table-toolbar";
import { SortSelect } from "../components/sort-select";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { ModalPortal } from "../components/modal-portal";
import { DmPreview, namesBlock } from "../components/dm-preview";
import { MappingArt, EmptyArt } from "../components/illustrations";
import { TableSkeleton } from "../components/table-skeleton";
import { PaginationBar } from "../components/pagination-bar";
import { StatusBadge } from "../components/status-badge";
import { getJobPath } from "../../../lib/job-url";

type MappingSort = "newest" | "oldest" | "az" | "za" | "links" | "active";
const MAPPING_SORTS: { value: MappingSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "Job A to Z" },
  { value: "za", label: "Job Z to A" },
  { value: "links", label: "Most links" },
  { value: "active", label: "Active first" },
];

export function PostMappingPage() {
  const qc = useQueryClient();
  const { data: mappings, isLoading } = useQuery({ queryKey: ["automation", "mappings"], queryFn: getPostMappings });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: instagramMedia, isLoading: mediaLoading } = useQuery({
    queryKey: ["automation", "instagram-media"],
    queryFn: async () => {
      const cached = await getInstagramMedia(50);
      if (cached.length > 0) return cached;
      return syncInstagramMedia(50);
    },
    retry: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<MappingSort>("newest");
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
    // Newest first by default (the API returns oldest first).
    const name = (m: PostMapping) => (m.jobTitle || m.companyName || "").toLowerCase();
    const sorted = [...list];
    switch (sortBy) {
      case "oldest": sorted.sort((a, b) => a.createdAt - b.createdAt); break;
      case "az": sorted.sort((a, b) => name(a).localeCompare(name(b))); break;
      case "za": sorted.sort((a, b) => name(b).localeCompare(name(a))); break;
      case "links": sorted.sort((a, b) => (b.extraLinks?.length ?? 0) - (a.extraLinks?.length ?? 0) || b.createdAt - a.createdAt); break;
      case "active": sorted.sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || b.createdAt - a.createdAt); break;
      default: sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  }, [mappings, statusFilter, search, sortBy]);

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
      <PageHeader
        title="Post Mapping"
        subtitle="Link each Instagram post to the job (or up to 5 links) it should deliver in the DM."
        art={<MappingArt />}
        actions={
          <>
            <button onClick={refreshInstagramMedia} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
              <RefreshCw className="h-4 w-4" /> Refresh Posts
            </button>
            <button onClick={() => setEditing("new")} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
              <Plus className="h-4 w-4" /> Create
            </button>
          </>
        }
      />

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by company, job title, media ID…"
          sort={<SortSelect value={sortBy} onChange={(v) => { setSortBy(v); setPage(1); }} options={MAPPING_SORTS} />}
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
            art={<EmptyArt kind="link" />}
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
                    <td className="px-4 py-3 text-white/80">{jobs?.find((j) => j.id === m.jobId)?.companyName || m.companyName || "—"}</td>
                    <td className="px-4 py-3 text-white/80">
                      {jobs?.find((j) => j.id === m.jobId)?.role || m.jobTitle || "—"}
                      {jobs && ((m.jobId && !jobs.find((j) => j.id === m.jobId)) || (m.extraLinks ?? []).some((l) => l.type === "job" && !jobs.find((j) => j.id === l.jobId))) && (
                        <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-300 ring-1 ring-rose-500/25" title="A linked job no longer exists. This post cannot send that link until you fix the mapping.">
                          Job removed
                        </span>
                      )}
                      {m.extraLinks && m.extraLinks.length > 0 && (
                        <span className="ml-2 rounded-full bg-[#7c3aed]/20 px-2 py-0.5 text-[10px] text-[#c4b5fd]" title="Extra links sent in the same DM">
                          +{m.extraLinks.length} {m.extraLinks.length === 1 ? "link" : "links"}
                        </span>
                      )}
                    </td>
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
                          href={jobs?.find((j) => j.id === m.jobId) ? getJobPath(jobs.find((j) => j.id === m.jobId)!) : undefined}
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
    queryFn: async () => {
      const cached = await getInstagramMedia(50);
      if (cached.length > 0) return cached;
      return syncInstagramMedia(50);
    },
    retry: 1,
  });

  const [mediaId, setMediaId] = useState(mapping?.mediaId ?? "");
  const [instagramPostUrl, setInstagramPostUrl] = useState(mapping?.instagramPostUrl ?? "");
  const [jobId, setJobId] = useState(mapping?.jobId ?? "");
  const [extraLinks, setExtraLinks] = useState<ExtraLink[]>(mapping?.extraLinks ?? []);
  const [extLabel, setExtLabel] = useState("");
  const [extUrl, setExtUrl] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const selectedMedia = media.find((item) => item.id === mediaId);
  const jobDetailUrl = jobId && typeof window !== "undefined" ? `${window.location.origin}${selectedJob ? getJobPath(selectedJob) : `/jobs/${encodeURIComponent(jobId)}`}` : "";
  const officialApplyUrl = selectedJob?.applyLink ?? "";

  // Latest jobs first; the picker puts the search box on top of this list.
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [jobs],
  );
  const jobItems = useMemo(
    () => sortedJobs.map((j, i) => ({
      id: j.id,
      title: `${j.role} — ${j.companyName}`,
      subtitle: j.location || undefined,
      searchText: `${j.id} ${j.location ?? ""}`,
      badge: i < 3 ? "Latest" : undefined,
    })),
    [sortedJobs],
  );
  const jobLabel = (id: string) => {
    const j = jobs.find((x) => x.id === id);
    return j ? `${j.role} - ${j.companyName}` : id;
  };
  // The primary job is optional. A mapping needs at least one link in total.
  const totalLinks = (jobId ? 1 : 0) + extraLinks.length;
  const canAddMore = totalLinks < MAX_TOTAL_LINKS;

  const addExtraJob = (id: string) => {
    if (!id || !canAddMore) return;
    if (id === jobId || extraLinks.some((l) => l.type === "job" && l.jobId === id)) {
      toast.error("This job is already added");
      return;
    }
    setExtraLinks((l) => [...l, { type: "job", jobId: id, label: null }]);
  };

  const addExternal = () => {
    if (!canAddMore) return;
    const label = extLabel.trim();
    const raw = extUrl.trim();
    let url = "";
    try {
      const u = new URL(raw);
      if ((u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password) url = u.toString();
    } catch { /* invalid */ }
    if (!label) { toast.error("Give the link a name (shown in the DM)"); return; }
    if (!url) { toast.error("Enter a valid http(s) link"); return; }
    if (extraLinks.some((l) => l.type === "external" && l.url === url)) { toast.error("This link is already added"); return; }
    setExtraLinks((l) => [...l, { type: "external", url, label: label.slice(0, 60) }]);
    setExtLabel("");
    setExtUrl("");
  };

  const removeExtra = (index: number) => setExtraLinks((l) => l.filter((_, i) => i !== index));

  const availableMedia = media.filter((item) => {
    if (!mediaSearch.trim()) return true;
    const q = mediaSearch.toLowerCase();
    return item.id.toLowerCase().includes(q) || (item.caption ?? "").toLowerCase().includes(q) || (item.permalink ?? "").toLowerCase().includes(q);
  });

  const selectMedia = (id: string) => {
    const item = media.find((m) => m.id === id);
    if (!item) return;
    setMediaId(item.id);
    setInstagramPostUrl(item.permalink ?? "");
  };

  const submit = async () => {
    if (!mediaId.trim()) {
      toast.error("Select an Instagram post");
      return;
    }
    if (totalLinks === 0) {
      toast.error("Add at least one link: pick a job or paste an external link");
      return;
    }
    if (!instagramPostUrl.trim()) {
      toast.error("Selected Instagram post has no permalink");
      return;
    }

    setBusy(true);
    try {
      // Name shown in lists: the primary job, else the first extra link.
      const firstExtra = extraLinks[0];
      const fallbackName = firstExtra ? (firstExtra.type === "job" ? jobLabel(firstExtra.jobId) : firstExtra.label) : "";
      const jobRef = selectedJob
        ? selectedJob
        : jobId
          ? { role: mapping?.jobTitle ?? "", companyName: mapping?.companyName ?? "" }
          : { role: fallbackName, companyName: "" };
      if (mapping) {
        await updatePostMapping(mapping.id, {
          mediaId: mapping.mediaId,
          instagramPostUrl: instagramPostUrl.trim(),
          jobId,
          jobTitle: jobRef.role,
          companyName: jobRef.companyName,
          extraLinks,
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
          extraLinks,
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

  const input = "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";
  const readonlyInput = "min-w-0 flex-1 truncate rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/60 ring-1 ring-white/5";

  const copy = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong mx-auto my-2 w-full max-w-6xl sm:my-8 rounded-2xl p-5 shadow-2xl animate-scale-in md:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{mapping ? "Edit mapping" : "New post mapping"}</h2>
            <p className="mt-1 text-xs text-white/40">Select the Instagram post and the Hire Daily job. Media ID and permalink are managed automatically.</p>
          </div>
          <button onClick={onClose} className="btn-ghost-glow rounded-lg p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-white/45">Instagram post</p>
                <p className="mt-1 text-sm text-white/70">{mapping ? "Locked media identity" : "Choose from synced posts"}</p>
              </div>
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/40">{media.length} synced</span>
            </div>

            {mapping ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/10">
                {selectedMedia?.thumbnailUrl || selectedMedia?.mediaUrl ? (
                  <img src={selectedMedia.thumbnailUrl ?? selectedMedia.mediaUrl ?? ""} alt="Instagram post" className="h-56 w-full object-cover" />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-gradient-to-br from-white/10 to-white/[0.02]"><Instagram className="h-8 w-8 text-white/25" /></div>
                )}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm text-white">{selectedMedia?.caption?.split("\n")[0] || mapping.jobTitle || "Instagram post"}</p>
                  <p className="mt-1 font-mono text-[10px] text-white/35">{mediaId}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input value={mediaSearch} onChange={(e) => setMediaSearch(e.target.value)} placeholder="Search caption, media ID or URL…" className={`${input} pl-9`} />
                </div>
                <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {mediaLoading ? (
                    <div className="py-12 text-center text-xs text-white/40">Loading Instagram posts…</div>
                  ) : availableMedia.length === 0 ? (
                    <div className="py-12 text-center text-xs text-white/40">No Instagram posts found. Use Refresh Posts first.</div>
                  ) : availableMedia.map((item) => {
                    const selected = item.id === mediaId;
                    return (
                      <button key={item.id} type="button" onClick={() => selectMedia(item.id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${selected ? "bg-[#00e5ff]/10 ring-1 ring-[#00e5ff]/30" : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/5"}`}>
                        {item.thumbnailUrl || item.mediaUrl ? <img src={item.thumbnailUrl ?? item.mediaUrl ?? ""} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5"><Instagram className="h-5 w-5 text-white/30" /></div>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{item.caption?.split("\n")[0] || "Instagram post"}</p>
                          <p className="mt-1 truncate font-mono text-[10px] text-white/35">{item.id}</p>
                          <p className="truncate text-[10px] text-white/35">{item.permalink || "No permalink"}</p>
                        </div>
                        {selected && <span className="rounded-full bg-[#00e5ff]/15 px-2 py-1 text-[10px] text-[#67e8f9]">Selected</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-white/50">Instagram media ID</label>
                <div className={readonlyInput}>{mediaId || "Select an Instagram post"}</div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-white/50">Instagram Post URL</label>
                <div className="flex gap-1.5">
                  <div className={readonlyInput}>{instagramPostUrl || "Select an Instagram post"}</div>
                  {instagramPostUrl && <a href={instagramPostUrl} target="_blank" rel="noreferrer" className="btn-ghost-glow shrink-0 rounded-xl p-2.5" aria-label="Open Instagram post"><Instagram className="h-3.5 w-3.5" /></a>}
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-white/45">Links delivered in the DM</p>
            <p className="mt-1 text-sm text-white/70">Pick a Hire Daily job, or skip it and use only external links. At least one link is needed.</p>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs text-white/50">Hire Daily job <span className="text-white/35">(optional)</span></label>
              <SearchablePicker
                items={jobItems}
                value={jobId}
                onChange={(id) => {
                  setJobId(id);
                  // The primary job can't also be an extra link.
                  setExtraLinks((l) => l.filter((x) => !(x.type === "job" && x.jobId === id)));
                }}
                placeholder="No job selected. Select a job (optional)"
                searchPlaceholder="Search role, company, location…"
                emptyText="No job matches your search"
                allowClear
              />
            </div>

            {selectedJob && (
              <div className="mt-4 rounded-xl bg-gradient-to-r from-[#00e5ff]/10 to-[#7c3aed]/10 p-4 ring-1 ring-white/10">
                <p className="text-xs text-white/40">Selected job</p>
                <p className="mt-1 text-base font-semibold text-white">{selectedJob.role}</p>
                <p className="mt-0.5 text-xs text-white/55">{selectedJob.companyName}{selectedJob.location ? ` · ${selectedJob.location}` : ""}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white/80">{jobId ? "More links in the same DM" : "Links in the DM"}</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${canAddMore ? "bg-white/5 text-white/50" : "bg-amber-500/15 text-amber-300"}`}>{totalLinks}/{MAX_TOTAL_LINKS} links</span>
              </div>
              <p className="mt-1 text-xs text-white/40">Add other Hire Daily jobs or paste any external link. All links go in one DM, one below another, each with its name.</p>

              {extraLinks.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {extraLinks.map((l, i) => (
                    <li key={`${l.type}-${l.type === "job" ? l.jobId : l.url}`} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 ring-1 ring-white/5 animate-scale-in">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[11px] text-white/60">{i + (jobId ? 2 : 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{l.type === "job" ? (l.label || jobLabel(l.jobId)) : l.label}</p>
                        <p className="truncate text-[11px] text-white/40">{l.type === "job" ? "Hire Daily job" : l.url}</p>
                      </div>
                      <button type="button" onClick={() => removeExtra(i)} aria-label="Remove link" className="btn-ghost-glow rounded-lg p-1.5 hover:!border-red-500/30 hover:!bg-red-500/10 hover:!text-red-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {canAddMore ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">Add another job</label>
                    <SearchablePicker
                      items={jobItems.map((it) => ({ ...it, disabled: it.id === jobId || extraLinks.some((l) => l.type === "job" && l.jobId === it.id) }))}
                      value=""
                      onChange={addExtraJob}
                      placeholder="Search and add a job"
                      searchPlaceholder="Search role, company, location…"
                      emptyText="No job matches your search"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-white/50">Or paste an external link</label>
                    <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr_auto]">
                      <input value={extLabel} onChange={(e) => setExtLabel(e.target.value)} maxLength={60} placeholder="Name, e.g. Company careers" className={input} />
                      <input value={extUrl} onChange={(e) => setExtUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExternal(); } }} placeholder="https://…" className={input} />
                      <button type="button" onClick={addExternal} className="btn-ghost-glow flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm"><Plus className="h-4 w-4" /> Add</button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-300/80">Maximum of {MAX_TOTAL_LINKS} links reached. Remove one to add another.</p>
              )}

              {totalLinks > 1 && (() => {
                const labels = [
                  ...(jobId ? [selectedJob ? `${selectedJob.role} - ${selectedJob.companyName}` : "Primary job"] : []),
                  ...extraLinks.map((l) => (l.type === "job" ? (l.label || jobLabel(l.jobId)) : l.label)),
                ];
                const intro = "Hi @username! 🙌 Here are your links 👇";
                // Cards (4-5 links): role as the title, company and location as the subtitle.
                const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } };
                const sub = (company?: string | null, location?: string | null) => [company, location].filter(Boolean).join(" · ");
                const cards = [
                  ...(jobId ? [selectedJob ? { title: selectedJob.role, subtitle: sub(selectedJob.companyName, selectedJob.location) } : { title: "Primary job", subtitle: "" }] : []),
                  ...extraLinks.map((l) => {
                    if (l.type === "external") return { title: l.label, subtitle: hostOf(l.url) };
                    const j = jobs.find((x) => x.id === l.jobId);
                    return { title: j?.role ?? (l.label || l.jobId), subtitle: sub(j?.companyName, j?.location) };
                  }),
                ];
                return (
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] text-white/40">How it looks in the DM (names come from your links)</p>
                    <DmPreview text={`${intro}\n\n${namesBlock(labels)}`} labels={labels} cards={cards} />
                    <p className="mt-2 text-[11px] text-white/35">
                      {totalLinks >= 4 ? "4-5 links go as swipeable cards: the role is the title, company and location the subtitle." : "Each link gets its own button. Tapping a button opens that link."}
                    </p>
                  </div>
                );
              })()}
            </div>

            {!jobId && extraLinks.length > 0 && (
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[11px] leading-relaxed text-white/50">
                No Hire Daily job is selected, so in your templates <code className="rounded bg-black/30 px-1">{"{{company}}"}</code> becomes &ldquo;the company&rdquo; and <code className="rounded bg-black/30 px-1">{"{{location}}"}</code> becomes &ldquo;Online&rdquo;. <code className="rounded bg-black/30 px-1">{"{{title}}"}</code> is the name of your first link. Use the Test a comment button on the Rules page to preview the result.
              </p>
            )}
            {jobId && (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-3">
                <p className="mb-3 text-[11px] uppercase tracking-wider text-white/40">Link verification</p>
                <LinkPreview label="Job Detail URL" value={jobDetailUrl} onCopy={copy} />
                <div className="mt-3"><LinkPreview label="Official Apply URL" value={officialApplyUrl} onCopy={copy} /></div>
              </div>
            )}
          </section>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <p className="text-xs text-white/35">Media ID is the stable automation key. Changing the Instagram post requires a new mapping.</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm">Cancel</button>
            <button onClick={submit} disabled={busy} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {mapping ? "Save changes" : "Create mapping"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function LinkPreview({ label, value, onCopy }: { label: string; value: string; onCopy: (value: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/50">{label}</label>
      <div className="flex gap-1.5">
        <div className="min-w-0 flex-1 truncate rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-xs text-white/60 ring-1 ring-white/5">{value || `Select a job to preview ${label.toLowerCase()}`}</div>
        {value && <>
          <button type="button" onClick={() => onCopy(value)} className="btn-ghost-glow shrink-0 rounded-xl p-2.5" aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5" /></button>
          <a href={value} target="_blank" rel="noreferrer" className="btn-ghost-glow shrink-0 rounded-xl p-2.5" aria-label={`Open ${label}`}><ExternalLink className="h-3.5 w-3.5" /></a>
        </>}
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
    <ModalPortal>
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
    </ModalPortal>
  );
}
