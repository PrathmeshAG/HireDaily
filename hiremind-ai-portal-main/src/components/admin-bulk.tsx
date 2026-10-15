// src/components/admin-bulk.tsx
// "Bulk Add" tab: ek common description + deadline, aur har job ki sirf alag cheezein (company, role, salary, link, location, exp).
// Skills / category / salary / location / exp text se auto aate hain, sab editable. Backend ko touch nahi karta (createJob wahi purana).
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save, Sparkles, AlertTriangle } from "lucide-react";
import type { Job } from "../lib/firebase";
import { createJob, fetchJobs } from "../lib/jobs";
import {
  CATEGORIES, EXPERIENCES, JOB_TYPES, LOCATIONS,
  extractExperience, extractJobType, extractLocation, extractSalary, extractSkills,
  guessCategory, parseQuickRows,
} from "../lib/job-parse";

type Row = {
  id: number;
  companyName: string;
  role: string;
  salary: string;
  applyLink: string;
  location: string;
  experience: string;
  note: string; // optional: is job ki apni 1-2 line (description ke neeche judti hai)
  category?: string; // undefined = auto
  skills?: string; // undefined = auto
};

const inputCls =
  "w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50";

let uid = 1;
const blank = (): Row => ({ id: uid++, companyName: "", role: "", salary: "", applyLink: "", location: "", experience: "", note: "" });
const isBlank = (r: Row) => !r.companyName.trim() && !r.role.trim() && !r.applyLink.trim();
const threeBlank = () => [blank(), blank(), blank()];

const pad = (n: number) => String(n).padStart(2, "0");
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localISO(d);
};
const validUrl = (s: string) => {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

function Lbl({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium text-white/50">{text}</span>
      {children}
    </label>
  );
}

export function BulkJobsTab({ onDone }: { onDone?: () => void }) {
  const qc = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const [description, setDescription] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [jobType, setJobType] = useState(""); // "" = description se auto
  const [sourceType, setSourceType] = useState("");
  const [verified, setVerified] = useState(false);
  const [rows, setRows] = useState<Row[]>(threeBlank);
  const [quick, setQuick] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Common description se nikle hue defaults (row khaali ho to yahi use hote hain)
  const shared = useMemo(
    () => ({
      salary: extractSalary(description),
      location: extractLocation(description),
      experience: extractExperience(description),
      jobType: extractJobType(description),
    }),
    [description],
  );
  const posted = useMemo(
    () => new Set((existing ?? []).map((j) => j.applyLink?.trim()).filter(Boolean)),
    [existing],
  );

  const patch = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const remove = (id: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : [blank()]));

  const eff = (r: Row) => ({
    salary: r.salary.trim() || shared.salary,
    location: r.location.trim() || shared.location,
    experience: r.experience.trim() || shared.experience,
    category: r.category ?? guessCategory(r.role, description),
    skills: r.skills ?? extractSkills(`${r.role}\n${description}\n${r.note}`),
  });

  const addQuick = () => {
    const parsed = parseQuickRows(quick);
    if (!parsed.length) return;
    setRows((rs) => [...rs.filter((r) => !isBlank(r)), ...parsed.map((p) => ({ ...blank(), ...p }))]);
    setQuick("");
    toast.success(`${parsed.length} rows add hui. Ek baar check kar lo.`);
  };

  const submit = async () => {
    const todo = rows.filter((r) => !isBlank(r));
    const errs: string[] = [];
    if (!todo.length) errs.push("Kam se kam ek job bharo.");
    if (!description.trim()) errs.push("Common description khaali hai.");
    if (!lastDate) errs.push("Deadline chuno.");
    else if (lastDate < localISO()) errs.push("Deadline aaj se pehle ki nahi ho sakti.");
    todo.forEach((r) => {
      const n = rows.indexOf(r) + 1;
      if (!r.companyName.trim()) errs.push(`Row ${n}: company name chahiye.`);
      if (!r.role.trim()) errs.push(`Row ${n}: role chahiye.`);
      if (!validUrl(r.applyLink.trim())) errs.push(`Row ${n}: apply link sahi nahi hai (https://… hona chahiye).`);
    });
    setErrors(errs);
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }

    setBusy(true);
    let ok = 0;
    const doneIds = new Set<number>();
    try {
      for (const r of todo) {
        const e = eff(r);
        const company = r.companyName.trim();
        const link = r.applyLink.trim();
        const payload: Omit<Job, "id" | "createdAt" | "updatedAt"> = {
          companyName: company,
          role: r.role.trim(),
          salary: e.salary,
          category: e.category || "Other",
          location: e.location,
          experience: e.experience,
          skills: e.skills,
          jobType: jobType || shared.jobType,
          description: description.trim() + (r.note.trim() ? `\n\n${r.note.trim()}` : ""),
          applyLink: link,
          lastDate,
          sourceName: company, // source name = company name
          sourceUrl: link, // source link = apply link
          sourceType,
          verificationStatus: verified ? "verified" : "not_specified",
          verifiedAt: verified ? localISO() : "",
        };
        await createJob(payload); // ek-ek karke, taaki order bana rahe
        doneIds.add(r.id);
        ok++;
      }
      toast.success(`${ok} job${ok > 1 ? "s" : ""} post ho gayi`);
    } catch (err) {
      toast.error(`${ok} post hui, phir error aaya: ${(err as Error).message || "save nahi hua"}`);
    } finally {
      setBusy(false);
    }
    if (ok) {
      setRows((rs) => {
        const left = rs.filter((r) => !doneIds.has(r.id));
        return left.length ? left : threeBlank();
      });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      if (ok === todo.length) {
        setErrors([]);
        onDone?.();
      }
    }
  };

  const filled = rows.filter((r) => !isBlank(r)).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          Bulk add jobs
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Ek common description aur deadline, phir har job ki sirf alag cheezein. Baaki sab text se auto bhar jata hai aur edit bhi hota hai.
        </p>
      </div>

      {/* ---------- common ---------- */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
          <Sparkles className="h-4 w-4 text-[#00e5ff]" /> Sabke liye common
        </h2>
        <Lbl text="Job description (sab jobs me yahi jayega) *">
          <textarea
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Original job text paste karo. Skills, salary, location, experience isi se auto pick hote hain."
            className={inputCls}
          />
          <span className="mt-1 block text-right text-[11px] text-white/35">{description.length} characters</span>
        </Lbl>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Lbl text="Application deadline *">
            <input type="date" min={localISO()} value={lastDate} onChange={(e) => setLastDate(e.target.value)} className={inputCls} />
            <div className="mt-1.5 flex gap-1.5">
              {[7, 15, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLastDate(plusDays(n))}
                  className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 ring-1 ring-white/10 hover:bg-white/10"
                >
                  +{n} din
                </button>
              ))}
            </div>
          </Lbl>
          <Lbl text="Job type">
            <select value={jobType} onChange={(e) => setJobType(e.target.value)} className={inputCls}>
              <option value="" className="bg-[#111827]">Auto ({shared.jobType})</option>
              {JOB_TYPES.map((v) => <option key={v} value={v} className="bg-[#111827]">{v}</option>)}
            </select>
          </Lbl>
          <Lbl text="Source type">
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className={inputCls}>
              <option value="" className="bg-[#111827]">Not specified</option>
              {["Official company careers page", "Verified recruitment source", "Other"].map((v) => (
                <option key={v} value={v} className="bg-[#111827]">{v}</option>
              ))}
            </select>
          </Lbl>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-xs text-white/60">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5" />
          <span>
            Maine in sabke apply links / source khud check kiye hain, "Verified" mark karo (aaj ki date ke saath).
            <span className="block text-white/40">Bina check kiye tick mat karna. Source name = company name, source URL = apply link apne aap set hota hai.</span>
          </span>
        </label>
      </section>

      {/* ---------- quick paste ---------- */}
      <details className="glass mt-4 rounded-2xl p-5">
        <summary className="cursor-pointer text-sm font-medium text-white/80">
          Excel / list se paste karna hai? (Company | Role | Salary | Link | Location | Exp)
        </summary>
        <textarea
          rows={4}
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder={"Infosys | Data Analyst | 4-6 LPA | https://careers.infosys.com/… | Pune | Fresher\nTCS | Flutter Developer | | https://… | Bengaluru | 2-5 Years"}
          className={`${inputCls} mt-3`}
        />
        <button type="button" onClick={addQuick} className="btn-ghost-glow mt-2 rounded-xl px-3 py-2 text-sm">
          Rows bana do
        </button>
      </details>

      {/* ---------- rows ---------- */}
      <div className="mt-4 space-y-3">
        {rows.map((r, i) => {
          const e = eff(r);
          const dup = !!r.applyLink.trim() && posted.has(r.applyLink.trim());
          return (
            <section key={r.id} className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">Job {i + 1}</span>
                <div className="flex items-center gap-2">
                  {dup && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> ye apply link pehle se posted hai
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    aria-label={`Job ${i + 1} hatao`}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <Lbl text="Company *" className="md:col-span-3">
                  <input value={r.companyName} onChange={(ev) => patch(r.id, { companyName: ev.target.value })} placeholder="Infosys" className={inputCls} />
                </Lbl>
                <Lbl text="Role *" className="md:col-span-3">
                  <input value={r.role} onChange={(ev) => patch(r.id, { role: ev.target.value })} placeholder="Data Analyst" className={inputCls} />
                </Lbl>
                <Lbl text="Salary" className="md:col-span-2">
                  <input value={r.salary} onChange={(ev) => patch(r.id, { salary: ev.target.value })} placeholder={shared.salary || "4-6 LPA"} className={inputCls} />
                </Lbl>
                <Lbl text="Experience" className="md:col-span-2">
                  <input list="bulk-exp" value={r.experience} onChange={(ev) => patch(r.id, { experience: ev.target.value })} placeholder={shared.experience || "Fresher"} className={inputCls} />
                </Lbl>
                <Lbl text="Location" className="md:col-span-2">
                  <input list="bulk-loc" value={r.location} onChange={(ev) => patch(r.id, { location: ev.target.value })} placeholder={shared.location || "Pune"} className={inputCls} />
                </Lbl>

                <Lbl text="Apply link * (source link bhi yahi hoga)" className="md:col-span-12">
                  <input type="url" value={r.applyLink} onChange={(ev) => patch(r.id, { applyLink: ev.target.value })} placeholder="https://…" className={inputCls} />
                </Lbl>

                <Lbl text="Category (auto)" className="md:col-span-3">
                  <select value={e.category} onChange={(ev) => patch(r.id, { category: ev.target.value })} className={inputCls}>
                    {CATEGORIES.map((v) => <option key={v} value={v} className="bg-[#111827]">{v}</option>)}
                  </select>
                </Lbl>
                <Lbl text="Skills (text se auto, comma-separated)" className="md:col-span-5">
                  <input value={e.skills} onChange={(ev) => patch(r.id, { skills: ev.target.value })} placeholder="SQL, Excel, Power BI" className={inputCls} />
                </Lbl>
                <Lbl text="Is job ka apna note (optional)" className="md:col-span-4">
                  <input value={r.note} onChange={(ev) => patch(r.id, { note: ev.target.value })} placeholder="Kaun apply kare, 1-2 line" className={inputCls} />
                </Lbl>
              </div>
            </section>
          );
        })}
      </div>

      <datalist id="bulk-loc">{LOCATIONS.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="bulk-exp">{EXPERIENCES.map((v) => <option key={v} value={v} />)}</datalist>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className="btn-ghost-glow inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm">
          <Plus className="h-4 w-4" /> Job add karo
        </button>
        <span className="text-xs text-white/45">{filled} job{filled === 1 ? "" : "s"} ready</span>
      </div>

      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-2xl bg-red-500/10 p-4 text-xs text-red-200 ring-1 ring-red-400/20">
          {errors.map((m) => <li key={m}>• {m}</li>)}
        </ul>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="btn-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {busy ? "Post ho rahi hain…" : `Post ${filled || ""} job${filled === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
