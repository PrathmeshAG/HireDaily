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

function EmergencyAdminPreviewPage() {
  const [mediaId, setMediaId] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("Fresher");
  const [applyUrl, setApplyUrl] = useState("");
  const [preview, setPreview] = useState(false);

  const field =
    "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400";

  function reset() {
    setMediaId("");
    setRole("");
    setLocation("");
    setExperience("Fresher");
    setApplyUrl("");
    setPreview(false);
  }

  const validHttpsUrl = (() => {
    try {
      return new URL(applyUrl).protocol === "https:";
    } catch {
      return false;
    }
  })();

  return (
    <main className="mx-auto min-h-[75vh] max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">
            Hire Daily · Admin preview
          </p>
          <h1 className="mt-1 text-3xl font-bold">Emergency Automation</h1>
          <p className="mt-2 text-sm text-slate-300">
            Preview the Instagram post-to-apply-link mapping form.
          </p>
        </div>
      </header>

      <section className="mb-6 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Preview-only mode.</strong> This page does not call the backend,
          Firebase, Cloudflare, Instagram, or any API. Entries stay in this browser
          page only and are not saved. Existing backend and automation are untouched.
        </p>
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPreview(true);
        }}
        className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2"
      >
        <label className="text-sm text-slate-200 sm:col-span-2">
          Instagram Media/Post ID
          <input
            className={field}
            value={mediaId}
            onChange={(event) => { setMediaId(event.target.value); setPreview(false); }}
            placeholder="e.g. 17900000000000000"
            required
            inputMode="numeric"
            pattern="[0-9]{5,30}"
            title="Enter a numeric Instagram media ID (5–30 digits)."
          />
          <span className="mt-1 block text-xs text-slate-400">
            Enter the numeric media ID, not the public post URL.
          </span>
        </label>

        <label className="text-sm text-slate-200">
          Job role
          <input className={field} value={role} onChange={(event) => { setRole(event.target.value); setPreview(false); }} placeholder="Data Analyst" required maxLength={100} />
        </label>

        <label className="text-sm text-slate-200">
          Location
          <input className={field} value={location} onChange={(event) => { setLocation(event.target.value); setPreview(false); }} placeholder="Hyderabad / Remote" required maxLength={100} />
        </label>

        <label className="text-sm text-slate-200">
          Experience
          <select className={field} value={experience} onChange={(event) => { setExperience(event.target.value); setPreview(false); }}>
            <option>Fresher</option>
            <option>Internship</option>
            <option>0-1 years</option>
            <option>1-3 years</option>
            <option>Experienced</option>
          </select>
        </label>

        <label className="text-sm text-slate-200 sm:col-span-2">
          Official company apply URL
          <input className={field} type="url" value={applyUrl} onChange={(event) => { setApplyUrl(event.target.value); setPreview(false); }} placeholder="https://careers.company.com/job/..." required maxLength={2048} />
          <span className="mt-1 block text-xs text-slate-400">
            HTTPS links only.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950" type="submit">
            <Eye className="h-4 w-4" /> Preview mapping
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm" type="button" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          {validHttpsUrl && (
            <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-cyan-200 underline">
              <ExternalLink className="h-4 w-4" /> Check apply link
            </a>
          )}
        </div>
      </form>

      {preview && (
        <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">Local preview · Not saved</p>
          <h2 className="mt-3 text-xl font-semibold">{role}</h2>
          <p className="mt-1 text-sm text-slate-300">{location} · {experience}</p>
          <p className="mt-3 break-all text-sm text-slate-400">Instagram Media ID: {mediaId}</p>
          <p className="mt-2 break-all text-sm text-cyan-200">{applyUrl}</p>
          {!validHttpsUrl && <p className="mt-3 text-sm text-amber-200">Please enter a valid HTTPS apply URL before using this mapping in a future live version.</p>}
        </section>
      )}
    </main>
  );
}
