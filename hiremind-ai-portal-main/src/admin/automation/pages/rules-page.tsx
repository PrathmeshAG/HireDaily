import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Save, X, ListChecks, Clock, MessageSquare, Send as SendIcon, FlaskConical,
} from "lucide-react";
import { getRules, getPostMappings, getTemplates, createRule, updateRule, deleteRule } from "../services/automation-service";
import { fetchJobs } from "../../../lib/jobs";
import type { AutomationRule, MatchType, ReplyMode, RuleMode } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { SortSelect } from "../components/sort-select";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { ModalPortal } from "../components/modal-portal";
import { SimulatorDialog } from "../components/simulator-dialog";
import { UnmatchedPanel } from "../components/unmatched-panel";
import { RulesArt, EmptyArt } from "../components/illustrations";
import { StatusBadge } from "../components/status-badge";
import { ConfirmDialog } from "./post-mapping-page";
import { SearchablePicker } from "../components/searchable-picker";

const REPLY_MODE_LABEL: Record<ReplyMode, string> = {
  comment_only: "Comment Only",
  dm_only: "DM Only",
  comment_and_dm: "Comment + DM",
};

/** Local date <-> input[type=date] helpers. End dates run to the end of that day. */
function toDateInput(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function fromDateInput(value: string, endOfDay: boolean): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}
const shortDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Schedule badge for a rule card: expired / ends soon / starts later. */
function scheduleBadge(rule: { activeFrom: number | null; activeUntil: number | null }): { text: string; tone: string } | null {
  const now = Date.now();
  if (rule.activeUntil && rule.activeUntil < now) return { text: `Expired ${shortDate(rule.activeUntil)}`, tone: "bg-rose-500/10 text-rose-300 ring-rose-500/25" };
  if (rule.activeFrom && rule.activeFrom > now) return { text: `Starts ${shortDate(rule.activeFrom)}`, tone: "bg-[#00e5ff]/10 text-[#7DF9FF] ring-[#00e5ff]/25" };
  if (rule.activeUntil) {
    const days = Math.ceil((rule.activeUntil - now) / 86400000);
    return { text: days <= 1 ? "Ends today" : `Ends ${shortDate(rule.activeUntil)} (${days}d)`, tone: days <= 3 ? "bg-amber-500/10 text-amber-300 ring-amber-500/25" : "bg-white/5 text-white/60 ring-white/10" };
  }
  return null;
}

const REPLY_MODE_HELP: Record<ReplyMode, string> = {
  comment_only: "Public reply under the comment. No DM.",
  dm_only: "Private DM only. No public reply.",
  comment_and_dm: "Public reply and a private DM.",
};

const COOLDOWN_PRESETS = [
  { label: "None", minutes: 0 },
  { label: "1 hour", minutes: 60 },
  { label: "24 hours", minutes: 1440 },
  { label: "7 days", minutes: 10080 },
];

function cooldownText(m: number): string {
  if (m <= 0) return "with no cooldown";
  if (m % 1440 === 0) return `once every ${m / 1440} day${m === 1440 ? "" : "s"} per person`;
  if (m % 60 === 0) return `once every ${m / 60} hour${m === 60 ? "" : "s"} per person`;
  return `once every ${m} minutes per person`;
}

type RuleSort = "newest" | "oldest" | "updated" | "active" | "inactive" | "keyword";
const RULE_SORTS: { value: RuleSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "active", label: "Active first" },
  { value: "inactive", label: "Inactive first" },
  { value: "keyword", label: "Keyword A to Z" },
];

export function RulesPage() {
  const qc = useQueryClient();
  const { data: rules, isLoading } = useQuery({ queryKey: ["automation", "rules"], queryFn: getRules });
  const { data: mappings } = useQuery({ queryKey: ["automation", "mappings"], queryFn: getPostMappings });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: templates } = useQuery({ queryKey: ["automation", "templates"], queryFn: getTemplates });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<RuleSort>("newest");
  const [editing, setEditing] = useState<AutomationRule | "new" | null>(null);
  const [simulating, setSimulating] = useState(false);
  // Keywords to pre-fill when a rule is started from an unmatched comment.
  const [prefillKeywords, setPrefillKeywords] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AutomationRule | null>(null);

  const filtered = useMemo(() => {
    let list = rules ?? [];
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((r) => r.keywords.join(" ").toLowerCase().includes(t));
    }
    const sorted = [...list];
    switch (sortBy) {
      case "oldest": sorted.sort((a, b) => a.createdAt - b.createdAt); break;
      case "updated": sorted.sort((a, b) => b.updatedAt - a.updatedAt); break;
      case "active": sorted.sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt); break;
      case "inactive": sorted.sort((a, b) => Number(a.active) - Number(b.active) || b.createdAt - a.createdAt); break;
      case "keyword": sorted.sort((a, b) => (a.keywords[0] ?? "~").toLowerCase().localeCompare((b.keywords[0] ?? "~").toLowerCase())); break;
      default: sorted.sort((a, b) => b.createdAt - a.createdAt);
    }
    return sorted;
  }, [rules, search, sortBy]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["automation", "rules"] });

  const toggleActive = async (rule: AutomationRule) => {
    try {
      await updateRule(rule.id, { active: !rule.active });
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteRule(confirmDelete.id);
      toast.success("Rule deleted");
      invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const templateName = (id: string | null) => templates?.find((t) => t.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Automation Rules"
        subtitle="Keyword triggers that fire a comment reply and/or a DM with the mapped job links."
        art={<RulesArt />}
        actions={
          <>
            <button onClick={() => { setPrefillKeywords(""); setEditing("new"); }} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
              <Plus className="h-4 w-4" /> Create rule
            </button>
            <button onClick={() => setSimulating(true)} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
              <FlaskConical className="h-4 w-4" /> Test a comment
            </button>
          </>
        }
      />

      <UnmatchedPanel onCreateRule={(kw) => { setPrefillKeywords(kw); setEditing("new"); }} />

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by keyword…"
          sort={<SortSelect value={sortBy} onChange={setSortBy} options={RULE_SORTS} />}
        />

        {isLoading ? (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer-loading h-40 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} art={<EmptyArt kind="rules" />} title="No rules yet" description="Create a rule to start auto-replying to comments." action={<button onClick={() => setEditing("new")} className="btn-ghost-glow mt-2 rounded-xl px-4 py-2 text-sm">Create rule</button>} />
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {filtered.map((rule) => (
              <div key={rule.id} className="glass card-glow rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {rule.keywords.map((k) => (
                      <span key={k} className="rounded-lg bg-gradient-to-br from-[#00e5ff]/10 to-[#7c3aed]/10 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/10">
                        {k}
                      </span>
                    ))}
                  </div>
                  <StatusBadge label={rule.active ? "active" : "paused"} tone={rule.active ? "success" : "neutral"} />
                </div>

                <p className="mt-3 text-xs text-white/50">
                  {rule.matchType === "exact" ? "Exact match" : "Contains"} ·{" "}
                  {rule.scope === "all_posts" ? "All posts" : rule.postLabel ?? "Specific post"}
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-[#22d3ee]" />
                    Comment: <span className="text-white/90">{templateName(rule.commentTemplateId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SendIcon className="h-3.5 w-3.5 text-[#22d3ee]" />
                    DM: <span className="text-white/90">{templateName(rule.dmTemplateId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-[#22d3ee]" />
                    Cooldown: <span className="text-white/90">{rule.cooldownMinutes} min</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/60 ring-1 ring-white/10">
                      {REPLY_MODE_LABEL[rule.replyMode]}
                    </span>
                    {(rule.commentTemplateIds?.length ?? 0) > 0 && (
                      <span className="rounded-md bg-[#7c3aed]/15 px-2 py-1 text-[11px] text-[#c4b5fd] ring-1 ring-[#7c3aed]/25" title="One of these comment templates is picked at random">
                        {(rule.commentTemplateIds?.length ?? 0) + 1} reply variations
                      </span>
                    )}
                    {(() => {
                      const b = scheduleBadge(rule);
                      return b ? <span className={`rounded-md px-2 py-1 text-[11px] ring-1 ${b.tone}`}>{b.text}</span> : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleActive(rule)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${rule.active ? "bg-[#00e5ff]" : "bg-white/15"}`}
                      aria-label="Toggle active"
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${rule.active ? "left-4" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => setEditing(rule)} className="btn-ghost-glow rounded-lg p-2" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(rule)}
                      className="btn-ghost-glow rounded-lg p-2 hover:!border-red-500/30 hover:!bg-red-500/10 hover:!text-red-300"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {simulating && (
        <SimulatorDialog
          mappings={((mappings ?? []).map((m) => {
            const job = jobs?.find((j) => j.id === m.jobId);
            return { ...m, companyName: job?.companyName ?? m.companyName, jobTitle: job?.role ?? m.jobTitle };
          }))}
          keywordHints={Array.from(new Set((rules ?? []).flatMap((r) => r.keywords)))}
          onClose={() => setSimulating(false)}
        />
      )}

      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          initialKeywords={editing === "new" ? prefillKeywords : undefined}
          mappings={((mappings ?? []).map((m) => {
            const job = jobs?.find((j) => j.id === m.jobId);
            return { ...m, companyName: job?.companyName ?? m.companyName, jobTitle: job?.role ?? m.jobTitle };
          }))}
          templates={templates ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          icon={Trash2}
          danger
          title="Delete this rule?"
          description={`The rule for "${confirmDelete.keywords.join(", ")}" will stop triggering. This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function RuleDialog({
  rule,
  mappings,
  templates,
  initialKeywords,
  onClose,
  onSaved,
}: {
  rule: AutomationRule | null;
  mappings: { id: string; jobTitle: string; companyName: string; createdAt?: number; status?: string; extraLinks?: unknown[] }[];
  templates: { id: string; kind: "comment" | "dm"; name: string }[];
  /** Pre-fills the keyword field (used when creating a rule from an unmatched comment). */
  initialKeywords?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
const [mode, setMode] = useState<RuleMode>(rule?.mode ?? "keyword");
  const [keywords, setKeywords] = useState(rule?.keywords.join(", ") ?? initialKeywords ?? "");
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? "contains");
  const [scope, setScope] = useState<"all_posts" | "specific_post">(rule?.scope ?? "all_posts");
  const [postId, setPostId] = useState(rule?.postId ?? "");
  const [commentTemplateId, setCommentTemplateId] = useState(rule?.commentTemplateId ?? "");
  const [dmTemplateId, setDmTemplateId] = useState(rule?.dmTemplateId ?? "");
  const [replyMode, setReplyMode] = useState<ReplyMode>(rule?.replyMode ?? "comment_and_dm");
  const [cooldownMinutes, setCooldownMinutes] = useState(rule?.cooldownMinutes ?? 1440);
  const [active, setActive] = useState(rule?.active ?? true);
  const [extraCommentIds, setExtraCommentIds] = useState<string[]>(rule?.commentTemplateIds ?? []);
  const [startDate, setStartDate] = useState(toDateInput(rule?.activeFrom));
  const [endDate, setEndDate] = useState(toDateInput(rule?.activeUntil));
  const [busy, setBusy] = useState(false);

  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEndDate(toDateInput(d.getTime()));
  };

  // Latest mapped posts first; archived ones are hidden unless already selected.
  const postItems = [...mappings]
    .filter((m) => m.status !== "archived" || m.id === postId)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .map((m, i) => ({
      id: m.id,
      title: `${m.jobTitle || "Untitled job"} — ${m.companyName || "Unknown company"}`,
      subtitle: m.extraLinks && m.extraLinks.length > 0 ? `${m.extraLinks.length + 1} links in DM` : undefined,
      searchText: m.id,
      badge: i < 3 ? "Latest" : undefined,
    }));
  const kwPreview = keywords.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);
  const summary =
    `When someone comments ${mode === "keyword" ? (kwPreview.length ? kwPreview.join(" or ") : "a keyword") : "anything"} ` +
    `${scope === "specific_post" ? "on the selected post" : "on any mapped post"}, ` +
    `${replyMode === "comment_only" ? "reply publicly" : replyMode === "dm_only" ? "send a DM" : "reply publicly and send a DM"} ` +
    `${cooldownText(cooldownMinutes)}${endDate ? `, until ${shortDate(fromDateInput(endDate, true) ?? Date.now())}` : ""}.`;
  const commentTemplates = templates.filter((t) => t.kind === "comment");
  const dmTemplates = templates.filter((t) => t.kind === "dm");

const submit = async () => {
    const kws = keywords.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);
    if (mode === "keyword" && kws.length === 0) {
      toast.error("Add at least one keyword");
      return;
    }
    if (scope === "specific_post" && !postId) {
      toast.error("Pick the post this rule should apply to");
      return;
    }
    if (replyMode !== "dm_only" && !commentTemplateId) {
      toast.error("This reply type posts a public comment. Choose a comment template.");
      return;
    }
    if (replyMode !== "comment_only" && !dmTemplateId) {
      toast.error("This reply type sends a DM. Choose a DM template.");
      return;
    }
    const activeFrom = fromDateInput(startDate, false);
    const activeUntil = fromDateInput(endDate, true);
    if (activeFrom && activeUntil && activeUntil < activeFrom) {
      toast.error("The end date must be on or after the start date");
      return;
    }
    setBusy(true);
    try {
      // For specific_post rules, the post must be selected by its real
      // Instagram mediaId (== mapping.id), NOT a synthetic map id.
      const mapping = mappings.find((m) => m.id === postId);
      const payload = {
        channel: "instagram" as const,
        mode,
        keywords: kws,
        matchType,
        scope,
        postId: scope === "specific_post" ? postId || null : null,
        postLabel: scope === "specific_post" && mapping ? `${mapping.jobTitle} — ${mapping.companyName}` : null,
        commentTemplateId: commentTemplateId || null,
        commentTemplateIds: extraCommentIds.filter((id) => id !== commentTemplateId && commentTemplates.some((t) => t.id === id)),
        dmTemplateId: dmTemplateId || null,
        replyMode,
        cooldownMinutes,
        activeFrom,
        activeUntil,
        active,
      };
      if (rule) {
        await updateRule(rule.id, payload);
        toast.success("Rule updated");
      } else {
        await createRule(payload);
        toast.success("Rule created");
      }
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";
  const label = "mb-1.5 block text-xs text-white/50";

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong mx-auto my-2 w-full max-w-3xl sm:my-8 rounded-2xl p-5 md:p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{rule ? "Edit rule" : "New automation rule"}</h2>
          <button onClick={onClose} className="btn-ghost-glow rounded-lg p-1.5"><X className="h-4 w-4" /></button>
        </div>

<div className="mt-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={label}>Mode</label>
              <div className="grid grid-cols-2 gap-2">
              {(["keyword", "any_comment"] as RuleMode[]).map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 transition ${
                    mode === m
                      ? "bg-gradient-to-r from-[#00e5ff]/15 to-[#7c3aed]/15 text-white ring-[#00e5ff]/40"
                      : "text-white/70 ring-white/10 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="h-3.5 w-3.5 accent-[#00e5ff]"
                  />
                  {m === "keyword" ? "Keyword" : "Any comment"}
                </label>
              ))}
              </div>
            </div>

            <div>
              <label className={label}>Match type</label>
              <select value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)} className={input}>
                <option value="contains" className="bg-[#111827]">Contains</option>
                <option value="exact" className="bg-[#111827]">Exact match</option>
              </select>
            </div>
          </div>

          {mode === "keyword" && (
            <div>
              <label className={label}>Keywords (comma-separated)</label>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="JOB, DA, DATA, SQL" className={input} />
            </div>
          )}

          <div>
            <label className={label}>Scope</label>
              <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={input}>
                <option value="all_posts" className="bg-[#111827]">All posts</option>
                <option value="specific_post" className="bg-[#111827]">Specific post</option>
              </select>
          </div>

          {scope === "specific_post" && (
            <div>
              <label className={label}>Post</label>
              <SearchablePicker
                items={postItems}
                value={postId}
                onChange={setPostId}
                placeholder="Select a mapped post"
                searchPlaceholder="Search job, company or media ID…"
                emptyText="No mapped post matches. Create one in Post Mapping first."
              />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={label}>Comment template</label>
              <select value={commentTemplateId} onChange={(e) => setCommentTemplateId(e.target.value)} className={input}>
                <option value="" className="bg-[#111827]">None</option>
                {commentTemplates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#111827]">{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>DM template</label>
              <select value={dmTemplateId} onChange={(e) => setDmTemplateId(e.target.value)} className={input}>
                <option value="" className="bg-[#111827]">None</option>
                {dmTemplates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#111827]">{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {replyMode !== "dm_only" && commentTemplates.filter((t) => t.id !== commentTemplateId).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <p className="text-xs font-medium text-white/80">Reply variations <span className="font-normal text-white/40">(optional)</span></p>
              <p className="mt-0.5 text-[11px] text-white/40">Pick extra comment templates. One of them (or the main one) is chosen at random for each reply, so replies do not all look identical.</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {commentTemplates.filter((t) => t.id !== commentTemplateId).map((t) => {
                  const on = extraCommentIds.includes(t.id);
                  const full = !on && extraCommentIds.length >= 4;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={full}
                      aria-pressed={on}
                      onClick={() => setExtraCommentIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}
                      className={`rounded-lg px-2.5 py-1.5 text-xs ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        on ? "bg-[#7c3aed]/20 text-white ring-[#7c3aed]/40" : "bg-white/5 text-white/65 ring-white/10 hover:text-white"
                      }`}
                    >
                      {on ? "✓ " : ""}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <p className="text-xs font-medium text-white/80">Schedule <span className="font-normal text-white/40">(optional)</span></p>
            <p className="mt-0.5 text-[11px] text-white/40">The rule only fires between these dates, so a job&apos;s last-date post stops replying by itself.</p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>End date (inclusive)</label>
                <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={input} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" onClick={() => addDays(d)} className="rounded-md px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10 transition hover:text-white">
                  Ends in {d} days
                </button>
              ))}
              <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} className="rounded-md px-2 py-1 text-[11px] text-white/55 ring-1 ring-white/10 transition hover:text-white">
                No schedule
              </button>
            </div>
          </div>

          <div>
            <label className={label}>Reply Type</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["comment_only", "dm_only", "comment_and_dm"] as ReplyMode[]).map((rm) => (
                <label
                  key={rm}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1 transition ${
                    replyMode === rm
                      ? "bg-gradient-to-r from-[#00e5ff]/15 to-[#7c3aed]/15 text-white ring-[#00e5ff]/40"
                      : "text-white/70 ring-white/10 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="replyMode"
                    value={rm}
                    checked={replyMode === rm}
                    onChange={() => setReplyMode(rm)}
                    className="h-3.5 w-3.5 accent-[#00e5ff]"
                  />
                  <span>
                    <span className="block">{REPLY_MODE_LABEL[rm]}</span>
                    <span className="block text-[10px] font-normal text-white/40">{REPLY_MODE_HELP[rm]}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className={label}>Cooldown (minutes)</label>
              <input
                type="number" min={0} value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Math.max(0, Number(e.target.value) || 0))}
                className={input}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COOLDOWN_PRESETS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setCooldownMinutes(c.minutes)}
                    className={`rounded-md px-2 py-1 text-[11px] ring-1 transition ${
                      cooldownMinutes === c.minutes ? "bg-[#00e5ff]/15 text-white ring-[#00e5ff]/30" : "text-white/55 ring-white/10 hover:text-white"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2.5 rounded-xl bg-white/[0.025] px-3.5 text-sm text-white/80 ring-1 ring-white/10">

            <button
              type="button"
              onClick={() => setActive((a) => !a)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? "bg-[#00e5ff]" : "bg-white/15"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${active ? "left-4" : "left-0.5"}`} />
            </button>
            Rule active
          </label>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#00e5ff]/15 bg-[#00e5ff]/[0.04] px-4 py-3 text-xs leading-relaxed text-white/70">
          <span className="mr-1.5 font-medium text-[#7DF9FF]">In plain words:</span>{summary}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {rule ? "Save changes" : "Create rule"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
