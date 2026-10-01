import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard, Plus, List, LogOut, Lock, ShieldAlert, Loader2, Trash2, Pencil,
  Search, Upload, Save, X, Briefcase, TrendingUp, Calendar, Mail, Eye, EyeOff,
  BadgeCheck, Clock3, CheckCircle2, ArrowRight, MapPin, Sparkles, AlertTriangle,
  ImagePlus, Building2, Tags, Layers, Link2, FileText, ShieldCheck,
} from "lucide-react";
import { auth, ADMIN_EMAIL, type Job } from "../lib/firebase";
import { useAuth } from "../lib/auth-context";
import { fetchJobs, createJob, updateJob, deleteJob, uploadLogo } from "../lib/jobs";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Hire Daily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Tab = "dashboard" | "add" | "manage";

/* ---------- constants & helpers ---------- */

const DAY = 86400000;
const todayStr = () => new Date().toISOString().slice(0, 10);
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isExpired = (j: Job) => !!j.lastDate && j.lastDate < todayStr();

const CATEGORIES = ["Software Development", "Data Analytics", "Data Science", "Cybersecurity", "Cloud & DevOps", "AI / ML", "Business Analyst", "QA / Testing", "UI / UX", "Data Engineer", "IT Support", "Other"];
const LOCATIONS = ["Pune", "Bengaluru", "Hyderabad", "Chennai", "Mumbai", "Navi Mumbai", "Noida", "Gurugram", "Kolkata", "Ahmedabad", "Remote", "PAN India"];
const EXPERIENCES = ["Fresher", "Entry Level", "Experienced", "Internship / Student", "1-2 Years", "2-5 Years", "5+ Years"];
const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote", "Hybrid"];

const inputCls =
  "ad-input w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50";

function useCountUp(target: number, ms = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduced()) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

function AdminStyles() {
  return (
    <style>{`
      .ad-rise { animation: adRise .7s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d,0ms); }
      .ad-tab { animation: adTab .55s cubic-bezier(.16,1,.3,1) both; }
      .ad-pop { animation: adPop .6s cubic-bezier(.34,1.4,.64,1) both; }
      .ad-shake { animation: adShake .5s ease; }
      .ad-orb { position: absolute; border-radius: 9999px; filter: blur(80px); pointer-events: none; animation: adDrift 14s ease-in-out infinite; }
      .ad-ring { position: relative; }
      .ad-ring::before { content: ""; position: absolute; inset: -4px; border-radius: inherit; background: conic-gradient(from 0deg,#00e5ff,#7c3aed,#ff4ecd,#00e5ff); filter: blur(8px); opacity: .75; animation: adSpin 4s linear infinite; }
      .ad-ring > * { position: relative; }
      .ad-pulse { animation: adPulse 2.4s ease-in-out infinite; }
      .ad-card { transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s, border-color .35s; }
      .ad-card:hover { transform: translateY(-5px); box-shadow: 0 22px 55px rgba(0,0,0,.28), 0 0 32px rgba(0,229,255,.08); }
      .ad-bar { transform-origin: bottom; transform: scaleY(0); animation: adGrowY 1s cubic-bezier(.16,1,.3,1) forwards; animation-delay: var(--d,0ms); }
      .ad-barx { transform-origin: left; transform: scaleX(0); animation: adGrowX 1s cubic-bezier(.16,1,.3,1) forwards; animation-delay: var(--d,0ms); }
      .ad-ind { transition: transform .5s cubic-bezier(.16,1,.3,1); }
      .ad-row { animation: adRow .5s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d,0ms); transition: background .25s, transform .25s; }
      .ad-row:hover { background: rgba(255,255,255,.03); transform: translateX(4px); }
      .ad-skel { background: linear-gradient(100deg, rgba(255,255,255,.04) 30%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.04) 70%); background-size: 220% 100%; animation: adShimmer 1.6s linear infinite; }
      .ad-shine { position: relative; overflow: hidden; }
      .ad-shine::after { content: ""; position: absolute; top: 0; left: -70%; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent); transform: skewX(-20deg); animation: adShine 3.4s ease-in-out infinite; pointer-events: none; }
      .ad-drop { transition: border-color .25s, background .25s, transform .25s; }
      .ad-drop.is-over { border-color: #00e5ff; background: rgba(0,229,255,.07); transform: scale(1.01); }
      @keyframes adRise { from { opacity: 0; transform: translate3d(0,26px,0); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
      @keyframes adTab { from { opacity: 0; transform: translate3d(0,18px,0) scale(.99); } to { opacity: 1; transform: none; } }
      @keyframes adPop { from { opacity: 0; transform: scale(.88) translateY(20px); } to { opacity: 1; transform: none; } }
      @keyframes adShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-10px); } 40% { transform: translateX(9px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(4px); } }
      @keyframes adDrift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(50px,-40px,0) scale(1.15); } }
      @keyframes adSpin { to { transform: rotate(360deg); } }
      @keyframes adPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(248,113,113,.45); } 50% { box-shadow: 0 0 0 14px rgba(248,113,113,0); } }
      @keyframes adGrowY { to { transform: scaleY(1); } }
      @keyframes adGrowX { to { transform: scaleX(1); } }
      @keyframes adRow { from { opacity: 0; transform: translate3d(-18px,0,0); } to { opacity: 1; transform: none; } }
      @keyframes adShimmer { to { background-position: -120% 0; } }
      @keyframes adShine { 0%,55% { left: -70%; } 100% { left: 130%; } }
      @media (prefers-reduced-motion: reduce) {
        .ad-rise,.ad-tab,.ad-pop,.ad-shake,.ad-orb,.ad-ring::before,.ad-pulse,.ad-row,.ad-skel,.ad-shine::after { animation: none !important; }
        .ad-bar { animation: none !important; transform: none !important; }
        .ad-barx { animation: none !important; transform: none !important; }
        .ad-card,.ad-ind,.ad-row { transition: none !important; }
      }
    `}</style>
  );
}

/* ---------- auth screens ---------- */

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AdminStyles />
        <div className="ad-ring flex h-16 w-16 items-center justify-center rounded-2xl bg-[#050816]">
          <Loader2 className="h-7 w-7 animate-spin text-[#00e5ff]" />
        </div>
      </div>
    );
  }
  if (!user) return <LoginCard />;
  if (!isAdmin) return <AccessDenied />;
  return <AdminDashboard />;
}

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Signed in");
    } catch (err) {
      toast.error((err as Error).message || "Sign in failed");
      setShake(true);
      window.setTimeout(() => setShake(false), 600);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-[78vh] max-w-md items-center px-4">
      <AdminStyles />
      <div className="ad-orb -left-28 top-10 h-72 w-72 bg-[#00e5ff]/20" />
      <div className="ad-orb -right-24 bottom-0 h-80 w-80 bg-[#7c3aed]/25" style={{ animationDelay: "-6s" }} />

      <form onSubmit={onSubmit} className={`glass-strong ad-pop relative w-full rounded-3xl p-8 ${shake ? "ad-shake" : ""}`}>
        <div className="ad-ring mx-auto h-16 w-16 rounded-2xl">
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed]">
            <Lock className="h-7 w-7 text-[#050816]" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          Admin sign in
        </h1>
        <p className="mt-1 text-center text-sm text-white/60">Restricted to authorized personnel only.</p>

        <div className="mt-8 space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="email" required autoComplete="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className={`${inputCls} pl-11`}
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pl-11 pr-12`}
            />
            <button
              type="button" onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="submit" disabled={busy}
            className="btn-glow ad-shine flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-white/35">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured with Firebase Authentication
        </p>
      </form>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <AdminStyles />
      <div className="ad-orb left-0 top-20 h-64 w-64 bg-red-500/15" />
      <div className="glass ad-pop relative w-full rounded-3xl p-8 text-center">
        <div className="ad-pulse mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 ring-1 ring-red-500/40">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          This account is not authorized. Only the designated admin email can access this area.
        </p>
        <button onClick={() => signOut(auth)} className="btn-ghost-glow mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ---------- shell ---------- */

function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="ad-rise mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          {title}
        </h1>
        {sub && <p className="mt-1 text-sm text-white/50">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { user } = useAuth();

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "add", label: "Add Job", icon: Plus },
    { id: "manage", label: "Manage Jobs", icon: List },
  ];
  const idx = tabs.findIndex((t) => t.id === tab);
  const initial = (user?.email?.[0] ?? "A").toUpperCase();

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-16">
      <AdminStyles />
      <div className="ad-orb -left-20 top-0 h-72 w-72 bg-[#00e5ff]/10" />
      <div className="ad-orb right-0 top-60 h-80 w-80 bg-[#7c3aed]/10" style={{ animationDelay: "-7s" }} />

      <div className="relative grid gap-6 md:grid-cols-[250px_1fr]">
        <aside className="glass ad-rise h-fit rounded-2xl p-3 md:sticky md:top-24">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] text-sm font-bold text-[#050816]">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-white/45">Signed in as</div>
              <div className="truncate text-sm text-white">{user?.email}</div>
            </div>
          </div>

          <nav className="relative flex flex-row gap-1 md:flex-col">
            <span
              aria-hidden
              className="ad-ind absolute inset-x-0 top-0 hidden h-11 rounded-xl bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-[#00e5ff]/30 md:block"
              style={{ transform: `translateY(${idx * 48}px)` }}
            />
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm transition md:justify-start ${
                  tab === t.id
                    ? "text-white max-md:bg-gradient-to-r max-md:from-[#00e5ff]/20 max-md:to-[#7c3aed]/20 max-md:ring-1 max-md:ring-[#00e5ff]/30"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </nav>
          <button
            onClick={() => signOut(auth).then(() => toast.success("Signed out"))}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm text-white/70 transition hover:bg-red-500/10 hover:text-red-300 md:justify-start"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </aside>

        <div key={tab} className="ad-tab min-w-0">
          {tab === "dashboard" && <DashboardTab goto={setTab} />}
          {tab === "add" && <AddJobTab onDone={() => setTab("manage")} />}
          {tab === "manage" && <ManageJobsTab />}
        </div>
      </div>
    </div>
  );
}

/* ---------- dashboard ---------- */

function StatCard({ label, value, icon: Icon, hue, i }: { label: string; value: number; icon: typeof Briefcase; hue: number; i: number }) {
  const n = useCountUp(value);
  return (
    <div
      className="ad-card ad-rise glass gradient-border relative overflow-hidden rounded-2xl p-5"
      style={{ ["--d" as string]: `${i * 70}ms`, background: `linear-gradient(135deg, hsl(${hue} 80% 55% / .14), transparent 70%)` }}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl" style={{ background: `hsl(${hue} 90% 60% / .18)` }} />
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-5 w-5 text-[#00e5ff]" />
      </div>
      <div className="relative mt-4 text-4xl font-bold text-white">{n}</div>
      <div className="relative mt-1 text-xs text-white/55">{label}</div>
    </div>
  );
}

function DashboardTab({ goto }: { goto: (t: Tab) => void }) {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const list = jobs ?? [];
  const now = Date.now();

  const stats = useMemo(() => {
    const active = list.filter((j) => !isExpired(j)).length;
    const cats = new Map<string, number>();
    list.forEach((j) => {
      const c = j.category?.trim() || "Uncategorized";
      cats.set(c, (cats.get(c) ?? 0) + 1);
    });
    const topCats = Array.from(cats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      const start = d.getTime();
      return { label: d.toLocaleDateString(undefined, { weekday: "short" }), count: list.filter((j) => j.createdAt >= start && j.createdAt < start + DAY).length };
    });
    return {
      active,
      expired: list.length - active,
      verified: list.filter((j) => j.verificationStatus === "verified").length,
      logos: list.filter((j) => j.companyLogo).length,
      categories: cats.size,
      today: list.filter((j) => now - j.createdAt < DAY).length,
      week: list.filter((j) => now - j.createdAt < 7 * DAY).length,
      topCats,
      days,
      maxDay: Math.max(1, ...days.map((d) => d.count)),
    };
  }, [list, now]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const cards = [
    { label: "Total jobs", value: list.length, icon: Briefcase, hue: 190 },
    { label: "Posted today", value: stats.today, icon: Calendar, hue: 170 },
    { label: "This week", value: stats.week, icon: TrendingUp, hue: 260 },
    { label: "Active listings", value: stats.active, icon: CheckCircle2, hue: 150 },
    { label: "Past deadline", value: stats.expired, icon: Clock3, hue: 20 },
    { label: "Verified", value: stats.verified, icon: BadgeCheck, hue: 200 },
    { label: "With logo", value: stats.logos, icon: ImagePlus, hue: 300 },
    { label: "Categories", value: stats.categories, icon: Layers, hue: 45 },
  ];

  return (
    <div className="space-y-6">
      <PageHead
        title={`${greeting}, admin`}
        sub={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        action={
          <button onClick={() => goto("add")} className="btn-glow ad-shine flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
            <Plus className="h-4 w-4" /> Post a job
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} i={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass ad-rise rounded-2xl p-6" style={{ ["--d" as string]: "300ms" }}>
          <h2 className="text-lg font-semibold text-white">Jobs posted, last 7 days</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {stats.days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-semibold text-white/70">{d.count}</span>
                <div
                  className="ad-bar w-full rounded-t-lg bg-gradient-to-t from-[#7c3aed] to-[#00e5ff]"
                  style={{ height: `${Math.max(6, (d.count / stats.maxDay) * 100)}%`, opacity: d.count ? 1 : 0.25, ["--d" as string]: `${400 + i * 90}ms` }}
                />
                <span className="text-[11px] text-white/45">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass ad-rise rounded-2xl p-6" style={{ ["--d" as string]: "380ms" }}>
          <h2 className="text-lg font-semibold text-white">Top categories</h2>
          <div className="mt-5 space-y-4">
            {stats.topCats.length === 0 && <p className="text-sm text-white/50">No data yet.</p>}
            {stats.topCats.map(([name, count], i) => (
              <div key={name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="truncate text-white/80">{name}</span>
                  <span className="text-white/45">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="ad-barx h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]"
                    style={{ width: `${(count / (stats.topCats[0]?.[1] || 1)) * 100}%`, ["--d" as string]: `${500 + i * 100}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass ad-rise rounded-2xl p-6" style={{ ["--d" as string]: "460ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent jobs</h2>
          <button onClick={() => goto("manage")} className="inline-flex items-center gap-1 text-sm text-[#00e5ff] hover:text-white">
            Manage all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="ad-skel h-14 rounded-xl" />)}
          {list.slice(0, 5).map((j, i) => (
            <div key={j.id} className="ad-row flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5" style={{ ["--d" as string]: `${i * 60}ms` }}>
              <div className="min-w-0">
                <div className="truncate font-medium text-white">{j.role}</div>
                <div className="truncate text-xs text-white/50">{j.companyName} · {j.location}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {j.verificationStatus === "verified" && <Badge tone="cyan"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                {isExpired(j) && <Badge tone="red">Expired</Badge>}
                <span className="hidden text-xs text-white/40 sm:inline">{new Date(j.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {!isLoading && list.length === 0 && <p className="text-sm text-white/50">No jobs yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "cyan" | "red" | "violet" | "green" }) {
  const map = {
    cyan: "bg-[#00e5ff]/10 text-[#00e5ff] ring-[#00e5ff]/25",
    red: "bg-red-500/10 text-red-300 ring-red-500/25",
    violet: "bg-[#7c3aed]/15 text-violet-300 ring-[#7c3aed]/30",
    green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${map[tone]}`}>{children}</span>;
}

/* ---------- add / edit ---------- */

const EMPTY: Omit<Job, "id" | "createdAt" | "updatedAt"> = {
  companyName: "", companyLogo: "", role: "", salary: "", category: "", location: "",
  experience: "", skills: "", jobType: "Full-time", description: "", applyLink: "", lastDate: "",
  sourceName: "", sourceUrl: "", sourceType: "", verificationStatus: "not_specified", verifiedAt: "",
};

function Field({ label, required, hint, className = "", children }: { label: string; required?: boolean; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-white/55">
        {label} {required && <span className="text-[#00e5ff]">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-4 text-white/40">{hint}</span>}
    </label>
  );
}

function Section({ icon: Icon, title, children, i = 0 }: { icon: typeof Briefcase; title: string; children: ReactNode; i?: number }) {
  return (
    <section className="glass ad-rise rounded-2xl p-6" style={{ ["--d" as string]: `${i * 80}ms` }}>
      <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00e5ff]/10"><Icon className="h-4 w-4 text-[#00e5ff]" /></span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
      <defs>
        <linearGradient id="adRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke="url(#adRingGrad)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)" }}
      />
    </svg>
  );
}

function AddJobTab({ onDone, editing, onCancel }: { onDone?: () => void; editing?: Job; onCancel?: () => void }) {
  const [form, setForm] = useState<Omit<Job, "id" | "createdAt" | "updatedAt">>(() => {
    if (!editing) return EMPTY;
    const { id, createdAt, updatedAt, ...rest } = editing;
    return rest;
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pickFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setFile(f);
  };
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const logoSrc = preview || form.companyLogo;
  const skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);

  const required = [form.companyName, form.role, form.category, form.applyLink, form.lastDate, form.description];
  const requiredDone = required.filter((v) => v?.trim()).length;
  const optional = [form.location, form.experience, form.skills, form.salary, form.sourceName, logoSrc];
  const pct = Math.round(((requiredDone + optional.filter((v) => v?.trim()).length) / (required.length + optional.length)) * 100);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (form.verificationStatus === "verified") {
        if (!form.sourceName?.trim() || !form.sourceUrl?.trim() || !form.verifiedAt?.trim()) {
          throw new Error("Verified jobs require source name, source URL, and last verified date");
        }
        const verifiedTime = new Date(`${form.verifiedAt}T23:59:59.999`).getTime();
        if (!Number.isFinite(verifiedTime) || verifiedTime > Date.now()) {
          throw new Error("Last verified date cannot be in the future");
        }
      }
      let logoUrl = form.companyLogo;
      if (file) logoUrl = await uploadLogo(file);
      const payload = { ...form, companyLogo: logoUrl };
      if (editing) {
        await updateJob(editing.id, payload);
        toast.success("Job updated");
      } else {
        await createJob(payload);
        toast.success("Job posted successfully");
        setForm(EMPTY);
        setFile(null);
      }
      qc.invalidateQueries({ queryKey: ["jobs"] });
      onDone?.();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const opt = (v: string) => <option key={v} value={v} className="bg-[#111827]">{v}</option>;

  return (
    <div>
      <PageHead
        title={editing ? "Edit job" : "Add new job"}
        sub={editing ? `Editing ${editing.role} at ${editing.companyName}` : "Fill in the details. The preview updates as you type."}
        action={
          editing && onCancel ? (
            <button onClick={onCancel} className="btn-ghost-glow flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm">
              <X className="h-4 w-4" /> Cancel
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_330px]">
        <form onSubmit={submit} className="space-y-5">
          <Section icon={Building2} title="Basics" i={0}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company name" required>
                <input required placeholder="e.g. Infosys" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Role / title" required>
                <input required placeholder="e.g. Data Analyst" value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Category" required>
                <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  <option value="" className="bg-[#111827]">Select category</option>
                  {CATEGORIES.map(opt)}
                </select>
              </Field>
              <Field label="Job type">
                <select value={form.jobType} onChange={(e) => set("jobType", e.target.value)} className={inputCls}>
                  {JOB_TYPES.map(opt)}
                </select>
              </Field>
            </div>
          </Section>

          <Section icon={Tags} title="Details" i={1}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Location">
                <select value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls}>
                  <option value="" className="bg-[#111827]">Select location</option>
                  {LOCATIONS.map(opt)}
                </select>
              </Field>
              <Field label="Experience">
                <select value={form.experience} onChange={(e) => set("experience", e.target.value)} className={inputCls}>
                  <option value="" className="bg-[#111827]">Select experience</option>
                  {EXPERIENCES.map(opt)}
                </select>
              </Field>
              <Field label="Expected salary">
                <input placeholder="e.g. 8–12 LPA" value={form.salary} onChange={(e) => set("salary", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Skills" hint="Comma-separated. They appear as chips in the preview.">
                <input placeholder="SQL, Python, Power BI" value={form.skills} onChange={(e) => set("skills", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section icon={Link2} title="Apply" i={2}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Apply link" required>
                <input required type="url" placeholder="https://…" value={form.applyLink} onChange={(e) => set("applyLink", e.target.value)} className={inputCls} />
              </Field>
              <Field
                label="Application deadline"
                required
                hint="Every new job must have a deadline. Existing expired jobs can be edited without changing their stored date."
              >
                <input
                  required type="date"
                  min={!editing ? todayStr() : undefined}
                  value={form.lastDate}
                  onChange={(e) => set("lastDate", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          <Section icon={ShieldCheck} title="Source & verification" i={3}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Source / company name">
                <input placeholder="e.g. Company careers page" value={form.sourceName ?? ""} onChange={(e) => set("sourceName", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Source URL">
                <input type="url" placeholder="https://…" value={form.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Source type">
                <select value={form.sourceType ?? ""} onChange={(e) => set("sourceType", e.target.value)} className={inputCls}>
                  <option value="" className="bg-[#111827]">Not specified</option>
                  {["Official company careers page", "Verified recruitment source", "Other"].map(opt)}
                </select>
              </Field>
              <Field label="Verification status">
                <select
                  value={form.verificationStatus ?? "not_specified"}
                  onChange={(e) => set("verificationStatus", e.target.value as "verified" | "not_specified")}
                  className={inputCls}
                >
                  <option value="not_specified" className="bg-[#111827]">Not specified</option>
                  <option value="verified" className="bg-[#111827]">Verified — I checked the source</option>
                </select>
              </Field>
              <Field label="Last verified" hint="Required when status is Verified. Cannot be a future date.">
                <input type="date" max={todayStr()} value={form.verifiedAt ?? ""} onChange={(e) => set("verifiedAt", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Section>

          <Section icon={FileText} title="Description & logo" i={4}>
            <Field label="Job description" required>
              <textarea required placeholder="Responsibilities, requirements, how to apply…" value={form.description} onChange={(e) => set("description", e.target.value)} rows={7} className={inputCls} />
              <span className="mt-1 block text-right text-[11px] text-white/35">{form.description.length} characters</span>
            </Field>

            <label
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={onDrop}
              className={`ad-drop mt-4 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-white/15 p-5 ${over ? "is-over" : ""}`}
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                {logoSrc ? <img src={logoSrc} alt="Logo preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6 text-white/40" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Upload className="h-4 w-4 text-[#00e5ff]" />
                  <span className="truncate">{file ? file.name : form.companyLogo ? "Replace logo" : "Upload company logo"}</span>
                </div>
                <div className="mt-1 text-xs text-white/45">Drag an image here, or click to browse.</div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
          </Section>

          <button type="submit" disabled={busy} className="btn-glow ad-shine flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy ? "Saving…" : editing ? "Update job" : "Post job"}
          </button>
        </form>

        {/* live preview */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <div className="glass ad-rise flex items-center gap-4 rounded-2xl p-5" style={{ ["--d" as string]: "200ms" }}>
            <div className="relative">
              <Ring pct={pct} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{pct}%</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Listing completeness</div>
              <div className="mt-0.5 text-xs text-white/50">Required fields: {requiredDone}/{required.length}</div>
            </div>
          </div>

          <div className="glass-strong ad-rise rounded-2xl p-5" style={{ ["--d" as string]: "300ms" }}>
            <div className="mb-3 flex items-center gap-1.5 text-xs text-white/45">
              <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" /> Live preview
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                {logoSrc ? <img src={logoSrc} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-white/60">{form.companyName?.[0]?.toUpperCase() || "?"}</span>}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-white">{form.role || "Role title"}</div>
                <div className="truncate text-xs text-white/55">{form.companyName || "Company name"}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {form.location && <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-white/70"><MapPin className="h-3 w-3" />{form.location}</span>}
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-white/70">{form.jobType}</span>
              {form.experience && <span className="rounded-full bg-white/5 px-2.5 py-1 text-white/70">{form.experience}</span>}
              {form.salary && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">{form.salary}</span>}
            </div>
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.slice(0, 6).map((s) => (
                  <span key={s} className="rounded-md bg-[#7c3aed]/15 px-2 py-0.5 text-[10px] text-violet-300">{s}</span>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-white/45">
              <span>{form.lastDate ? `Apply by ${form.lastDate}` : "No deadline set"}</span>
              {form.verificationStatus === "verified" && <Badge tone="cyan"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- manage ---------- */

type Filter = "all" | "active" | "expired" | "verified";

function ManageJobsTab() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Job | null>(null);
  const [confirmDel, setConfirmDel] = useState<Job | null>(null);
  const perPage = 8;

  useEffect(() => {
    if (!confirmDel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setConfirmDel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDel]);

  const all = jobs ?? [];
  const counts = {
    all: all.length,
    active: all.filter((j) => !isExpired(j)).length,
    expired: all.filter(isExpired).length,
    verified: all.filter((j) => j.verificationStatus === "verified").length,
  };

  const list = all.filter((j) => {
    if (filter === "active" && isExpired(j)) return false;
    if (filter === "expired" && !isExpired(j)) return false;
    if (filter === "verified" && j.verificationStatus !== "verified") return false;
    if (!q) return true;
    return `${j.role} ${j.companyName} ${j.location}`.toLowerCase().includes(q.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const paged = list.slice((page - 1) * perPage, page * perPage);

  if (editing) {
    return <AddJobTab editing={editing} onCancel={() => setEditing(null)} onDone={() => setEditing(null)} />;
  }

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteJob(confirmDel.id, confirmDel.companyLogo);
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDel(null);
    }
  };

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "expired", label: "Expired" },
    { id: "verified", label: "Verified" },
  ];

  return (
    <div>
      <PageHead title="Manage jobs" sub={`${list.length} of ${all.length} listings shown`} />

      <div className="glass ad-rise rounded-2xl" style={{ ["--d" as string]: "100ms" }}>
        <div className="space-y-3 border-b border-white/5 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              placeholder="Search by role, company or location…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white ring-1 ring-white/10 transition placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/40"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.id}
                onClick={() => { setFilter(c.id); setPage(1); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  filter === c.id ? "bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] text-[#050816]" : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c.label} <span className="opacity-70">{counts[c.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ad-skel h-16 rounded-xl" />)}
          </div>
        ) : paged.length === 0 ? (
          <div className="p-14 text-center">
            <Search className="mx-auto h-7 w-7 text-white/30" />
            <p className="mt-3 text-sm text-white/50">No jobs found.</p>
          </div>
        ) : (
          <div key={`${filter}-${q}-${page}`} className="divide-y divide-white/5">
            {paged.map((j, i) => (
              <div key={j.id} className="ad-row flex items-center gap-3 p-4" style={{ ["--d" as string]: `${i * 45}ms` }}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                  {j.companyLogo ? <img src={j.companyLogo} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-white/70">{j.companyName[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-white">{j.role}</span>
                    {j.verificationStatus === "verified" && <Badge tone="cyan"><BadgeCheck className="h-3 w-3" /> Verified</Badge>}
                    {isExpired(j) && <Badge tone="red"><AlertTriangle className="h-3 w-3" /> Expired</Badge>}
                    {Date.now() - j.createdAt < DAY && <Badge tone="green">New</Badge>}
                  </div>
                  <div className="truncate text-xs text-white/50">
                    {j.companyName} · {j.location}
                    {j.lastDate && <span className={isExpired(j) ? "text-red-300/80" : ""}> · Deadline {j.lastDate}</span>}
                  </div>
                </div>
                <div className="hidden text-xs text-white/40 md:block">{new Date(j.createdAt).toLocaleDateString()}</div>
                <button onClick={() => setEditing(j)} className="btn-ghost-glow rounded-lg p-2" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setConfirmDel(j)} className="btn-ghost-glow rounded-lg p-2 hover:!bg-red-500/10 hover:!border-red-500/30 hover:!text-red-300" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 p-4">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost-glow rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
            <span className="text-xs text-white/60">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost-glow rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {confirmDel && (
        <div
          className="ad-tab fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDel(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-strong ad-pop w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="ad-pulse flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 ring-1 ring-red-500/40">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Delete this job?</h2>
            <p className="mt-1 text-sm leading-6 text-white/60">
              This will permanently remove <span className="text-white">{confirmDel.role}</span> at {confirmDel.companyName}. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="btn-ghost-glow rounded-xl px-4 py-2 text-sm">Cancel</button>
              <button onClick={doDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// keep TS from complaining about unused import
void ADMIN_EMAIL;