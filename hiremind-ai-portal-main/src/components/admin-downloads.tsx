// src/components/admin-downloads.tsx
// Admin "PDFs" tab: Drive link paste karo -> public page (/downloads/<slug>) ban jata hai (preview + download + share).
import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { SITE } from "../lib/site";
import {
  createDownload,
  deleteDownload,
  downloadPath,
  fetchDownloads,
  parseDriveLink,
  updateDownload,
  type Download,
} from "../lib/downloads";

const inputCls =
  "w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50";

const CATEGORY_HINTS = ["Resume", "Interview Prep", "Data Analytics", "Flutter", "Cheat Sheet", "Notes"];
const MIN_DESC = 30; // thin content se bachne ke liye: kam se kam itne characters

function Lbl({ text, hint, children, className = "" }: { text: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-white/50">{text}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}

const EMPTY = { title: "", category: "", driveUrl: "", description: "" };

async function copyLink(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copy ho gayi");
  } catch {
    toast.error("Copy nahi hua. Link ko manually select karke copy karo.");
  }
}

export function DownloadsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["downloads"], queryFn: fetchDownloads });
  const items = data ?? [];

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<Download | null>(null);
  const [busy, setBusy] = useState(false);

  const [bulk, setBulk] = useState("");
  const [bulkCat, setBulkCat] = useState("");
  const [bulkDesc, setBulkDesc] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["downloads"] });

  const reset = () => {
    setForm(EMPTY);
    setEditing(null);
  };

  const startEdit = (d: Download) => {
    setEditing(d);
    setForm({ title: d.title, category: d.category, driveUrl: d.driveUrl, description: d.description });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) return void toast.error("Title chahiye.");
    if (description.length < MIN_DESC) return void toast.error(`Description kam se kam ${MIN_DESC} characters ki likho (2-3 line).`);
    const parsed = parseDriveLink(form.driveUrl);
    if ("error" in parsed) return void toast.error(parsed.error);

    setBusy(true);
    try {
      const data = { title, description, category: form.category.trim(), driveUrl: form.driveUrl.trim(), fileId: parsed.id };
      if (editing) {
        await updateDownload(editing.id, data);
        toast.success("PDF update ho gayi");
      } else {
        if (items.some((d) => d.fileId === parsed.id)) {
          throw new Error("Ye PDF pehle se add hai.");
        }
        await createDownload(data);
        toast.success("PDF add ho gayi");
      }
      reset();
      refresh();
    } catch (err) {
      toast.error((err as Error).message || "Save nahi hua");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Download) => {
    if (!window.confirm(`"${d.title}" delete karni hai? Iska public link kaam karna band kar dega.`)) return;
    try {
      await deleteDownload(d.id);
      toast.success("Delete ho gayi");
      if (editing?.id === d.id) reset();
      refresh();
    } catch (err) {
      toast.error((err as Error).message || "Delete nahi hua");
    }
  };

  // Har line: Title | Drive link | description (optional)
  const submitBulk = async () => {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errs: string[] = [];
    const parsedRows: { title: string; description: string; driveUrl: string; fileId: string }[] = [];
    const seen = new Set(items.map((d) => d.fileId));
    let skipped = 0;

    if (!lines.length) errs.push("Kam se kam ek line daalo.");
    lines.forEach((line, i) => {
      const parts = line.split("|").map((s) => s.trim());
      const [title = "", link = "", ...rest] = parts;
      const description = rest.join(" | ").trim() || bulkDesc.trim();
      const n = i + 1;
      if (!title) return void errs.push(`Line ${n}: title chahiye.`);
      const p = parseDriveLink(link);
      if ("error" in p) return void errs.push(`Line ${n}: ${p.error}`);
      if (description.length < MIN_DESC) return void errs.push(`Line ${n}: description kam hai (${MIN_DESC}+ characters). Line me 3rd column do ya neeche common description bharo.`);
      if (seen.has(p.id)) {
        skipped++;
        return;
      }
      seen.add(p.id);
      parsedRows.push({ title, description, driveUrl: link, fileId: p.id });
    });

    setBulkErrors(errs);
    if (errs.length) return void toast.error(errs[0]);
    if (!parsedRows.length) return void toast.info(`Sab ${skipped} PDFs pehle se add hain.`);

    setBulkBusy(true);
    let ok = 0;
    try {
      const taken = new Set(items.map((d) => d.slug));
      for (const r of parsedRows) {
        await createDownload({ ...r, category: bulkCat.trim() }, taken);
        ok++;
      }
      toast.success(`${ok} PDFs add hui${skipped ? `, ${skipped} pehle se thi (skip)` : ""}`);
      setBulk("");
      setBulkErrors([]);
    } catch (err) {
      toast.error(`${ok} add hui, phir error: ${(err as Error).message || "save nahi hua"}`);
    } finally {
      setBulkBusy(false);
      if (ok) refresh();
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          PDF downloads
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Drive ki share link paste karo. Har PDF ka apna page banta hai (preview, download, share). Wahi page link automation me daalna.
        </p>
      </div>

      <div className="mb-4 rounded-2xl bg-amber-400/10 p-4 text-xs leading-5 text-amber-100 ring-1 ring-amber-300/20">
        Drive me har PDF par Share, phir <b>"Anyone with the link"</b> (Viewer) set karna zaroori hai, warna visitors ko preview aur download nahi milega.
      </div>

      {/* ---------- single add / edit ---------- */}
      <form onSubmit={submit} className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{editing ? `Edit: ${editing.title}` : "Add PDF"}</h2>
          {editing && (
            <button type="button" onClick={reset} className="btn-ghost-glow inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm">
              <X className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Lbl text="Title *">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="SQL Interview Cheat Sheet" className={inputCls} />
          </Lbl>
          <Lbl text="Category">
            <input list="dl-cats" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Cheat Sheet" className={inputCls} />
          </Lbl>
          <Lbl text="Google Drive link *" className="md:col-span-2" hint="PDF par right click, Share, Copy link. Folder ki link nahi chalegi.">
            <input value={form.driveUrl} onChange={(e) => set("driveUrl", e.target.value)} placeholder="https://drive.google.com/file/d/…/view" className={inputCls} />
          </Lbl>
          <Lbl text={`Description * (${form.description.trim().length}/${MIN_DESC}+ characters)`} className="md:col-span-2" hint="Is PDF me kya hai aur kiske kaam ka hai, 2-3 line apne shabdon me. Isi se page par asli content banta hai.">
            <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </Lbl>
        </div>
        <datalist id="dl-cats">{CATEGORY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
        <button type="submit" disabled={busy} className="btn-glow mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? "Saving…" : editing ? "Update PDF" : "Add PDF"}
        </button>
      </form>

      {/* ---------- bulk ---------- */}
      <details className="glass mt-4 rounded-2xl p-5">
        <summary className="cursor-pointer text-sm font-medium text-white/80">Ek saath kai PDFs add karni hain? (Title | Drive link | Description)</summary>
        <textarea
          rows={5}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={"SQL Cheat Sheet | https://drive.google.com/file/d/…/view | Important SQL commands with examples for interviews.\nResume Template | https://drive.google.com/file/d/…/view"}
          className={`${inputCls} mt-3`}
        />
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Lbl text="Common category (optional)">
            <input list="dl-cats" value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} className={inputCls} />
          </Lbl>
          <Lbl text="Common description (jis line me 3rd column na ho uske liye)" className="md:col-span-2">
            <input value={bulkDesc} onChange={(e) => setBulkDesc(e.target.value)} className={inputCls} />
          </Lbl>
        </div>
        {bulkErrors.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-red-500/10 p-3 text-xs text-red-200 ring-1 ring-red-400/20">
            {bulkErrors.map((m) => <li key={m}>• {m}</li>)}
          </ul>
        )}
        <button type="button" onClick={submitBulk} disabled={bulkBusy} className="btn-glow mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-60">
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {bulkBusy ? "Adding…" : "Add all"}
        </button>
      </details>

      {/* ---------- list ---------- */}
      <h2 className="mb-3 mt-8 text-base font-semibold text-white">Saari PDFs ({items.length})</h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/45">Abhi koi PDF add nahi hui.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => {
            const link = `${SITE.url}${downloadPath(d)}`;
            return (
              <li key={d.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{d.title}</div>
                  <div className="mt-0.5 truncate text-xs text-white/45">{d.category ? `${d.category} · ` : ""}{link}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={() => copyLink(link)} className="btn-ghost-glow inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </button>
                  <a href={downloadPath(d)} target="_blank" rel="noopener noreferrer" aria-label={`${d.title} page kholo`} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button type="button" onClick={() => startEdit(d)} aria-label={`${d.title} edit karo`} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(d)} aria-label={`${d.title} delete karo`} className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
