import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Save, X, MessageSquareText, Eye, Link2, AlertTriangle, Sparkles, Check, ChevronDown } from "lucide-react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "../services/automation-service";
import type { Template, TemplateKind } from "../types";
import { TableToolbar } from "../components/table-toolbar";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { ModalPortal } from "../components/modal-portal";
import { DmPreview, namesBlock } from "../components/dm-preview";
import { TEMPLATE_PRESETS } from "../template-presets";
import { TemplatesArt, EmptyArt } from "../components/illustrations";
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

// Names only: DM buttons never show a URL. Comments get the URL list.
const SAMPLE_NAMES = [
  "Frontend Developer - Zynatra Tech",
  "Backend Developer - Globex",
  "Data Analyst - Initech",
  "UI/UX Designer - Hooli",
  "QA Engineer - Umbrella",
];

function sampleUrlBlock(count: number): string {
  return SAMPLE_NAMES.slice(0, count)
    .map((name, i) => `${i + 1}. ${name}\nhttps://hiredaily.app/jobs/job_${i + 1}`)
    .join("\n\n");
}

interface BuiltPreview {
  body: string;
  /** Link names for DM buttons (length = link count). */
  labels: string[];
  /** Label of the native button when there is exactly one link. */
  singleLabel: string | null;
}

/**
 * Mirrors what the backend sends.
 *  - comment: plain text; {{jobLink}} becomes the job URL (or a named URL list).
 *  - dm, 1 link: text + one native button ([[CTA:...]]).
 *  - dm, 2-3 links: text + one button per link; {{jobLink}} becomes the names list.
 *  - dm, 4-5 links: swipeable cards, one per link.
 */
function buildPreview(text: string, kind: TemplateKind, linkCount: number): BuiltPreview {
  const labels = SAMPLE_NAMES.slice(0, Math.max(1, linkCount));
  const match = text.match(/\[\[CTA:([^\]]{1,40})\]\]/i);
  const stripped = match ? text.replace(match[0], "").replace(/\n{3,}/g, "\n\n").trim() : text;

  if (kind === "comment") {
    const withLinks = linkCount > 1 && text.includes("{{jobLink}}") ? text.split("{{jobLink}}").join(sampleUrlBlock(linkCount)) : text;
    return { body: renderPreview(withLinks), labels, singleLabel: null };
  }
  if (linkCount <= 1) {
    return { body: renderPreview(stripped), labels, singleLabel: match ? match[1].trim() || "Apply Now" : null };
  }
  const names = namesBlock(labels);
  const withNames = stripped.includes("{{jobLink}}") ? stripped.split("{{jobLink}}").join(names) : `${stripped}\n\n${names}`;
  return { body: renderPreview(withNames), labels, singleLabel: null };
}

const STARTERS: Record<TemplateKind, { name: string; text: string }[]> = {
  comment: TEMPLATE_PRESETS.filter((p) => p.kind === "comment"),
  dm: TEMPLATE_PRESETS.filter((p) => p.kind === "dm"),
};

const LIMITS: Record<TemplateKind, number> = { comment: 2200, dm: 1000 };

export function TemplatesPage() {
  const qc = useQueryClient();
  const { data: templates, isLoading } = useQuery({ queryKey: ["automation", "templates"], queryFn: getTemplates });
  const [kind, setKind] = useState<TemplateKind>("comment");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  const hasPreset = (name: string, k: TemplateKind) =>
    (templates ?? []).some((t) => t.kind === k && t.name.trim().toLowerCase() === name.trim().toLowerCase());

  const addPreset = async (preset: (typeof TEMPLATE_PRESETS)[number]) => {
    setAddingId(preset.id);
    try {
      await createTemplate({ kind: preset.kind, channel: "instagram", name: preset.name, text: preset.text });
      toast.success(`Added "${preset.name}"`);
      await qc.invalidateQueries({ queryKey: ["automation", "templates"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAddingId(null);
    }
  };

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
      <PageHeader
        title="Templates"
        subtitle="Reusable comment and DM text. Variables fill in automatically; 2+ links become a named list."
        art={<TemplatesArt />}
        actions={
          <button onClick={() => setEditing("new")} className="btn-glow flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> New template
          </button>
        }
      />

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

      <section className="glass mt-4 overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setGalleryOpen((o) => !o)}
          aria-expanded={galleryOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-white">✨ Ready-made templates</span>
            <span className="block text-xs text-white/45">{TEMPLATE_PRESETS.length} emoji-rich templates. Add one with a single click, edit later.</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${galleryOpen ? "rotate-180" : ""}`} />
        </button>
        {galleryOpen && (
          <div className="grid gap-3 border-t border-white/5 p-4 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATE_PRESETS.map((preset) => {
              const added = hasPreset(preset.name, preset.kind);
              const cta = preset.text.match(/\[\[CTA:([^\]]{1,40})\]\]/i);
              const body = preset.text.replace(/\[\[CTA:[^\]]*\]\]/i, "").trim();
              return (
                <div key={preset.id} className="flex flex-col rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{preset.name}</p>
                      <p className="text-[11px] text-white/40">{preset.tagline}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${preset.kind === "dm" ? "bg-[#7c3aed]/20 text-[#c4b5fd]" : "bg-[#00e5ff]/15 text-[#7DF9FF]"}`}>
                      {preset.kind === "dm" ? "DM" : "Comment"}
                    </span>
                  </div>
                  <div className="mt-3 flex-1 rounded-xl bg-[#0b1220]/70 p-3 ring-1 ring-white/5">
                    <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-white/75">{renderPreview(body)}</p>
                    {cta && <div className="mt-2.5 rounded-lg bg-white/[0.07] py-1.5 text-center text-[11px] font-semibold text-[#67e8f9]">{cta[1].trim()}</div>}
                  </div>
                  <button
                    type="button"
                    disabled={added || addingId === preset.id}
                    onClick={() => addPreset(preset)}
                    className={`mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs transition disabled:cursor-default ${
                      added ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25" : "btn-ghost-glow"
                    }`}
                  >
                    {addingId === preset.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {added ? "Already in your templates" : "Add to my templates"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="glass mt-4 rounded-2xl">
        <TableToolbar search={search} onSearchChange={setSearch} placeholder="Search templates by name…" />

        {isLoading ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="shimmer-loading h-40 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquareText} art={<EmptyArt kind="templates" />} title="No templates yet" description="Create your first template for this channel. Starters are built in." action={<button onClick={() => setEditing("new")} className="btn-ghost-glow mt-2 rounded-xl px-4 py-2 text-sm">New template</button>} />
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
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.text.includes("{{jobLink}}") && <span className="rounded-md bg-[#00e5ff]/10 px-1.5 py-0.5 text-[10px] text-[#7DF9FF] ring-1 ring-[#00e5ff]/20">job link</span>}
                  {/\[\[CTA:/i.test(t.text) && <span className="rounded-md bg-[#7c3aed]/15 px-1.5 py-0.5 text-[10px] text-[#c4b5fd] ring-1 ring-[#7c3aed]/25">button</span>}
                  <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45 ring-1 ring-white/10">{t.text.length} chars</span>
                </div>
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
  const [previewLinks, setPreviewLinks] = useState(1);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (token: string) => {
    const el = textRef.current;
    if (!el) { setText((t) => t + token); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const built = buildPreview(text, kind, previewLinks);
  const limit = LIMITS[kind];
  const used = built.body.length;
  const hasLink = text.includes("{{jobLink}}") || (kind === "dm" && /\[\[CTA:/i.test(text));

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
    <ModalPortal>
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
      <div className="glass-strong mx-auto my-2 w-full max-w-2xl sm:my-8 rounded-2xl p-6 animate-scale-in">
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
            {!template && (
              <div>
                <label className={`${label} flex items-center gap-1.5`}><Sparkles className="h-3.5 w-3.5" /> Start from a starter</label>
                <div className="flex flex-wrap gap-1.5">
                  {STARTERS[kind].map((st) => (
                    <button
                      key={st.name}
                      type="button"
                      onClick={() => { setName(st.name); setText(st.text); }}
                      className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/70 ring-1 ring-white/10 transition hover:bg-[#00e5ff]/10 hover:text-white hover:ring-[#00e5ff]/30"
                    >
                      {st.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className={label}>Message text</label>
              <textarea
                ref={textRef}
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
                  onClick={() => insertAtCursor(v)}
                  className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60 ring-1 ring-white/10 hover:text-white"
                >
                  {v}
                </button>
              ))}
            </div>
            {text.trim() && !hasLink && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {kind === "dm"
                    ? "This template has no {{jobLink}} or button, so people will not get the job link."
                    : "This comment has no {{jobLink}}. That is fine if the link goes in the DM."}
                </span>
              </div>
            )}
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
            <div className="mb-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPreviewLinks(n)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                    previewLinks === n ? "bg-[#00e5ff]/15 text-white ring-1 ring-[#00e5ff]/30" : "text-white/50 ring-1 ring-white/10 hover:text-white"
                  }`}
                >
                  {n} {n === 1 ? "link" : "links"}
                </button>
              ))}
            </div>
            {text.trim() ? (
              kind === "dm" ? (
                <DmPreview text={built.body} labels={built.labels} singleButtonLabel={built.singleLabel} />
              ) : (
                <div className="glass rounded-xl p-4 text-sm leading-relaxed text-white/85">
                  <p className="whitespace-pre-wrap break-words">{built.body}</p>
                </div>
              )
            ) : (
              <div className="glass rounded-xl p-4 text-sm text-white/40">Start typing to see the preview…</div>
            )}
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-white/35">
                {previewLinks >= 4 && kind === "dm"
                  ? "4-5 links are sent as swipeable cards (one message). Each card shows the job name and Option 1 of n. The text above is not shown with cards."
                  : previewLinks > 1 && kind === "dm"
                    ? "2-3 links: one message, one button per link. {{jobLink}} becomes the numbered names list."
                    : kind === "dm"
                    ? "The button URL is resolved server-side from the mapped job."
                    : "Comment replies are plain text; {{jobLink}} becomes the job URL."}
              </span>
              <span className={used > limit ? "text-rose-300" : used > limit * 0.85 ? "text-amber-300" : "text-white/40"}>{used}/{limit}</span>
            </div>
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
    </ModalPortal>
  );
}
