import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ShieldCheck, Link2, Save, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/emergency")({
  component: EmergencyAdminPage,
  head: () => ({
    meta: [
      { title: "Emergency Automation — Hire Daily Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const emergencyApiBase = (import.meta.env.VITE_EMERGENCY_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

type Mapping = {
  mediaId: string;
  role: string;
  location: string;
  experience: string;
  applyUrl: string;
};

function EmergencyAdminPage() {
  const [mapping, setMapping] = useState<Mapping>({
    mediaId: "",
    role: "",
    location: "",
    experience: "Fresher",
    applyUrl: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [mappings, setMappings] = useState<Array<{mediaId:string;role:string;location:string;experience:string;applyUrl:string;updatedAt:string}>>([]);
  const [serviceConfigured, setServiceConfigured] = useState<boolean | null>(null);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch(`${emergencyApiBase}/api/emergency/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const payload = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!response.ok || !payload.token) {
        setStatus(payload.error || "Access code accept nahi hua.");
        return;
      }
      setSessionToken(payload.token);
      setSecret("");
      setStatus("Admin session active (30 minutes).");
      const listResponse = await fetch(`${emergencyApiBase}/api/emergency/mappings", { headers: { Authorization: `Bearer ${payload.token}` }, cache: "no-store" });
      if (listResponse.ok) { const listPayload = await listResponse.json() as { mappings?: typeof mappings }; setMappings(listPayload.mappings || []); }
    } catch {
      setStatus("Emergency API reachable nahi hai.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch(`${emergencyApiBase}/api/emergency/status")
      .then(async (response) => {
        if (!response.ok) throw new Error("status unavailable");
        return response.json();
      })
      .then((data: { configured?: boolean }) => {
        if (active) setServiceConfigured(Boolean(data.configured));
      })
      .catch(() => { if (active) setServiceConfigured(false); });
    return () => { active = false; };
  }, []);

  const update = (key: keyof Mapping, value: string) =>
    setMapping((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    let url: URL;
    try {
      url = new URL(mapping.applyUrl);
    } catch {
      setStatus("Official apply link valid URL hona chahiye.");
      return;
    }
    if (url.protocol !== "https:") {
      setStatus("Security ke liye apply link HTTPS hona chahiye.");
      return;
    }
    if (!/^\d{5,30}$/.test(mapping.mediaId.trim())) {
      setStatus("Instagram Media/Post ID enter karo (Instagram URL nahi).");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${emergencyApiBase}/api/emergency/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        credentials: "same-origin",
        body: JSON.stringify({ ...mapping, mediaId: mapping.mediaId.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setStatus(payload.error || "Emergency API abhi configured nahi hai. Mapping save nahi hui.");
        return;
      }
      setStatus(payload.message || "Mapping save ho gayi.");
      const listResponse = await fetch(`${emergencyApiBase}/api/emergency/mappings", { headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" });
      if (listResponse.ok) { const listPayload = await listResponse.json() as { mappings?: typeof mappings }; setMappings(listPayload.mappings || []); }
      setMapping({ mediaId: "", role: "", location: "", experience: "Fresher", applyUrl: "" });
    } catch {
      setStatus("Emergency API reachable nahi hai. Koi mapping save nahi hui.");
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400";
  return (
    <div className="mx-auto min-h-[75vh] max-w-4xl px-4 py-8 text-white sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3"><ShieldCheck className="h-6 w-6 text-cyan-300" /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Hire Daily · Admin only</p>
          <h1 className="mt-1 text-3xl font-bold">Emergency Automation</h1>
          <p className="mt-2 text-sm text-slate-300">Instagram post ko official company application link se map karo.</p>
        </div>
      </div>

      <div className="mb-6 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p><strong>Setup status:</strong> {serviceConfigured === null ? "Checking backend…" : serviceConfigured ? "Backend configuration detected; test storage and Meta webhook before use." : "Backend/storage secrets abhi configure nahi hain. Save/login kaam nahi karega."} Comment/DM webhook integration abhi alag se complete aur test hona zaroori hai.</p>
      </div>

      {!sessionToken ? <form onSubmit={login} className="mb-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5"><label className="text-sm text-slate-200">Emergency admin access code<input className={field} type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} required maxLength={256} /></label><button disabled={busy} className="w-fit rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50" type="submit">{busy ? "Checking…" : "Unlock admin"}</button></form> : <button className="mb-5 rounded-xl border border-white/15 px-4 py-2 text-sm" onClick={() => { setSessionToken(""); setStatus("Logged out."); }}>Lock admin</button>}
      <form onSubmit={save} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2">
        <label className="text-sm text-slate-200 sm:col-span-2">Instagram Media/Post ID
          <input className={field} value={mapping.mediaId} onChange={(e) => update("mediaId", e.target.value)} placeholder="e.g. 17900000000000000" required inputMode="numeric" />
          <span className="mt-1 block text-xs text-slate-400">Post ka numeric media ID; public post URL alag ho sakta hai.</span>
        </label>
        <label className="text-sm text-slate-200">Job role
          <input className={field} value={mapping.role} onChange={(e) => update("role", e.target.value)} placeholder="Data Analyst" required maxLength={100} />
        </label>
        <label className="text-sm text-slate-200">Location
          <input className={field} value={mapping.location} onChange={(e) => update("location", e.target.value)} placeholder="Hyderabad / Remote" required maxLength={100} />
        </label>
        <label className="text-sm text-slate-200">Experience
          <select className={field} value={mapping.experience} onChange={(e) => update("experience", e.target.value)}>
            <option>Fresher</option><option>Internship</option><option>0-1 years</option><option>1-3 years</option><option>Experienced</option>
          </select>
        </label>
        <label className="text-sm text-slate-200 sm:col-span-2">Official company apply URL
          <input className={field} type="url" value={mapping.applyUrl} onChange={(e) => update("applyUrl", e.target.value)} placeholder="https://careers.company.com/job/..." required maxLength={2048} />
          <span className="mt-1 block text-xs text-slate-400">HTTPS only. DM button ko direct isi URL par bhejne ke liye use hoga.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button disabled={busy || !sessionToken} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50" type="submit"><Save className="h-4 w-4" />{busy ? "Saving…" : "Save mapping"}</button>
          {mapping.applyUrl.startsWith("https://") && <a href={mapping.applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-cyan-200 underline"><ExternalLink className="h-4 w-4" />Check apply link</a>}
        </div>
        {status && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm sm:col-span-2">{status}</p>}
      </form>
      {sessionToken && <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-lg font-semibold">Saved mappings</h2>{mappings.length === 0 ? <p className="mt-3 text-sm text-slate-400">No saved mappings yet.</p> : <div className="mt-3 space-y-3">{mappings.map((item) => <div key={item.mediaId} className="rounded-xl border border-white/10 p-3 text-sm"><p className="font-semibold">{item.role} · {item.location}</p><p className="mt-1 text-xs text-slate-400">Post ID: {item.mediaId} · {item.experience}</p><a className="mt-2 inline-block break-all text-cyan-200 underline" href={item.applyUrl} target="_blank" rel="noopener noreferrer">{item.applyUrl}</a></div>)}</div>}</section>}
      <div className="mt-5 flex gap-2 text-xs text-slate-400"><Link2 className="h-4 w-4 shrink-0" /><p>Mapping persistence, admin authentication, webhook signature validation, rate limiting, and duplicate-event protection must be implemented server-side before production use. Secret keys must be configured in hosting environment variables, never in this page.</p></div>
    </div>
  );
}
