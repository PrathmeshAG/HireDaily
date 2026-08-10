import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Save, X, MessageSquareText, Eye, Link2 } from "lucide-react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "../services/automation-service";
import type { Template, TemplateKind } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { ConfirmDialog } from "./post-mapping-page";

const SAMPLE_VARS: Record<string, string> = {
  "{{company}}": "Zynatra Tech",
  "{{title}}": "Frontend Developer Intern",
  "{{location}}": "Remote",
  "{{jobLink}}": "https://hiredaily.app/jobs/job_1",
  "{{username}}": "aditi.codes",
};

function renderPreview(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(SAMPLE_VARS)) out = out.split(k).join(v);
  return out;
}

function splitCtaPreview(text: string): { body: string; label: string | null } {
  const match = text.match(/\[\[CTA:([^\]]{1,40})\]\]/i);
  if (!match) return { body: renderPreview(text), label: null };
  return {
    body: renderPreview(text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim()),
    label: match[1].trim() || "Apply Now",
  };
}

export function TemplatesPage() {
  const qc = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ["automation", "templates"], queryFn: getTemplates });
  const [kind, setKind] = useState<TemplateKind>("comment");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);

  const filtered = useMemo(() => {
    let list = (templates ?? []).filter((t) => t.kind === kind);
    if (search) list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [templates, kind, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["automation", "templates"] });

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteTemplate(confirmDelete.id);
      toast.success("Template deleted");
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
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Templates</h1>
          <p className="mt-1 text-sm text-white/50">Reusable reply text. Rules reference templates by ID.</p>
        </div>
        <button onClick={() => setEditing("new")} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New template
        </button>
      </div>

      <div className="mt-5 flex gap-1.5">
        {(["comment", "dm"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-xl px-4 py-2 text-sm capitalize transition ${
              kind === k
                ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {k === "dm" ? "DM Templates" : "Comment Templates"}
          </button>
        ))}
      </div>

      <div className="glass mt-4 rounded-2xl">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search templates by name…" />

        {isLoading ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="shimmer-loading h-40 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No templates yet" description="Create your first template for this channel." />
        ) : (
          <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <div key={t.id} className="glass card-glow flex flex-col rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-white">{t.name}</h3>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setEditing(t)} className="btn-ghost-glow rounded-lg p-1.5" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="btn-ghost-glow rounded-lg p-1.5 hover:!border-red-500/30 hover:!bg-red-500/10 hover:!text-red-300"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 flex-1 whitespace-pre-wrap text-xs text-white/60">{t.text}</p>
                <p className="mt-3 text-[11px] text-white/35">Updated {new Date(t.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <TemplateDialog
          template={editing === "new" ? null : editing}
          defaultKind={kind}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          icon={Trash2}
          danger
          title="Delete this template?"
          description={`"${confirmDelete.name}" will be removed. Rules referencing it will show "None" until updated.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  );
}

function TemplateDialog({
  template,
  defaultKind,
  onClose,
  onSaved,
}: {
  template: Template | null;
  defaultKind: TemplateKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<TemplateKind>(template?.kind ?? defaultKind);
  const [name, setName] = useState(template?.name ?? "");
  const [text, setText] = useState(template?.text ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !text.trim()) {
      toast.error("Name and text are required");
      return;
    }
    setBusy(true);
    try {
      if (template) {
        await updateTemplate(template.id, { kind, name: name.trim(), text });
        toast.success("Template updated");
      } else {
        await createTemplate({ kind, channel: "instagram", name: name.trim(), text });
        toast.success("Template created");
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
      <div className="glass-strong my-8 w-full max-w-2xl rounded-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{template ? "Edit template" : "New template"}</h2>
          <button onClick={onClose} className="btn-ghost-glow rounded-lg p-1.5"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Kind</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)} className={input}>
                  <option value="comment" className="bg-[#111827]">Comment</option>
                  <option value="dm" className="bg-[#111827]">DM</option>
                </select>
              </div>
              <div>
                <label className={label}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Job link — standard" className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Message text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={7}
                placeholder="Hey {{username}}! Here's the link: {{jobLink}}"
                className={`${input} resize-none font-mono text-xs leading-relaxed`}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(SAMPLE_VARS).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setText((t) => t + v)}
                  className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60 ring-1 ring-white/10 hover:text-white"
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-white">
                    {kind === "dm" ? "Job link button" : "Job link"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    {kind === "dm"
                      ? "Adds an Instagram web button using the mapped job URL."
                      : "Adds {{jobLink}} to the comment. Instagram comment replies use a clickable URL, not a native button."}
                  </p>
                </div>

                {kind === "dm" ? (
                  <button
                    type="button"
                    onClick={() => setText((t) => t.includes("[[CTA:") ? t : `${t.trim()}\n\n[[CTA:View Job & Apply]]`)}
                    className="btn-ghost-glow flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Add button
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setText((t) => t.includes("{{jobLink}}") ? t : `${t.trim()}\n\n{{jobLink}}`)}
                    className="btn-ghost-glow flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Insert job link
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={`${label} flex items-center gap-1.5`}><Eye className="h-3.5 w-3.5" /> Live preview</label>
            <div className="glass rounded-xl p-4 text-sm leading-relaxed text-white/85">
              {text.trim() ? (() => {
                const preview = splitCtaPreview(text);
                return (
                  <div>
                    <p className="whitespace-pre-wrap">{preview.body}</p>
                    {preview.label && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#00e5ff] px-4 py-2.5 text-xs font-semibold text-[#041018] shadow-lg shadow-cyan-500/20">
                        <Link2 className="h-3.5 w-3.5" /> {preview.label}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <p className="text-white/40">Start typing to see the preview…</p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-white/30">
              {kind === "dm"
                ? "The button URL is resolved server-side from the mapped job."
                : "Comment replies are plain text; {{jobLink}} is rendered to the mapped Hire Daily job URL."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost-glow rounded-xl px-4 py-2.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {template ? "Save changes" : "Create template"}
          </button>
        </div>
      </div>
    </div>
  );
}
