import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Save, X, ListChecks, Clock, MessageSquare, Send as SendIcon,
} from "lucide-react";
import { getRules, getPostMappings, getTemplates, createRule, updateRule, deleteRule } from "../services/automation-service";
import { fetchJobs } from "../../../lib/jobs";
import type { AutomationRule, MatchType, ReplyMode, RuleMode } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { StatusBadge } from "../components/status-badge";
import { ConfirmDialog } from "./post-mapping-page";

const REPLY_MODE_LABEL: Record<ReplyMode, string> = {
  comment_only: "Comment Only",
  dm_only: "DM Only",
  comment_and_dm: "Comment + DM",
};

export function RulesPage() {
  const qc = useQueryClient();
  const { data: rules, isLoading } = useQuery({ queryKey: ["automation", "rules"], queryFn: getRules });
  const { data: mappings } = useQuery({ queryKey: ["automation", "mappings"], queryFn: getPostMappings });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: templates } = useQuery({ queryKey: ["automation", "templates"], queryFn: getTemplates });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AutomationRule | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AutomationRule | null>(null);

  const filtered = useMemo(() => {
    let list = rules ?? [];
    if (search) {
      const t = search.toLowerCase();
      list = list.filter((r) => r.keywords.join(" ").toLowerCase().includes(t));
    }
    return list;
  }, [rules, search]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Automation Rules</h1>
          <p className="mt-1 text-sm text-white/50">Keyword triggers that fire a comment reply and/or DM.</p>
        </div>
        <button onClick={() => setEditing("new")} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> Create rule
        </button>
      </div>

      <div className="glass mt-6 rounded-2xl">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search by keyword…" />

        {isLoading ? (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="shimmer-loading h-40 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListChecks} title="No rules yet" description="Create a rule to start auto-replying to comments." />
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

                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/60 ring-1 ring-white/10">
                    {REPLY_MODE_LABEL[rule.replyMode]}
                  </span>
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

      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
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
  onClose,
  onSaved,
}: {
  rule: AutomationRule | null;
  mappings: { id: string; jobTitle: string; companyName: string }[];
  templates: { id: string; kind: "comment" | "dm"; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
const [mode, setMode] = useState<RuleMode>(rule?.mode ?? "keyword");
  const [keywords, setKeywords] = useState(rule?.keywords.join(", ") ?? "");
  const [matchType, setMatchType] = useState<MatchType>(rule?.matchType ?? "contains");
  const [scope, setScope] = useState<"all_posts" | "specific_post">(rule?.scope ?? "all_posts");
  const [postId, setPostId] = useState(rule?.postId ?? "");
  const [commentTemplateId, setCommentTemplateId] = useState(rule?.commentTemplateId ?? "");
  const [dmTemplateId, setDmTemplateId] = useState(rule?.dmTemplateId ?? "");
  const [replyMode, setReplyMode] = useState<ReplyMode>(rule?.replyMode ?? "comment_and_dm");
  const [cooldownMinutes, setCooldownMinutes] = useState(rule?.cooldownMinutes ?? 1440);
  const [active, setActive] = useState(rule?.active ?? true);
  const [busy, setBusy] = useState(false);

  const commentTemplates = templates.filter((t) => t.kind === "comment");
  const dmTemplates = templates.filter((t) => t.kind === "dm");

const submit = async () => {
    const kws = keywords.split(",").map((k) => k.trim().toUpperCase()).filter(Boolean);
    if (mode === "keyword" && kws.length === 0) {
      toast.error("Add at least one keyword");
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
        dmTemplateId: dmTemplateId || null,
        replyMode,
        cooldownMinutes,
        activeFrom: rule?.activeFrom ?? null,
        activeUntil: rule?.activeUntil ?? null,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong my-6 w-full max-w-3xl rounded-2xl p-5 md:p-6 animate-scale-in">
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
              <select value={postId} onChange={(e) => setPostId(e.target.value)} className={input}>
                <option value="" className="bg-[#111827]">Select a mapped post</option>
                {mappings.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111827]">{m.jobTitle} — {m.companyName}</option>
                ))}
              </select>
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

          <div>
            <label className={label}>Reply Type</label>
            <div className="grid grid-cols-3 gap-2">
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
                  {REPLY_MODE_LABEL[rm]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className={label}>Cooldown (minutes)</label>
              <input
                type="number" min={0} value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className={input}
              />
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

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {rule ? "Save changes" : "Create rule"}
          </button>
        </div>
      </div>
    </div>
  );
}
