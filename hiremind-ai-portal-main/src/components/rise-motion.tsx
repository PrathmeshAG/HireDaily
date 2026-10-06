import { useEffect, useRef, useState } from "react";

/**
 * "Rise" motion system. One idea from the logo (a person rising along a swoosh toward a star)
 * drives the whole page:
 *   <RiseTrail />      page-wide: scrolling draws a swoosh and a glowing person-dot rides it up to a star
 *   <SparkleCursor />  hero: the cursor leaves little logo-stars behind
 *   <SwooshDivider />  between sections: a swoosh draws itself and ends in a star
 *
 * Put this file at: src/components/rise-motion.tsx
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const STAR = "M0 -12 Q2 -2 12 0 Q2 2 0 12 Q-2 2 -12 0 Q-2 -2 0 -12 Z";

const CSS = `
.rm-star-burst { transform-box: fill-box; transform-origin: center; animation: rmBurst .9s cubic-bezier(.34,1.56,.64,1) both; }
.rm-div { clip-path: inset(0 100% 0 0); }
.rm-div.is-in { animation: rmWipe 1.5s cubic-bezier(.45,0,.2,1) forwards; }
.rm-div-star { transform: scale(0) rotate(-90deg); }
.rm-div-star.is-in { animation: rmPop .8s cubic-bezier(.34,1.56,.64,1) 1.3s forwards, rmTw 2.8s ease-in-out 2.4s infinite; }
@keyframes rmWipe { to { clip-path: inset(0 0 0 0); } }
@keyframes rmPop { to { transform: scale(1) rotate(0); } }
@keyframes rmTw { 0%,100% { filter: drop-shadow(0 0 4px rgba(0,229,255,.6)); } 50% { filter: drop-shadow(0 0 12px rgba(0,229,255,1)); } }
@keyframes rmBurst { 0% { transform: scale(1); } 40% { transform: scale(2.6) rotate(45deg); } 100% { transform: scale(1.5) rotate(90deg); } }
@media (prefers-reduced-motion: reduce) {
  .rm-div { clip-path: none; animation: none !important; }
  .rm-div-star { transform: none; animation: none !important; }
}
`;

/* ---------- page-wide scroll path ---------- */
export function RiseTrail() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const path = useRef<SVGPathElement>(null);
  const line = useRef<SVGPathElement>(null);
  const dot = useRef<SVGGElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fit = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const p = path.current, l = line.current, d = dot.current;
    if (!p || !l || !d || reduced()) return;
    const len = p.getTotalLength();
    l.style.strokeDasharray = `${len}`;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pr = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const pt = p.getPointAtLength(len * pr);
      l.style.strokeDashoffset = `${len * (1 - pr)}`;
      d.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      setDone(pr > 0.985);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [size]);

  const { w, h } = size;
  // swoosh from bottom-left to a star near the top-right, like the logo
  const dPath = `M ${-0.04 * w} ${1.02 * h} C ${0.2 * w} ${0.76 * h} ${0.42 * w} ${0.8 * h} ${0.56 * w} ${0.56 * h} S ${0.82 * w} ${0.2 * h} ${0.93 * w} ${0.12 * h}`;

  return (
    <>
      <style>{CSS}</style>
      {w > 0 && (
        <svg aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <linearGradient id="rmLine" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#7c3aed" stopOpacity=".1" />
              <stop offset=".6" stopColor="#00e5ff" stopOpacity=".45" />
              <stop offset="1" stopColor="#a78bfa" stopOpacity=".6" />
            </linearGradient>
            <filter id="rmGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path ref={path} d={dPath} fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth="2" strokeDasharray="4 8" />
          <path ref={line} d={dPath} fill="none" stroke="url(#rmLine)" strokeWidth="4" strokeLinecap="round" filter="url(#rmGlow)" style={{ strokeDashoffset: 1e5 }} />
          <g transform={`translate(${0.93 * w} ${0.12 * h})`} opacity={done ? 1 : 0.4}>
            <path d={STAR} fill="#e0faff" filter="url(#rmGlow)" className={done ? "rm-star-burst" : ""} />
          </g>
          <g ref={dot}>
            <circle r="16" fill="#00e5ff" opacity=".18" />
            <circle r="7" fill="#38bdf8" filter="url(#rmGlow)" />
          </g>
        </svg>
      )}
    </>
  );
}

/* ---------- cursor sparkles (put inside a position:relative section) ---------- */
type P = { x: number; y: number; vx: number; vy: number; s: number; life: number; rot: number; vr: number; c: string };
const COLORS = ["#00e5ff", "#ffffff", "#a78bfa", "#38bdf8"];

export function SparkleCursor() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || reduced()) return;
    const host = c.parentElement as HTMLElement;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, lx = -99, ly = -99;
    const ps: P[] = [];
    const fit = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const star = (x: number, y: number, s: number, rot: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
      ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
      ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
      ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
      ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
      ctx.fill(); ctx.restore();
    };
    const tick = () => {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= 0.022;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.rot += p.vr;
        ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = 10;
        star(p.x, p.y, p.s * (0.4 + p.life * 0.6), p.rot);
      }
      if (ps.length) raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - lx, y - ly) < 16) return;
      lx = x; ly = y;
      if (ps.length < 70) {
        ps.push({ x, y, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.8, s: 4 + Math.random() * 6, life: 1, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.12, c: COLORS[(Math.random() * COLORS.length) | 0] });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    fit();
    host.addEventListener("pointermove", move);
    window.addEventListener("resize", fit);
    return () => {
      host.removeEventListener("pointermove", move);
      window.removeEventListener("resize", fit);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[5] h-full w-full" />;
}

/* ---------- section divider ---------- */
export function SwooshDivider() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || reduced()) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const cls = seen ? "is-in" : "";
  return (
    <div ref={ref} aria-hidden className="relative my-2 h-12 w-full md:h-16">
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className={`rm-div absolute inset-0 h-full w-full pr-4 ${cls}`}>
        <defs>
          <linearGradient id="rmDiv" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset=".5" stopColor="#00e5ff" stopOpacity=".7" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <path d="M0 70 C300 70 450 14 700 32 S1050 62 1180 14" fill="none" stroke="url(#rmDiv)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <svg viewBox="-14 -14 28 28" className={`rm-div-star absolute right-0 top-[4%] h-6 w-6 md:h-7 md:w-7 ${cls}`}>
        <path d={STAR} fill="#e0faff" />
      </svg>
    </div>
  );
}