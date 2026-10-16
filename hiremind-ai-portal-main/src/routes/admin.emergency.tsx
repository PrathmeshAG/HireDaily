import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, RotateCcw, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { LoginCard, AccessDenied } from "./admin.index";
import {
  createPostMapping,
  createRule,
  createTemplate,
  getInstagramMedia,
  getSettings,
  syncInstagramMedia,
  type InstagramMedia,
} from "../admin/automation/services/automation-service";
import type { AutomationSettings } from "../admin/automation/types";

export const Route = createFileRoute("/admin/emergency")({
  component: EmergencyAdminPage,
  head: () => ({ meta: [
    { title: "Emergency Automation — Hire Daily Admin" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
});

const DEFAULT_COMMENTS = [
  "Thanks for your interest! Apply using the official company link in our DM. 👇",
  "Hey! 👋 We’ve sent you the official application link via DM.",
  "Interested in this role? Check the official apply link in our DM. 🚀",
  "Thanks for checking this opportunity! The official application link is in our DM. 💼",
];
const DEFAULT_DM = "Hi! 👋 Thanks for your interest in the {role} opportunity at {company}.\n\n📍 Location: {location}\n🎓 Experience: {experience}\n\nApply here:\n{{jobLink}}\n\nGood luck! — Hire Daily";

function normalizePermalink(value: string) {
  return value.trim().replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
}
function isHttps(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function EmergencyAdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState("Fresher");
  const [applyUrl, setApplyUrl] = useState("");
  const [comments, setComments] = useState<string[]>(DEFAULT_COMMENTS);
  const [dm, setDm] = useState(DEFAULT_DM);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(false);

  const field = "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400";
  const selected = useMemo(() => media.find((item) => item.id === selectedId) ?? null, [media, selectedId]);
  const validPost = !!selected && !!selected.permalink && normalizePermalink(selected.permalink) === normalizePermalink(postUrl);
  const previewDm = dm
    .replaceAll("{company}", company || "[Company]")
    .replaceAll("{role}", role || "[Job role]")
    .replaceAll("{location}", location || "[Location]")
    .replaceAll("{experience}", experience)
    .replaceAll("{{jobLink}}", applyUrl || "[Official apply link]");

  async function loadMedia(refresh = false) {
    setLoadingMedia(true); setError("");
    try {
      const items = refresh ? await syncInstagramMedia(100) : await getInstagramMedia(100);
      setMedia(items);
      if (selectedId && !items.some((item) => item.id === selectedId)) setSelectedId("");
      if (items.length === 0) setError("No Instagram posts returned. Check Meta connection/token and try Refresh posts.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Instagram posts. Check backend URL and admin login.");
    } finally { setLoadingMedia(false); }
  }

  useEffect(() => {
    if (!user || !isAdmin) return;
    void Promise.all([
      loadMedia(false),
      getSettings().then(setSettings).catch((e) => setError(e instanceof Error ? e.message : "Could not read automation status.")),
    ]);
  // Initial load only after auth has resolved.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    if (!selected) return;
    setPostUrl(selected.permalink ?? "");
  }, [selected]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <LoginCard />;
  if (!isAdmin) return <AccessDenied />;

  function reset() {
    setSelectedId(""); setPostUrl(""); setCompany(""); setRole(""); setLocation(""); setExperience("Fresher");
    setApplyUrl(""); setComments(DEFAULT_COMMENTS); setDm(DEFAULT_DM); setPreview(false); setError(""); setSuccess("");
  }

  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!selected || !validPost) { setError("Select the exact post from Instagram media. Use Refresh posts if it is missing."); return; }
    if (!isHttps(applyUrl)) { setError("Official application URL must use HTTPS."); return; }
    if (!company.trim() || !role.trim() || !location.trim()) { setError("Complete company, role and location."); return; }
    const activeComments = comments.map((item) => item.trim()).filter(Boolean);
    if (activeComments.length < 1 || activeComments.length > 4) { setError("Enter 1–4 comment templates."); return; }
    if (!dm.trim()) { setError("DM template cannot be empty."); return; }
    if (!settings?.system?.firebaseConfigured || !settings?.system?.metaConfigured || !settings?.webhook?.subscribed) {
      setError("Automation is not ready: verify Firebase, Meta connection and webhook status in /admin/automation → Settings before activating.");
      return;
    }
    setBusy(true);
    try {
      // Persist an external-only mapping: jobs/* remains read-only.
      await createPostMapping({
        channel: "instagram",
        mediaId: selected.id,
        instagramPostUrl: selected.permalink!,
        thumbnailUrl: selected.thumbnailUrl ?? selected.mediaUrl ?? "",
        companyName: company.trim(),
        jobTitle: role.trim(),
        jobId: "",
        extraLinks: [{ type: "external", url: applyUrl.trim(), label: role.trim() + " — " + company.trim() }],
      });

      const commentTemplateIds: string[] = [];
      for (let i = 0; i < activeComments.length; i++) {
        const template = await createTemplate({
          kind: "comment", channel: "instagram",
          name: "Emergency " + company.trim() + " comment " + (i + 1) + " — " + Date.now(),
          text: activeComments[i],
        });
        commentTemplateIds.push(template.id);
      }
      const renderedDm = dm
        .replaceAll("{company}", company.trim())
        .replaceAll("{role}", role.trim())
        .replaceAll("{location}", location.trim())
        .replaceAll("{experience}", experience);
      if (!renderedDm.includes("{{jobLink}}")) throw new Error("DM template must include {{jobLink}} so the official apply URL is delivered.");
      const dmTemplate = await createTemplate({
        kind: "dm", channel: "instagram",
        name: "Emergency " + company.trim() + " DM — " + Date.now(),
        text: renderedDm,
      });
      const now = Date.now();
      await createRule({
        channel: "instagram",
        mode: "any_comment",
        keywords: [],
        matchType: "contains",
        scope: "specific_post",
        postId: selected.id,
        postLabel: selected.permalink!,
        commentTemplateId: commentTemplateIds[0] ?? null,
        commentTemplateIds: commentTemplateIds.slice(1),
        dmTemplateId: dmTemplate.id,
        replyMode: "comment_and_dm",
        cooldownMinutes: 0,
        activeFrom: null,
        activeUntil: null,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      setSuccess(settings.system?.dryRun
        ? "Rule saved and activated in DRY-RUN mode. Instagram comments/DMs are simulated, not sent."
        : "Automation rule saved and activated for the selected post. Existing Meta webhook/backend will process eligible new comments.");
    } catch (e) {
      setError((e instanceof Error ? e.message : "Activation failed") + " — check /admin/automation → Rules, Templates and Post Mapping for any partial records before retrying.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto min-h-[75vh] max-w-4xl px-4 py-8 text-white sm:px-6">
      <header className="mb-6 flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3"><ShieldCheck className="h-6 w-6 text-cyan-300" /></div>
        <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Hire Daily · Admin</p>
          <h1 className="mt-1 text-3xl font-bold">Emergency Automation</h1>
          <p className="mt-2 text-sm text-slate-300">Select an existing Instagram post, add the official apply link, then save a post-specific comment + DM rule.</p></div>
      </header>

      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">Automation status</p><p className="mt-1 text-slate-300">Instagram: {settings?.instagram.connected ? "Connected" : "Not confirmed"} · Webhook: {settings?.webhook.subscribed ? "Subscribed" : "Not confirmed"} · Firebase: {settings?.system?.firebaseConfigured ? "Ready" : "Not confirmed"}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs ${settings?.system?.dryRun ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"}`}>{settings ? (settings.system?.dryRun ? "DRY-RUN — no messages sent" : "LIVE MODE") : "Checking status…"}</span>
        </div>
        {settings?.system?.dryRun && <p className="mt-2 text-amber-200">Dry-run is enabled on the backend. Rules can be saved, but Meta messages will not be sent until the backend is intentionally configured for live mode.</p>}
      </section>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
      {success && <div role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />{success}</div>}

      <form onSubmit={activate} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2">
        <section className="sm:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">1. Choose Instagram post / reel</h2><p className="mt-1 text-xs text-slate-400">Choose from posts fetched using the existing Meta API. No manual Media ID required.</p></div>
            <button type="button" onClick={() => void loadMedia(true)} disabled={loadingMedia} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm disabled:opacity-50">{loadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh posts</button></div>
          <div className="mt-3 grid gap-2">
            <label className="text-sm text-slate-200">Available posts
              <select className={field} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setPreview(false); }} required>
                <option value="">Select a post…</option>
                {media.map((item) => <option key={item.id} value={item.id}>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() + " · " : ""}{(item.caption || item.permalink || item.id).replace(/\s+/g, " ").slice(0, 100)}{item.mediaType ? " · " + item.mediaType : ""}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-200">Selected post URL
              <input className={field} value={postUrl} onChange={(e) => { setPostUrl(e.target.value); setPreview(false); }} type="url" placeholder="Select a post above" required />
              <span className="mt-1 block text-xs text-slate-400">Post URL must match the selected Meta media item.</span>
            </label>
            {selected?.permalink && <a className="inline-flex w-fit items-center gap-2 text-sm text-cyan-200 underline" href={selected.permalink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Open selected post</a>}
            {media.length === 0 && !loadingMedia && <p className="text-xs text-amber-200">No posts loaded. Check status and use Refresh posts. The existing Meta API returns up to 100 recent media items.</p>}
          </div>
        </section>

        <label className="text-sm text-slate-200">Company name<input className={field} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Quest Global" required maxLength={100} /></label>
        <label className="text-sm text-slate-200">Job role<input className={field} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Data Analyst" required maxLength={100} /></label>
        <label className="text-sm text-slate-200">Location<input className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Hyderabad / Remote" required maxLength={100} /></label>
        <label className="text-sm text-slate-200">Experience<select className={field} value={experience} onChange={(e) => setExperience(e.target.value)}><option>Fresher</option><option>Internship</option><option>0-1 years</option><option>1-3 years</option><option>Experienced</option></select></label>
        <label className="text-sm text-slate-200 sm:col-span-2">Official company apply URL<input className={field} type="url" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="https://careers.company.com/job/..." required maxLength={2048} /><span className="mt-1 block text-xs text-slate-400">HTTPS required. This exact official URL will be delivered in the DM.</span></label>

        <section className="sm:col-span-2"><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">2. Comment reply options (choose one per reply)</h2><span className="text-xs text-cyan-200">{comments.filter((item) => item.trim()).length}/4</span></div>
          <div className="grid gap-3">{comments.map((template, index) => <label key={index} className="text-sm text-slate-200">Option {index + 1}<textarea className={field} rows={2} value={template} onChange={(e) => setComments((current) => current.map((item, i) => i === index ? e.target.value : item))} maxLength={1000} /></label>)}</div>
        </section>
        <label className="text-sm text-slate-200 sm:col-span-2">3. DM template<textarea className={field} rows={7} value={dm} onChange={(e) => setDm(e.target.value)} required maxLength={3000} /><span className="mt-1 block text-xs text-slate-400">Placeholders: {"{company}"}, {"{role}"}, {"{location}"}, {"{experience}"}, and required {"{{jobLink}}"} for the official URL.</span></label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button type="button" onClick={() => { setError(""); setSuccess(""); setPreview(true); }} className="rounded-xl border border-white/15 px-4 py-3 text-sm">Preview</button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm"><RotateCcw className="h-4 w-4" /> Reset form</button>
          <button type="submit" disabled={busy || !settings || !validPost || !isHttps(applyUrl)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{busy ? "Saving automation…" : "Save & activate automation"}</button>
        </div>
      </form>

      {preview && <section className="mt-5 space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">Preview — nothing sent by preview</p><div><h3 className="font-semibold">Comment options</h3><ol className="mt-2 list-decimal space-y-2 pl-5">{comments.filter((item) => item.trim()).map((item, i) => <li key={i} className="text-sm text-slate-300">{item}</li>)}</ol></div><div><h3 className="font-semibold">Rendered DM</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-300">{previewDm}</p></div><p className="text-xs text-slate-400">Activation creates a specific-post rule, mapping and templates in the existing automation backend. If a request fails midway, inspect Rules / Templates / Post Mapping before retrying to avoid duplicates.</p></section>}
    </main>
  );
}
