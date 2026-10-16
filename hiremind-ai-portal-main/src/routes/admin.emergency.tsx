import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ShieldCheck, Link2, Save, ExternalLink, RefreshCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/emergency")({
  component: EmergencyAdminPage,
  head: () => ({
    meta: [
      { title: "Emergency Automation — Hire Daily Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type InstagramPost = { id: string; caption: string; media_type?: string; permalink?: string; timestamp?: string };

type Mapping = {
  mediaId: string;
  company: string;
  role: string;
  location: string;
  experience: string;
  applyUrl: string;
};

function EmergencyAdminPage() {
  const [mapping, setMapping] = useState<Mapping>({
    mediaId: "",
    company: "",
    role: "",
    location: "",
    experience: "Fresher",
    applyUrl: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("prathmeshbobade33@gmail.com");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [mappings, setMappings] = useState<Array<{mediaId:string;company:string;role:string;location:string;experience:string;applyUrl:string;updatedAt:string}>>([]);
  const [serviceConfigured, setServiceConfigured] = useState<boolean | null>(null);
  const [availablePosts, setAvailablePosts] = useState<InstagramPost[]>([]);
  const [postsBusy, setPostsBusy] = useState(false);
  const [webhookSubscription, setWebhookSubscription] = useState<{subscribed:boolean;subscribedFields:string[];message:string;callbackPath:string;error?:string}|null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [automationChecks, setAutomationChecks] = useState<{d1Reachable:boolean;mappingCount:number|null;metaAccessTokenConfigured:boolean;metaAppSecretConfigured:boolean;emergencyVerifyTokenConfigured:boolean;instagramBusinessIdConfigured:boolean;webhookCallbackPath:string;readyForCommentAutomation:boolean} | null>(null);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setBusy(true);
    try {
      const response = await fetch(`/api/emergency/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!response.ok || !payload.token) {
        setStatus(payload.error || "Access code accept nahi hua.");
        return;
      }
      setSessionToken(payload.token);
      setPassword("");
      setStatus("Admin session active (30 minutes).");
      const listResponse = await fetch(`/api/emergency/mappings`, { headers: { Authorization: `Bearer ${payload.token}` }, cache: "no-store" });
      if (listResponse.ok) { const listPayload = await listResponse.json() as { mappings?: typeof mappings }; setMappings(listPayload.mappings || []); }
      await refreshPosts(payload.token);
      await refreshAutomationStatus(payload.token);
      await checkWebhookSubscription();
    } catch {
      setStatus("Emergency API reachable nahi hai.");
    } finally {
      setBusy(false);
    }
  }


  async function checkWebhookSubscription() {
    if (!sessionToken) return;
    setSubscriptionBusy(true);
    try {
      const response = await fetch("/api/emergency/webhook-subscription", { headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as {subscribed?:boolean;subscribedFields?:string[];message?:string;callbackPath?:string;error?:string};
      setWebhookSubscription({...payload,subscribed:Boolean(payload.subscribed),subscribedFields:payload.subscribedFields || [],message:payload.message || "",callbackPath:payload.callbackPath || "/webhooks/instagram"});
    } catch { setWebhookSubscription({subscribed:false,subscribedFields:[],message:"Subscription status check failed.",callbackPath:"/webhooks/instagram"}); }
    finally { setSubscriptionBusy(false); }
  }

  async function subscribeEmergencyWebhook() {
    if (!sessionToken || !window.confirm("Subscribe this Instagram account to comments and messages for the emergency automation? This changes only the Instagram account's Meta webhook subscription; it does not edit the legacy automation code.")) return;
    setSubscriptionBusy(true);
    try {
      const response = await fetch("/api/emergency/webhook-subscription", { method: "POST", headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as {subscribed?:boolean;subscribedFields?:string[];message?:string;callbackPath?:string;error?:string};
      setWebhookSubscription({...payload,subscribed:Boolean(payload.subscribed),subscribedFields:payload.subscribedFields || [],message:payload.message || "",callbackPath:payload.callbackPath || "/webhooks/instagram"});
    } catch { setWebhookSubscription({subscribed:false,subscribedFields:[],message:"Subscription request failed.",callbackPath:"/webhooks/instagram"}); }
    finally { setSubscriptionBusy(false); }
  }

  async function refreshAutomationStatus(token = sessionToken) {
    if (!token) return;
    try {
      const response = await fetch("/api/emergency/automation-status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as { checks?: Omit<NonNullable<typeof automationChecks>, "readyForCommentAutomation">; readyForCommentAutomation?: boolean; error?: string };
      if (!response.ok || !payload.checks) throw new Error(payload.error || "Automation status unavailable");
      setAutomationChecks({ ...payload.checks, readyForCommentAutomation: Boolean(payload.readyForCommentAutomation) });
    } catch {
      setAutomationChecks(null);
    }
  }

  async function refreshPosts(token = sessionToken) {
    if (!token) return;
    setPostsBusy(true);
    try {
      const response = await fetch("/api/emergency/instagram-media", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as { posts?: InstagramPost[]; error?: string };
      if (!response.ok) throw new Error(payload.error || `Instagram API failed (${response.status})`);
      const posts = Array.isArray(payload.posts) ? payload.posts : [];
      setAvailablePosts(posts);
      setStatus(posts.length ? `${posts.length} Instagram posts loaded.` : "Instagram API ne 0 posts return kiye. Account/token/permissions check karo.");
    } catch (error) {
      setAvailablePosts([]);
      setStatus(error instanceof Error ? error.message : "Instagram posts load nahi hue.");
    } finally {
      setPostsBusy(false);
    }
  }

  function selectPost(mediaId: string) {
    const post = availablePosts.find((item) => item.id === mediaId);
    if (!post) {
      update("mediaId", mediaId);
      return;
    }
    const caption = post.caption || "";
    const company = caption.match(/(?:company|company name)\s*[:—-]\s*([^\n|]+)/i)?.[1]?.trim() || "";
    const role = caption.match(/(?:role|job title|position)\s*[:—-]\s*([^\n|]+)/i)?.[1]?.trim() || "";
    const applyUrl = caption.match(/https?:\/\/[^\s<>\]]+/i)?.[0]?.replace(/[),.]+$/, "") || "";
    setMapping((current) => ({
      ...current,
      mediaId: post.id,
      company: company || current.company,
      role: role || current.role,
      applyUrl: applyUrl || current.applyUrl,
    }));
    setStatus(company && role && applyUrl
      ? "Post selected; ID, company, role aur apply link auto-filled."
      : "Post select hua. Caption mein jo fields mile fill kiye; baaki manually complete karo.");
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/emergency/status`)
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

  function editMapping(item: {mediaId:string;company:string;role:string;location:string;experience:string;applyUrl:string}) {
    setMapping({
      mediaId: item.mediaId,
      company: item.company,
      role: item.role,
      location: item.location,
      experience: item.experience,
      applyUrl: item.applyUrl,
    });
    setStatus(`Loaded saved mapping for ${item.company}. Save mapping dabane par isi post ki mapping update hogi.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMapping(mediaId: string) {
    if (!window.confirm(`Delete saved mapping for post ${mediaId}? This does not delete the Instagram post.`)) return;
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch(`/api/emergency/mappings/${encodeURIComponent(mediaId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Mapping delete nahi hui.");
      setMappings((current) => current.filter((item) => item.mediaId !== mediaId));
      setAvailablePosts((current) => [...current]);
      setStatus(payload.message || "Saved mapping deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Mapping delete nahi hui.");
    } finally {
      setBusy(false);
    }
  }

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
      const response = await fetch(`/api/emergency/mappings`, {
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
      const listResponse = await fetch(`/api/emergency/mappings`, { headers: { Authorization: `Bearer ${sessionToken}` }, cache: "no-store" });
      if (listResponse.ok) { const listPayload = await listResponse.json() as { mappings?: typeof mappings }; setMappings(listPayload.mappings || []); }
      setMapping({ mediaId: "", company: "", role: "", location: "", experience: "Fresher", applyUrl: "" });
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
        <p><strong>Setup status:</strong> {serviceConfigured === null ? "Checking backend…" : serviceConfigured ? "Backend configuration detected; test storage and Meta webhook before use." : "Backend/storage secrets abhi configure nahi hain. Save/login kaam nahi karega."} Ye separate login aur D1 mappings hain. Meta comment/DM webhook integration ko deploy ke baad end-to-end test karna hoga.</p>
      </div>

      {!sessionToken ? <form onSubmit={login} className="mb-5 grid gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5"><label className="text-sm text-slate-200">Admin email<input className={field} type="email" autoComplete="username" value={email} readOnly required maxLength={254} /></label><label className="text-sm text-slate-200">Password<input className={field} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={256} /></label><button disabled={busy} className="w-fit rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50" type="submit">{busy ? "Checking…" : "Unlock admin"}</button></form> : <button className="mb-5 rounded-xl border border-white/15 px-4 py-2 text-sm" onClick={() => { setSessionToken(""); setStatus("Logged out."); }}>Lock admin</button>}
      {sessionToken && <section className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/[.05] p-5">
        <h2 className="text-lg font-semibold">Comment → Reply + DM readiness</h2>
        {!automationChecks ? <p className="mt-2 text-sm text-slate-400">Checking backend configuration…</p> : <>
          <p className={`mt-2 text-sm font-semibold ${automationChecks.readyForCommentAutomation ? "text-emerald-300" : "text-amber-200"}`}>{automationChecks.readyForCommentAutomation ? "Configuration checks passed; Meta webhook delivery still needs a live test." : "Automation is not ready: one or more backend configuration checks failed."}</p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <li>{automationChecks.d1Reachable ? "✅" : "❌"} Cloudflare D1 reachable ({automationChecks.mappingCount ?? "unknown"} saved mappings)</li>
            <li>{automationChecks.metaAccessTokenConfigured ? "✅" : "❌"} Meta access token configured</li>
            <li>{automationChecks.metaAppSecretConfigured ? "✅" : "❌"} Meta app secret configured</li>
            <li>{automationChecks.emergencyVerifyTokenConfigured ? "✅" : "❌"} Emergency webhook verify token configured</li>
            <li>{automationChecks.instagramBusinessIdConfigured ? "✅" : "❌"} Instagram account ID configured</li>
          </ul>
          <p className="mt-3 break-all text-xs text-slate-400">Meta callback URL: backend base URL + {automationChecks.webhookCallbackPath}</p>
          <button type="button" onClick={() => void refreshAutomationStatus()} className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs">Refresh automation checks</button>
          <div className="mt-4 rounded-xl border border-white/10 p-3">
            <p className="text-sm font-semibold">Meta webhook subscription</p>
            <p className="mt-1 text-xs text-slate-400">{webhookSubscription ? (webhookSubscription.error || webhookSubscription.message) : "Not checked yet."}</p>
            {webhookSubscription && <p className="mt-1 break-all text-xs text-slate-400">Subscribed fields: {webhookSubscription.subscribedFields.join(", ") || "none returned"} · Callback path: {webhookSubscription.callbackPath}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={subscriptionBusy} onClick={() => void checkWebhookSubscription()} className="rounded-lg border border-white/15 px-3 py-2 text-xs disabled:opacity-50">Check Meta subscription</button>
              <button type="button" disabled={subscriptionBusy} onClick={() => void subscribeEmergencyWebhook()} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-100 disabled:opacity-50">Subscribe comments + messages</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Meta App Dashboard mein callback URL/verify token aur webhook field subscriptions bhi configure hone chahiye.</p>
          </div>
        </>}
      </section>}
      {sessionToken && <section className="mb-5 rounded-2xl border border-cyan-400/25 bg-white/[.04] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><label className="min-w-0 flex-1 text-sm font-semibold text-slate-100">Available Instagram Posts<select className={field} value={mapping.mediaId} onChange={(e) => selectPost(e.target.value)}><option value="">Select a recent Instagram post…</option>{availablePosts.map((post) => <option key={post.id} value={post.id}>{(post.caption || "No caption").replace(/\\s+/g, " ").slice(0, 100)} · {post.id}</option>)}</select></label><button type="button" onClick={() => refreshPosts()} disabled={postsBusy} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${postsBusy ? "animate-spin" : ""}`} />{postsBusy ? "Refreshing…" : "Refresh posts"}</button></div><p className="mt-2 text-xs text-slate-400">Latest posts Instagram Graph API se load hote hain. Caption mein Company:, Role: aur apply URL ho toh auto-fill hoga.</p></section>}\n      <form onSubmit={save} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2">
        <label className="text-sm text-slate-200 sm:col-span-2">Instagram Media/Post ID
          <input className={field} value={mapping.mediaId} onChange={(e) => update("mediaId", e.target.value)} placeholder="e.g. 17900000000000000" required inputMode="numeric" />
          <span className="mt-1 block text-xs text-slate-400">Post ka numeric media ID; public post URL alag ho sakta hai.</span>
        </label>
        <label className="text-sm text-slate-200">Company name
          <input className={field} value={mapping.company} onChange={(e) => update("company", e.target.value)} placeholder="e.g. Quest Global" required maxLength={120} />
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
      {sessionToken && <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-lg font-semibold">Saved mappings</h2>{mappings.length === 0 ? <p className="mt-3 text-sm text-slate-400">No saved mappings yet.</p> : <div className="mt-3 space-y-3">{mappings.map((item) => <div key={item.mediaId} className="rounded-xl border border-white/10 p-3 text-sm"><p className="font-semibold">{item.company} · {item.role}</p><p className="text-xs text-slate-400">{item.location}</p><p className="mt-1 text-xs text-slate-400">Post ID: {item.mediaId} · {item.experience}</p><a className="mt-2 inline-block break-all text-cyan-200 underline" href={item.applyUrl} target="_blank" rel="noopener noreferrer">{item.applyUrl}</a><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => editMapping(item)} className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-100">Edit / Select mapping</button><button type="button" disabled={busy} onClick={() => void deleteMapping(item.mediaId)} className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete mapping</button></div></div>)}</div>}</section>}
      <div className="mt-5 flex gap-2 text-xs text-slate-400"><Link2 className="h-4 w-4 shrink-0" /><p>Is login ka purane Admin Login se koi relation nahi hai. Credentials aur mapping storage Cloudflare D1 se verify/store honge; secrets hosting environment variables mein hi rakho.</p></div>
    </div>
  );
}
