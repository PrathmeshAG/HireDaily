import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ShieldCheck, ExternalLink, Eye, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin/emergency")({
  component: EmergencyAdminPreviewPage,
  head: () => ({
    meta: [
      { title: "Emergency Automation Preview — Hire Daily Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const DEFAULT_COMMENT =
  "Thanks for your interest! Apply using the official company link below. Comment LINK if you need help. 👇";
const DEFAULT_DM =
  "Hi! 👋 Thanks for your interest in the {role} opportunity at {company}.\n\n📍 Location: {location}\n🎓 Experience: {experience}\n\nApply here: {apply_url}\n\nGood luck! — Hire Daily";

function EmergencyAdminPreviewPage() {
  const [postUrl, setPostUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("Fresher");
  const [applyUrl, setApplyUrl] = useState("");
  const [commentTemplate, setCommentTemplate] = useState(DEFAULT_COMMENT);
  const [dmTemplate, setDmTemplate] = useState(DEFAULT_DM);
  const [preview, setPreview] = useState(false);

  const field =
    "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400";

  function reset() {
    setPostUrl("");
    setCompany("");
    setRole("");
    setLocation("");
    setExperience("Fresher");
    setApplyUrl("");
    setCommentTemplate(DEFAULT_COMMENT);
    setDmTemplate(DEFAULT_DM);
    setPreview(false);
  }

  const validHttpsUrl = (value: string) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  };
  const previewDm = dmTemplate
    .replaceAll("{company}", company || "[Company]")
    .replaceAll("{role}", role || "[Job role]")
    .replaceAll("{location}", location || "[Location]")
    .replaceAll("{experience}", experience)
    .replaceAll("{apply_url}", applyUrl || "[Official apply link]");

  return (
    <main className="mx-auto min-h-[75vh] max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Hire Daily · Admin preview</p>
          <h1 className="mt-1 text-3xl font-bold">Emergency Automation</h1>
          <p className="mt-2 text-sm text-slate-300">Add a post URL, official apply link and your comment/DM templates.</p>
        </div>
      </header>

      <section className="mb-6 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Preview-only mode.</strong> No API, Instagram, Firebase or Cloudflare calls are made. Nothing is saved and no comments or DMs are sent. The post URL is accepted here so you do not need to find a numeric Media ID manually; resolving it and running automation requires a separate isolated server-side integration.</p>
      </section>

      <form onSubmit={(event) => { event.preventDefault(); setPreview(true); }} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2">
        <label className="text-sm text-slate-200 sm:col-span-2">
          Instagram post/reel URL
          <input className={field} type="url" value={postUrl} onChange={(event) => { setPostUrl(event.target.value); setPreview(false); }} placeholder="https://www.instagram.com/p/ABC123/ or /reel/ABC123/" required maxLength={2048} />
          <span className="mt-1 block text-xs text-slate-400">Paste the normal Instagram post/reel link. You should not need to look up the Media ID yourself.</span>
        </label>

        <label className="text-sm text-slate-200">Company name
          <input className={field} value={company} onChange={(event) => { setCompany(event.target.value); setPreview(false); }} placeholder="Quest Global" required maxLength={100} />
        </label>
        <label className="text-sm text-slate-200">Job role
          <input className={field} value={role} onChange={(event) => { setRole(event.target.value); setPreview(false); }} placeholder="Data Analyst" required maxLength={100} />
        </label>
        <label className="text-sm text-slate-200">Location
          <input className={field} value={location} onChange={(event) => { setLocation(event.target.value); setPreview(false); }} placeholder="Hyderabad / Remote" required maxLength={100} />
        </label>
        <label className="text-sm text-slate-200">Experience
          <select className={field} value={experience} onChange={(event) => { setExperience(event.target.value); setPreview(false); }}>
            <option>Fresher</option><option>Internship</option><option>0-1 years</option><option>1-3 years</option><option>Experienced</option>
          </select>
        </label>

        <label className="text-sm text-slate-200 sm:col-span-2">Official company apply URL
          <input className={field} type="url" value={applyUrl} onChange={(event) => { setApplyUrl(event.target.value); setPreview(false); }} placeholder="https://careers.company.com/job/..." required maxLength={2048} />
          <span className="mt-1 block text-xs text-slate-400">Use the official company application link (HTTPS).</span>
        </label>

        <label className="text-sm text-slate-200 sm:col-span-2">Public comment reply template
          <textarea className={field} rows={3} value={commentTemplate} onChange={(event) => { setCommentTemplate(event.target.value); setPreview(false); }} required maxLength={1000} />
          <span className="mt-1 block text-xs text-slate-400">Example: “Thanks! We’ll DM you the official application link. 👋”</span>
        </label>

        <label className="text-sm text-slate-200 sm:col-span-2">DM template
          <textarea className={field} rows={7} value={dmTemplate} onChange={(event) => { setDmTemplate(event.target.value); setPreview(false); }} required maxLength={3000} />
          <span className="mt-1 block text-xs text-slate-400">Available placeholders: {"{company}"}, {"{role}"}, {"{location}"}, {"{experience}"}, {"{apply_url}"}.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950" type="submit"><Eye className="h-4 w-4" /> Preview templates</button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm" type="button" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</button>
          {validHttpsUrl(applyUrl) && <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-cyan-200 underline"><ExternalLink className="h-4 w-4" /> Check apply link</a>}
        </div>
      </form>

      {preview && (
        <section className="mt-6 space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">Local preview · Not saved or sent</p>
          <div><h2 className="font-semibold">Post URL</h2><p className="mt-1 break-all text-sm text-slate-300">{postUrl}</p></div>
          <div><h2 className="font-semibold">Comment reply</h2><p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{commentTemplate}</p></div>
          <div><h2 className="font-semibold">Rendered DM</h2><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{previewDm}</p></div>
          {!validHttpsUrl(applyUrl) && <p className="text-sm text-amber-200">Enter a valid HTTPS official apply URL.</p>}
        </section>
      )}
    </main>
  );
}
