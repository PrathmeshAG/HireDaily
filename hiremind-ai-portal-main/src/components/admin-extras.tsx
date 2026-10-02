import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, Plus, TrendingDown, TrendingUp } from "lucide-react";
import type { Job } from "../lib/firebase";

const DAY = 86_400_000;
const PALETTE = ["#00e5ff", "#7c3aed", "#ff4ecd", "#34d399", "#fbbf24", "#60a5fa", "#f87171"];
const IMG = (id: string, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const d0 = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

const countBy = (list: Job[], pick: (j: Job) => string | undefined) => {
  const m = new Map<string, number>();
  list.forEach((j) => { const k = pick(j)?.trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const daily = (list: Job[], n: number) => {
  const today = d0(Date.now());
  return Array.from({ length: n }, (_, i) => {
    const t = today - (n - 1 - i) * DAY;
    return { t, v: list.filter((j) => j.createdAt >= t && j.createdAt < t + DAY).length };
  });
};
const daysLeft = (j: Job) => (j.lastDate ? Math.ceil((Date.parse(j.lastDate) - d0(Date.now())) / DAY) : null);

function useCount(target: number, ms = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(target);
    let raf = 0; const s = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - s) / ms); setN(Math.round(target * (1 - (1 - p) ** 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width) || 600);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => { const id = window.setTimeout(() => setM(true), 60); return () => window.clearTimeout(id); }, []);
  return m;
}

const STYLES = `
  .ax-float { animation: axFloat 7s ease-in-out infinite; }
  .ax-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: axDraw 1.6s cubic-bezier(.16,1,.3,1) .2s forwards; }
  .ax-fade { opacity: 0; animation: axFade .9s ease .9s forwards; }
  .ax-kenburns { animation: axKen 22s ease-in-out infinite alternate; }
  .ax-cell { transition: transform .2s, box-shadow .2s; } .ax-cell:hover { transform: scale(1.35); box-shadow: 0 0 12px rgba(0,229,255,.6); z-index: 2; }
  .ax-chip { transition: transform .25s, background .25s; } .ax-chip:hover { transform: translateY(-3px) scale(1.06); }
  /* layout driven by the width of the content area (sidebar-aware), not the viewport */
  .ax-root { container: ax / inline-size; }
  .ax-kpis, .ax-g2, .ax-g3, .ax-gp { display: grid; gap: 1.5rem; grid-template-columns: minmax(0, 1fr); }
  .ax-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .ax-panel { container-type: inline-size; padding: 1.25rem; min-width: 0; }
  .ax-kpi-val { font-size: 1.75rem; line-height: 1.1; }
  .ax-donut { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; }
  .ax-hero { container-type: inline-size; }
  .ax-hero-in { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
  .ax-hero-title { font-size: 1.875rem; line-height: 1.1; }
  .ax-hero-cta { width: 100%; }
  @container ax (min-width: 640px) { .ax-panel { padding: 1.5rem; } }
  @container ax (min-width: 760px) { .ax-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.25rem; } .ax-kpi-val { font-size: 2rem; } .ax-gp { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @container ax (min-width: 860px) { .ax-g2 { grid-template-columns: 1.6fr 1fr; } }
  @container ax (min-width: 600px) { .ax-g3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ax-g3 > :last-child:nth-child(odd) { grid-column: 1 / -1; } }
  @container ax (min-width: 900px) { .ax-g3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } .ax-g3 > :last-child:nth-child(odd) { grid-column: auto; } }
  @container (min-width: 480px) { .ax-donut { flex-direction: row; } }
  @container (min-width: 600px) { .ax-hero-in { flex-direction: row; align-items: flex-end; justify-content: space-between; padding: 2.5rem; } .ax-hero-title { font-size: 2.5rem; } .ax-hero-cta { width: auto; } }
  @container (min-width: 900px) { .ax-hero-title { font-size: 3rem; } }
  @keyframes axFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
  @keyframes axDraw { to { stroke-dashoffset: 0 } }
  @keyframes axFade { to { opacity: 1 } }
  @keyframes axKen { from { transform: scale(1.04) translate3d(0,0,0) } to { transform: scale(1.14) translate3d(-1.5%,-1%,0) } }
  @media (prefers-reduced-motion: reduce) { .ax-float,.ax-kenburns { animation: none !important } .ax-draw { animation: none !important; stroke-dashoffset: 0 } .ax-fade { animation: none !important; opacity: 1 } }
`;

function Panel({ title, sub, right, d = 0, className = "", children }: { title: string; sub?: string; right?: ReactNode; d?: number; className?: string; children: ReactNode }) {
  return (
    <section className={`glass ad-rise ax-panel rounded-2xl ${className}`} style={delay(d)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {sub && <p className="mt-0.5 text-xs text-white/45">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---------- images ---------- */

export function HeroBanner({ greeting, jobs, onAdd }: { greeting: string; jobs: Job[]; onAdd: () => void }) {
  const active = jobs.filter((j) => (daysLeft(j) ?? 0) >= 0).length;
  const soon = jobs.filter((j) => { const d = daysLeft(j); return d !== null && d >= 0 && d <= 3; }).length;
  const total = useCount(jobs.length);
  return (
    <section className="ad-rise ax-hero relative overflow-hidden rounded-3xl ring-1 ring-white/10">
      <style>{STYLES}</style>
      <img src={IMG("photo-1497366216548-37526070297c")} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="ax-kenburns absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050816] via-[#050816]/85 to-[#050816]/40" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#00e5ff]/15 via-transparent to-[#7c3aed]/25" />
      <div className="ax-float absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#7c3aed]/30 blur-3xl" />

      <div className="ax-hero-in relative">
        <div>
          <p className="text-sm text-white/60">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="ax-hero-title mt-2 font-bold text-white" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>{greeting}, admin</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/60">Here is how your job board is performing today.</p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {[[`${total}`, "Total jobs"], [`${active}`, "Active"], [`${soon}`, "Closing in 3 days"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-md">
                <div className="text-xl font-bold text-white">{v}</div>
                <div className="text-[11px] text-white/60">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onAdd} className="ax-hero-cta btn-glow ad-shine flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm">
          <Plus className="h-4 w-4" /> Post a job
        </button>
      </div>
    </section>
  );
}

export function AuthBackdrop() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#050816]">
      <style>{STYLES}</style>
      <img src={IMG("photo-1486406146926-c627a92ad1ab")} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="ax-kenburns h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050816]/60 via-[#050816]/80 to-[#050816]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,229,255,.14),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(124,58,237,.2),transparent_45%)]" />
    </div>
  );
}

export function EmptyArt({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <svg viewBox="0 0 200 140" className="ax-float mx-auto h-32 w-44" fill="none">
        <defs><linearGradient id="axg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#00e5ff" /><stop offset="1" stopColor="#7c3aed" /></linearGradient></defs>
        <rect x="30" y="30" width="110" height="80" rx="14" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.14)" />
        <rect x="44" y="46" width="50" height="8" rx="4" fill="rgba(255,255,255,.18)" />
        <rect x="44" y="62" width="80" height="6" rx="3" fill="rgba(255,255,255,.1)" />
        <rect x="44" y="76" width="64" height="6" rx="3" fill="rgba(255,255,255,.1)" />
        <circle cx="140" cy="88" r="26" fill="rgba(5,8,22,.9)" stroke="url(#axg)" strokeWidth="5" />
        <path d="M159 107l20 20" stroke="url(#axg)" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <p className="mt-4 text-sm font-medium text-white/70">{text}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

/* ---------- charts ---------- */

function smooth(pts: [number, number][]) {
  return pts.reduce((p, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1]; const cx = (px + x) / 2;
    return `${p} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
}

function TrendChart({ jobs }: { jobs: Job[] }) {
  const [mode, setMode] = useState<"daily" | "total">("daily");
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => {
    const base = daily(jobs, 30);
    if (mode === "daily") return base;
    const before = jobs.filter((j) => j.createdAt < base[0].t).length;
    let run = before;
    return base.map((b) => ({ ...b, v: (run += b.v) }));
  }, [jobs, mode]);
  const [wrapRef, measured] = useWidth();
  const W = Math.max(240, measured), H = 200, max = Math.max(1, ...data.map((d) => d.v));
  const pts: [number, number][] = data.map((d, i) => [(i / (data.length - 1)) * W, H - 16 - (d.v / max) * (H - 40)]);
  const line = smooth(pts);
  const h = hover ?? data.length - 1;
  return (
    <Panel
      title="Posting trend" sub="Last 30 days" d={200}
      right={
        <div className="flex rounded-full bg-white/5 p-1 text-xs">
          {(["daily", "total"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 transition ${mode === m ? "bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] font-semibold text-[#050816]" : "text-white/60 hover:text-white"}`}>
              {m === "daily" ? "Daily" : "Cumulative"}
            </button>
          ))}
        </div>
      }
    >
      <div ref={wrapRef} className="relative" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`} className="block h-[200px] w-full touch-none" key={mode}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - r.left) / r.width) * (data.length - 1))))); }}
        >
          <defs>
            <linearGradient id="axArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00e5ff" stopOpacity=".35" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
            <linearGradient id="axLine" x1="0" x2="1"><stop stopColor="#00e5ff" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={16 + g * (H - 40)} y2={16 + g * (H - 40)} stroke="rgba(255,255,255,.06)" />)}
          <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#axArea)" className="ax-fade" />
          <path d={line} pathLength={1} fill="none" stroke="url(#axLine)" strokeWidth="3" strokeLinecap="round" className="ax-draw" />
          <line x1={pts[h][0]} x2={pts[h][0]} y1="0" y2={H} stroke="rgba(255,255,255,.18)" strokeDasharray="4 4" />
          <circle cx={pts[h][0]} cy={pts[h][1]} r="5" fill="#050816" stroke="#00e5ff" strokeWidth="3" />
        </svg>
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-[#0b1226] px-2.5 py-1.5 text-center text-[11px] text-white shadow-xl ring-1 ring-white/15" style={{ left: `${(h / (data.length - 1)) * 100}%`, marginLeft: h < 3 ? 28 : h > data.length - 4 ? -28 : 0 }}>
          <div className="font-bold">{data[h].v} {mode === "daily" ? (data[h].v === 1 ? "job" : "jobs") : "total"}</div>
          <div className="text-white/50">{new Date(data[h].t).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
        </div>
      </div>
    </Panel>
  );
}

function Donut({ jobs }: { jobs: Job[] }) {
  const mounted = useMounted();
  const [hi, setHi] = useState<number | null>(null);
  const rows = useMemo(() => {
    const all = countBy(jobs, (j) => j.category || "Uncategorized");
    const top = all.slice(0, 6); const rest = all.slice(6).reduce((n, [, c]) => n + c, 0);
    return rest ? [...top, ["Others", rest] as [string, number]] : top;
  }, [jobs]);
  const total = jobs.length || 1, R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <Panel title="Category mix" sub="Share of all listings" d={280}>
      <div className="ax-donut">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
            {rows.map(([name, c], i) => {
              const len = (c / total) * C; const off = -acc; acc += len;
              return (
                <circle key={name} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={hi === i ? 20 : 16}
                  strokeDasharray={mounted ? `${Math.max(0, len - 2)} ${C - len + 2}` : `0 ${C}`} strokeDashoffset={off}
                  style={{ transition: "stroke-dasharray 1s cubic-bezier(.16,1,.3,1), stroke-width .2s", opacity: hi === null || hi === i ? 1 : 0.35 }}
                  onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{hi === null ? jobs.length : rows[hi][1]}</span>
            <span className="max-w-[80px] truncate text-[10px] text-white/50">{hi === null ? "listings" : rows[hi][0]}</span>
          </div>
        </div>
        <ul className="w-full min-w-0 space-y-2">
          {rows.map(([name, c], i) => (
            <li key={name} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="min-w-0 flex-1 truncate text-white/75">{name}</span>
              <span className="text-white/45">{Math.round((c / total) * 100)}%</span>
            </li>
          ))}
          {rows.length === 0 && <li className="text-xs text-white/45">No data yet.</li>}
        </ul>
      </div>
    </Panel>
  );
}

function Bars({ rows, d = 0 }: { rows: [string, number][]; d?: number }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="text-xs text-white/45">No data yet.</p>;
  return (
    <div className="space-y-3.5">
      {rows.map(([name, c], i) => (
        <div key={name}>
          <div className="mb-1.5 flex justify-between text-xs"><span className="truncate text-white/80">{name}</span><span className="text-white/45">{c}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="ad-barx h-full rounded-full" style={{ width: `${(c / max) * 100}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, #7c3aed)`, ...delay(d + i * 90) }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ jobs }: { jobs: Job[] }) {
  const cells = useMemo(() => daily(jobs, 35), [jobs]);
  const lead = (new Date(cells[0].t).getDay() + 6) % 7;
  const max = Math.max(1, ...cells.map((c) => c.v));
  return (
    <Panel title="Activity heatmap" sub="Posting activity, last 5 weeks" d={400}>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] text-white/35">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {cells.map((c) => (
          <span key={c.t} title={`${new Date(c.t).toLocaleDateString()}: ${c.v} job${c.v === 1 ? "" : "s"}`}
            className="ax-cell relative aspect-square rounded-md"
            style={{ background: c.v ? `rgba(0,229,255,${0.2 + (c.v / max) * 0.8})` : "rgba(255,255,255,.05)" }} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-white/40">
        Less {[0.05, 0.3, 0.55, 0.8, 1].map((o) => <span key={o} className="h-3 w-3 rounded-sm" style={{ background: `rgba(0,229,255,${o})` }} />)} More
      </div>
    </Panel>
  );
}

function Deadlines({ jobs }: { jobs: Job[] }) {
  const buckets = [
    ["Closing in 3 days", (d: number) => d >= 0 && d <= 3, "#f87171"],
    ["4 to 7 days", (d: number) => d > 3 && d <= 7, "#fbbf24"],
    ["8 to 30 days", (d: number) => d > 7 && d <= 30, "#34d399"],
    ["30+ days", (d: number) => d > 30, "#60a5fa"],
    ["Expired", (d: number) => d < 0, "#6b7280"],
  ] as const;
  const withD = jobs.map((j) => ({ j, d: daysLeft(j) })).filter((x): x is { j: Job; d: number } => x.d !== null);
  const soon = withD.filter((x) => x.d >= 0).sort((a, b) => a.d - b.d).slice(0, 4);
  return (
    <Panel title="Deadline pipeline" sub="When listings close" d={460} right={<CalendarClock className="h-4 w-4 text-white/40" />}>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
        {buckets.map(([n, f, c]) => { const k = withD.filter((x) => f(x.d)).length; return k ? <div key={n} className="ad-barx h-full" style={{ width: `${(k / (withD.length || 1)) * 100}%`, background: c }} title={`${n}: ${k}`} /> : null; })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        {buckets.map(([n, f, c]) => (
          <div key={n} className="flex items-center gap-2 text-white/60"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{n}<span className="ml-auto text-white/40">{withD.filter((x) => f(x.d)).length}</span></div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {soon.length === 0 && <p className="text-xs text-white/45">No upcoming deadlines.</p>}
        {soon.map(({ j, d }) => (
          <div key={j.id} className="ad-row flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
            <div className="min-w-0 flex-1"><div className="truncate text-sm text-white">{j.role}</div><div className="truncate text-[11px] text-white/45">{j.companyName}</div></div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${d <= 3 ? "bg-red-500/15 text-red-300" : "bg-amber-400/10 text-amber-200"}`}>{d === 0 ? "Today" : `${d}d left`}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Quality({ jobs }: { jobs: Job[] }) {
  const mounted = useMounted();
  const checks: [string, (j: Job) => boolean][] = [
    ["Company logo", (j) => !!j.companyLogo], ["Skills listed", (j) => !!j.skills?.trim()], ["Salary info", (j) => !!j.salary?.trim()],
    ["Source added", (j) => !!j.sourceName?.trim()], ["Verified", (j) => j.verificationStatus === "verified"], ["Detailed description", (j) => (j.description?.length ?? 0) >= 300],
  ];
  const rows = checks.map(([n, f]) => [n, jobs.length ? Math.round((jobs.filter(f).length / jobs.length) * 100) : 0] as [string, number]);
  const score = rows.length ? Math.round(rows.reduce((n, r) => n + r[1], 0) / rows.length) : 0;
  const R = 36, C = 2 * Math.PI * R;
  return (
    <Panel title="Listing quality" sub="Completeness across all jobs" d={340}>
      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 90 90" className="-rotate-90">
            <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
            <circle cx="45" cy="45" r={R} fill="none" stroke="#00e5ff" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={mounted ? C * (1 - score / 100) : C} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{score}%</span>
        </div>
        <p className="text-xs leading-5 text-white/55">{score >= 80 ? "Excellent. Your listings are detailed and trustworthy." : score >= 50 ? "Good. Adding logos, salary and sources will build more trust." : "Needs work. Complete more fields to improve trust and clicks."}</p>
      </div>
      <div className="mt-5 space-y-2.5">
        {rows.map(([n, p], i) => (
          <div key={n} className="text-xs">
            <div className="mb-1.5 flex justify-between"><span className="text-white/65">{n}</span><span className="text-white/45">{p}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="ad-barx h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ width: `${p}%`, ...delay(300 + i * 80) }} /></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Skills({ jobs }: { jobs: Job[] }) {
  const m = new Map<string, number>();
  jobs.forEach((j) => j.skills?.split(/[,|\n]+/).forEach((s) => { const k = s.trim().toLowerCase(); if (k) m.set(k, (m.get(k) ?? 0) + 1); }));
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <Panel title="In-demand skills" sub="Most frequent across listings" d={520}>
      <div className="flex flex-wrap gap-2">
        {rows.length === 0 && <p className="text-xs text-white/45">Add skills to jobs to see trends.</p>}
        {rows.map(([s, c], i) => (
          <span key={s} className="ax-chip rounded-full px-3 py-1.5 font-medium capitalize text-white ring-1 ring-white/10" style={{ fontSize: `${11 + (c / max) * 5}px`, background: `${PALETTE[i % PALETTE.length]}22` }}>
            {s} <span className="ml-1 text-white/45">{c}</span>
          </span>
        ))}
      </div>
    </Panel>
  );
}

function Companies({ jobs }: { jobs: Job[] }) {
  const rows = countBy(jobs, (j) => j.companyName).slice(0, 5);
  const logos = new Map(jobs.map((j) => [j.companyName, j.companyLogo]));
  return (
    <Panel title="Top hiring companies" sub="By number of listings" d={580}>
      <div className="space-y-2.5">
        {rows.length === 0 && <p className="text-xs text-white/45">No data yet.</p>}
        {rows.map(([n, c], i) => (
          <div key={n} className="ad-row flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5" style={delay(i * 70)}>
            <span className="w-4 text-xs font-bold text-white/35">{i + 1}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
              {logos.get(n) ? <img src={logos.get(n)} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-white/70">{n[0]}</span>}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm text-white">{n}</span>
            <span className="rounded-full bg-[#00e5ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00e5ff]">{c} {c === 1 ? "job" : "jobs"}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- main ---------- */

function Kpi({ label, value, suffix = "", delta, icon, i }: { label: string; value: number; suffix?: string; delta?: number; icon: ReactNode; i: number }) {
  const n = useCount(value);
  return (
    <div className="ad-card ad-rise glass relative overflow-hidden rounded-2xl p-4 sm:p-5" style={delay(i * 70)}>
      <div className="flex items-center justify-between gap-2 text-white/50"><span className="min-w-0 truncate text-xs">{label}</span><span className="shrink-0">{icon}</span></div>
      <div className="ax-kpi-val mt-3 font-bold text-white">{n}{suffix}</div>
      {delta !== undefined && (
        <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold ${delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
          {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{Math.abs(delta)}% vs previous week
        </div>
      )}
    </div>
  );
}

export function AnalyticsSection({ jobs }: { jobs: Job[] }) {
  const k = useMemo(() => {
    const d14 = daily(jobs, 14);
    const prev = d14.slice(0, 7).reduce((n, d) => n + d.v, 0), cur = d14.slice(7).reduce((n, d) => n + d.v, 0);
    const delta = prev ? Math.round(((cur - prev) / prev) * 100) : cur ? 100 : 0;
    const m30 = daily(jobs, 30).reduce((n, d) => n + d.v, 0);
    const verified = jobs.length ? Math.round((jobs.filter((j) => j.verificationStatus === "verified").length / jobs.length) * 100) : 0;
    const soon = jobs.filter((j) => { const d = daysLeft(j); return d !== null && d >= 0 && d <= 7; }).length;
    return { cur, delta, m30, verified, soon };
  }, [jobs]);

  return (
    <div className="ax-root space-y-6">
      <style>{STYLES}</style>
      <div className="ad-rise flex items-end justify-between" style={delay(120)}>
        <div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>Analytics</h2>
          <p className="text-xs text-white/45">Live insights computed from your listings</p>
        </div>
      </div>

      <div className="ax-kpis">
        <Kpi i={0} label="Posted, last 7 days" value={k.cur} delta={k.delta} icon={<ArrowRight className="h-4 w-4 -rotate-45" />} />
        <Kpi i={1} label="Posted, last 30 days" value={k.m30} icon={<CalendarClock className="h-4 w-4" />} />
        <Kpi i={2} label="Verified rate" value={k.verified} suffix="%" icon={<BadgeCheck className="h-4 w-4" />} />
        <Kpi i={3} label="Closing within 7 days" value={k.soon} icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="ax-g2"><TrendChart jobs={jobs} /><Donut jobs={jobs} /></div>

      <div className="ax-g3">
        <Panel title="Top locations" sub="Where jobs are based" d={300}><Bars rows={countBy(jobs, (j) => j.location).slice(0, 6)} d={400} /></Panel>
        <Panel title="Experience levels" sub="Who you are hiring for" d={360}><Bars rows={countBy(jobs, (j) => j.experience).slice(0, 6)} d={460} /></Panel>
        <Panel title="Job types" sub="Full-time, internship and more" d={420}><Bars rows={countBy(jobs, (j) => j.jobType).slice(0, 6)} d={520} /></Panel>
      </div>

      <div className="ax-gp"><Heatmap jobs={jobs} /><Deadlines jobs={jobs} /></div>
      <div className="ax-g3">
        <Quality jobs={jobs} />
        <Companies jobs={jobs} />
        <Skills jobs={jobs} />
      </div>
    </div>
  );
}