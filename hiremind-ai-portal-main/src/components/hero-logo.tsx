import { useState, type CSSProperties } from "react";

/**
 * HeroLogo: the Hire Daily logo builds itself piece by piece (ring, H, swoosh, person, star),
 * then idles with a light streak, a twinkling star and job-type chips riding the ring.
 * Click the logo to replay the intro. Pure SVG + CSS, no extra dependencies.
 *
 * Put this file at: src/components/hero-logo.tsx
 */

const CHIPS: [label: string, browse: string, angle: number][] = [
  ["Fresher Jobs", "Fresher Jobs", 20],
  ["Remote", "Remote", 110],
  ["Internship", "Internship", 200],
  ["Pune Jobs", "Pune Jobs", 290],
];

// Logo geometry (400 x 400 canvas)
const H_LEFT = "M108 128 H153 V180 H197 V214 H153 V234 Q125 250 108 268 Z";
const SWOOSH = "M94 294 C125 262 165 246 205 232 C255 214 292 182 299 138 C300 190 265 232 215 250 C165 268 125 268 94 294 Z";
const SWOOSH_CENTER = "M94 294 C130 258 170 244 210 231 C262 212 292 180 299 138";
const STAR = "M314 113 Q317 131 336 135 Q317 139 314 157 Q311 139 292 135 Q311 131 314 113 Z";

const CSS = `
.hl-stage { container-type: inline-size; }
.hl-disc { opacity: 0; animation: hlFade .9s ease .15s forwards; }
.hl-ring { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hlDraw 1.5s cubic-bezier(.65,0,.35,1) .1s forwards; }
.hl-hl { opacity: 0; transform: translateX(-46px); animation: hlSlide .9s cubic-bezier(.16,1,.3,1) 1s forwards; }
.hl-hr { transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(0); animation: hlGrow .9s cubic-bezier(.16,1,.3,1) 1.25s forwards; }
.hl-wipe { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hlDraw 1.1s cubic-bezier(.45,0,.2,1) 1.8s forwards; }
.hl-head { transform-box: fill-box; transform-origin: center; transform: scale(0); animation: hlPop .7s cubic-bezier(.34,1.56,.64,1) 2.7s forwards; }
.hl-star-in { transform-box: fill-box; transform-origin: center; opacity: 0; transform: rotate(-120deg) scale(0); animation: hlStarIn .9s cubic-bezier(.34,1.56,.64,1) 3s forwards; }
.hl-star { transform-box: fill-box; transform-origin: center; animation: hlTwinkle 2.6s ease-in-out 4s infinite; }
.hl-float { animation: hlFloat 6s ease-in-out 3.8s infinite; }
.hl-glow { animation: hlGlow 5s ease-in-out infinite; }
.hl-ripple { position: absolute; inset: 6%; border-radius: 9999px; border: 1px solid rgba(0,229,255,.35); opacity: 0; animation: hlRipple 4.2s ease-out infinite; animation-delay: var(--d, 3.4s); pointer-events: none; }
.hl-orbit { position: absolute; inset: 0; animation: hlSpin 46s linear infinite; opacity: 0; animation-name: hlSpin, hlFade; animation-duration: 46s, .8s; animation-timing-function: linear, ease; animation-iteration-count: infinite, 1; animation-delay: 0s, 3.4s; animation-fill-mode: none, forwards; }
.hl-upright { animation: hlUnspin 46s linear infinite; }
.hl-stage:hover .hl-orbit, .hl-stage:hover .hl-upright { animation-play-state: paused; }
.hl-chip { transform: translate(-50%, -50%); }
@keyframes hlDraw { to { stroke-dashoffset: 0; } }
@keyframes hlFade { to { opacity: 1; } }
@keyframes hlSlide { to { opacity: 1; transform: none; } }
@keyframes hlGrow { to { transform: scaleY(1); } }
@keyframes hlPop { 0% { transform: scale(0); } 70% { transform: scale(1.35); } 100% { transform: scale(1); } }
@keyframes hlStarIn { to { opacity: 1; transform: none; } }
@keyframes hlTwinkle { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3) rotate(20deg); opacity: .85; } }
@keyframes hlFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes hlGlow { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.1); opacity: .8; } }
@keyframes hlRipple { 0% { transform: scale(.82); opacity: .5; } 100% { transform: scale(1.38); opacity: 0; } }
@keyframes hlSpin { to { transform: rotate(360deg); } }
@keyframes hlUnspin { from { transform: rotate(calc(var(--a) * -1)); } to { transform: rotate(calc(var(--a) * -1 - 360deg)); } }
@media (prefers-reduced-motion: reduce) {
  .hl-disc, .hl-orbit { opacity: 1; animation: none !important; }
  .hl-ring, .hl-wipe { stroke-dashoffset: 0; animation: none !important; }
  .hl-hl { opacity: 1; transform: none; animation: none !important; }
  .hl-hr, .hl-head { transform: none; animation: none !important; }
  .hl-star-in { opacity: 1; transform: none; animation: none !important; }
  .hl-star, .hl-float, .hl-glow, .hl-upright { animation: none !important; }
  .hl-ripple, .hl-streak { display: none; }
}
`;

export function HeroLogo() {
  const [run, setRun] = useState(0); // changing the key remounts the svg and replays the intro

  return (
    <div className="hl-stage relative mx-auto aspect-square w-full max-w-[28rem]">
      <style>{CSS}</style>

      <div aria-hidden className="hl-glow pointer-events-none absolute -inset-[10%] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,229,255,.22) 0%, rgba(124,58,237,.16) 45%, transparent 70%)", filter: "blur(30px)" }} />
      <span aria-hidden className="hl-ripple" style={{ "--d": "3.4s" } as CSSProperties} />
      <span aria-hidden className="hl-ripple" style={{ "--d": "5.5s" } as CSSProperties} />

      <div className="hd-stage h-full w-full">
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          aria-label="Hire Daily logo. Press to replay the animation."
          className="block h-full w-full cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00e5ff]"
        >
          <div className="hl-float h-full w-full">
            <svg key={run} viewBox="0 0 400 400" className="h-full w-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id="hlRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#00e5ff" />
                  <stop offset=".55" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="hlHR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="hlHL" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#c7d2fe" />
                </linearGradient>
                <linearGradient id="hlSw" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#2563eb" />
                  <stop offset=".6" stopColor="#00e5ff" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
                <radialGradient id="hlDisc" cx=".5" cy=".4" r=".65">
                  <stop offset="0" stopColor="#ffffff" stopOpacity=".1" />
                  <stop offset="1" stopColor="#0a0f1f" stopOpacity=".55" />
                </radialGradient>
                <linearGradient id="hlStreak" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="120" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset=".5" stopColor="#fff" stopOpacity=".95" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                  <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="260 0" dur="3.2s" begin="4.2s" repeatCount="indefinite" />
                </linearGradient>
                <filter id="hlBlur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <mask id="hlMask" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
                  <path d={SWOOSH_CENTER} fill="none" stroke="#fff" strokeWidth="46" strokeLinecap="round" pathLength={1} className="hl-wipe" />
                </mask>
              </defs>

              <circle cx="200" cy="200" r="186" fill="url(#hlDisc)" className="hl-disc" />
              <circle cx="200" cy="200" r="164" fill="none" stroke="#fff" strokeOpacity=".08" />
              <circle cx="200" cy="200" r="176" fill="none" stroke="url(#hlRing)" strokeWidth="7" strokeLinecap="round" pathLength={1} transform="rotate(-90 200 200)" filter="url(#hlBlur)" className="hl-ring" />

              <path d={H_LEFT} fill="url(#hlHL)" className="hl-hl" />
              <rect x="200" y="121" width="44" height="176" rx="2" fill="url(#hlHR)" className="hl-hr" />

              <g mask="url(#hlMask)">
                <path d={SWOOSH} fill="url(#hlSw)" />
                <path d={SWOOSH} fill="url(#hlStreak)" className="hl-streak" />
              </g>

              <circle cx="266" cy="165" r="14" fill="#38bdf8" filter="url(#hlBlur)" className="hl-head" />
              <g className="hl-star-in">
                <path d={STAR} fill="#e0faff" filter="url(#hlBlur)" className="hl-star" />
              </g>
            </svg>
          </div>
        </button>
      </div>

      {/* job-type chips riding the ring */}
      <div className="hl-orbit" aria-label="Quick job categories">
        {CHIPS.map(([label, browse, a]) => (
          <div key={label} className="absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${a}deg) translateY(calc(44cqw * -1))` }}>
            <div className="hl-upright" style={{ "--a": `${a}deg` } as CSSProperties}>
              <a
                href={`/jobs?browse=${encodeURIComponent(browse)}`}
                className="hl-chip absolute left-0 top-0 whitespace-nowrap rounded-full border border-white/15 bg-slate-950/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-cyan-500/10 backdrop-blur transition hover:border-[#00e5ff]/60 hover:text-[#00e5ff] sm:text-xs"
              >
                {label}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}