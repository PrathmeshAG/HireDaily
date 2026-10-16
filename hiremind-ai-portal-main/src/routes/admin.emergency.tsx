import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, LogOut, RefreshCw, Save, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/emergency")({
  component: EmergencyAdminPage,
  head: () => ({ meta: [
    { title: "Emergency Automation — Hire Daily Admin" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
});

type Mapping = {
  mediaId: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  applyUrl: string;
  updatedAt?: string;
};

const API_BASE = (import.meta.env.VITE_EMERGENCY_API_URL as string | undefined)?.trim()
  || (import.meta.env.DEV ? "http://localhost:8787" : "https://hiredaily-backend.vercel.app");
const TOKEN_KEY = "hiredaily_emergency_session";
const emptyForm = { mediaId: "", company: "", role: "", location: "", experience: "Fresher", applyUrl: "" };
const inputClass = "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

function safeHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function EmergencyAdminPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadMappings = useCallback(async (activeToken: string) => {
    const data = await api<{ mappings: Mapping[] }>("/api/emergency/mappings", {}, activeToken);
    setMappings(data.mappings || []);
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const data = await api<{ configured: boolean; storage: string }>("/api/emergency/status");
      setConfigured(data.configured);
    } catch {
      setConfigured(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await checkStatus();
      const saved = typeof window !== "undefined" ? window.sessionStorage.getItem(TOKEN_KEY) || "" : "";
      if (saved && active) {
        try {
          await loadMappings(saved);
          if (active) setToken(saved);
        } catch {
          window.sessionStorage.removeItem(TOKEN_KEY);
        }
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [checkStatus, loadMappings]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setLoggingIn(true);
    try {
      const result = await api<{ token: string; expiresInSeconds: number }>("/api/emergency/login", {
        method: "POST", body: JSON.stringify({ email: email.trim(), password }),
      });
      window.sessionStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setPassword("");
      await loadMappings(result.token);
      setSuccess("Emergency admin session active for 30 minutes.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
    } finally { setLoggingIn(false); }
  }

  async function saveMapping(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!/^\d{5,30}$/.test(form.mediaId.trim())) {
      setError("Enter the numeric Instagram media ID (5–30 digits).");
      return;
    }
    if (!safeHttps(form.applyUrl)) {
      setError("Use a valid official HTTPS application link.");
      return;
    }
    setSaving(true);
    try {
      const result = await api<{ message: string }>("/api/emergency/mappings", {
        method: "POST",
        body: JSON.stringify({ ...form, mediaId: form.mediaId.trim(), company: form.company.trim(), role: form.role.trim(), location: form.location.trim(), experience: form.experience.trim(), applyUrl: form.applyUrl.trim() }),
      }, token);
      await loadMappings(token);
      setSuccess(result.message || "Mapping saved.");
      setForm(emptyForm);
    } catch (e) {
      if (e instanceof Error && /session|unauthorized/i.test(e.message)) logout();
      setError(e instanceof Error ? e.message : "Could not save mapping.");
    } finally { setSaving(false); }
  }

  function logout() {
    window.sessionStorage.removeItem(TOKEN_KEY);
    setToken(""); setMappings([]); setPassword(""); setSuccess(""); setError("");
  }

  const field = (label: string, key: keyof typeof emptyForm, placeholder: string, required = true) => (
    <label className="block text-sm text-slate-200">
      {label}
      <input className={inputClass} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} required={required} maxLength={key === "applyUrl" ? 2048 : key === "mediaId" ? 30 : 120} />
    </label>
  );

  return (
    <main className="mx-auto min-h-[75vh] max-w-5xl px-4 py-8 text-white sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3"><ShieldCheck className="h-6 w-6 text-cyan-300" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Hire Daily · Separate admin</p>
            <h1 className="mt-1 text-3xl font-bold">Emergency Automation</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Map an Instagram post to its official job link. This panel uses isolated Cloudflare D1 storage, not the legacy Firebase automation.</p>
          </div>
        </div>
        {token && <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"><LogOut className="h-4 w-4" /> Sign out</button>}
      </header>

      <section className={`mb-5 flex gap-3 rounded-2xl border p-4 text-sm ${configured ? "border-emerald-400/25 bg-emerald-400/5 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
        {configured ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
        <div><p className="font-semibold">{configured ? "Emergency storage configured" : "Emergency service unavailable"}</p><p className="mt-1 opacity-90">{configured ? "Separate D1 admin API detected. Login is rate-limited and the session expires after 30 minutes." : "The emergency backend is not reporting as configured. Check its preview deployment and environment settings; no production automation has been changed."}</p></div>
        <button type="button" onClick={() => void checkStatus()} className="ml-auto h-fit rounded-lg border border-current/20 p-2" aria-label="Refresh service status"><RefreshCw className="h-4 w-4" /></button>
      </section>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
      {success && <div role="status" className="mb-4 flex gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}

      {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div> : !token ? (
        <form onSubmit={login} className="mx-auto grid max-w-lg gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:p-7">
          <div><h2 className="text-xl font-semibold">Admin sign in</h2><p className="mt-1 text-sm text-slate-400">Use the separate emergency admin credentials.</p></div>
          <label className="block text-sm text-slate-200">Admin email<input className={inputClass} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="admin@example.com" /></label>
          <label className="block text-sm text-slate-200">Password<input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={256} placeholder="Enter admin password" /></label>
          <button disabled={loggingIn || !configured} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Sign in securely</button>
          <p className="text-xs text-slate-500">Session token stays in this tab’s session storage and is cleared when you sign out.</p>
        </form>
      ) : (
        <>
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/[.04] p-5">
            <div className="mb-5"><h2 className="text-xl font-semibold">Add / update job mapping</h2><p className="mt-1 text-sm text-slate-400">The media ID must match the post that receives the comment. Use the numeric ID from Instagram/Meta tools.</p></div>
            <form onSubmit={saveMapping} className="grid gap-4 sm:grid-cols-2">
              {field("Instagram media ID", "mediaId", "e.g. 17900000000000000")}
              {field("Company", "company", "Quest Global")}
              {field("Job role", "role", "Data Analyst")}
              {field("Location", "location", "Hyderabad / Remote")}
              <label className="block text-sm text-slate-200">Experience
                <select className={inputClass} value={form.experience} onChange={(e) => setForm((current) => ({ ...current, experience: e.target.value }))}><option>Fresher</option><option>Internship</option><option>0-1 years</option><option>1-2 years</option><option>1-3 years</option><option>Experienced</option></select>
              </label>
              <label className="block text-sm text-slate-200 sm:col-span-2">Official application URL
                <input className={inputClass} type="url" value={form.applyUrl} onChange={(e) => setForm((current) => ({ ...current, applyUrl: e.target.value }))} placeholder="https://careers.company.com/job/..." required maxLength={2048} />
                <span className="mt-1 block text-xs text-slate-400">HTTPS only. DM sends company, role and this link.</span>
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : "Save mapping"}</button>
                <button type="button" onClick={() => setForm(emptyForm)} className="rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/5">Clear form</button>
                {safeHttps(form.applyUrl) && <a className="inline-flex items-center gap-2 px-2 text-sm text-cyan-200 underline" href={form.applyUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Check apply link</a>}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Saved mappings</h2><p className="mt-1 text-sm text-slate-400">Stored in isolated D1 · latest 100 mappings</p></div><button type="button" onClick={() => { setError(""); void loadMappings(token).catch((e) => setError(e instanceof Error ? e.message : "Refresh failed.")); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/5"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
            {mappings.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">No mappings saved yet. Add the first post above.</p> : <div className="grid gap-3">{mappings.map((item) => <article key={item.mediaId} className="rounded-xl border border-white/10 bg-slate-950/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.role} <span className="font-normal text-slate-400">at</span> {item.company}</h3><p className="mt-1 text-sm text-slate-400">{item.location} · {item.experience}</p></div><button type="button" onClick={() => setForm({ mediaId: item.mediaId, company: item.company, role: item.role, location: item.location, experience: item.experience, applyUrl: item.applyUrl })} className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5">Edit in form</button></div><p className="mt-3 break-all text-xs text-slate-500">Media ID: {item.mediaId}</p><a href={item.applyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-sm text-cyan-200 underline"><ExternalLink className="h-3.5 w-3.5 shrink-0" />{item.applyUrl}</a></article>)}</div>}
          </section>
        </>
      )}
      <p className="mt-6 text-center text-xs text-slate-500">Emergency admin is isolated from the existing Firebase automation UI. Public replies and DMs are handled by the separate emergency webhook.</p>
    </main>
  );
}
