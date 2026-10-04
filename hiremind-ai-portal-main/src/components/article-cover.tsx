import { useId } from "react";

/**
 * Original cover art for each article, drawn in SVG (no external images, loads instantly).
 * The category decides the colours and the illustration; the slug slightly varies the background.
 */
type Theme = { a: string; b: string; kind: "chat" | "doc" | "search" | "path" };
const THEMES: Record<string, Theme> = {
  "Interview preparation": { a: "#0891b2", b: "#7c3aed", kind: "chat" },
  "Resume and career": { a: "#059669", b: "#0891b2", kind: "doc" },
  "Job search guide": { a: "#f59e0b", b: "#e11d48", kind: "search" },
  "Career roadmap": { a: "#7c3aed", b: "#d946ef", kind: "path" },
};
const FALLBACK: Theme = { a: "#0891b2", b: "#7c3aed", kind: "path" };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function ArticleCover({ category, slug, className = "" }: { category: string; slug: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = THEMES[category] ?? FALLBACK;
  const h = hash(slug);
  const dx = (h % 120) - 60, dy = ((h >> 3) % 80) - 40;

  return (
    <div className={`relative aspect-[16/9] w-full overflow-hidden ${className}`} aria-hidden>
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.a} /><stop offset="1" stopColor={t.b} /></linearGradient>
          <radialGradient id={`r${id}`} cx=".3" cy=".2" r=".9"><stop offset="0" stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
          <pattern id={`p${id}`} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#fff" fillOpacity=".22" /></pattern>
          <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#020617" floodOpacity=".35" /></filter>
        </defs>
        <rect width="640" height="360" fill={`url(#g${id})`} />
        <rect width="640" height="360" fill={`url(#r${id})`} />
        <rect width="640" height="360" fill={`url(#p${id})`} />
        <circle cx={90 + dx} cy={300 + dy} r="150" fill="#fff" fillOpacity=".08" />
        <circle cx={560 - dx} cy={40 - dy} r="120" fill="#020617" fillOpacity=".12" />
        <circle cx={540} cy={310} r="70" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeDasharray="4 8" />

        <g filter={`url(#s${id})`}>
          {t.kind === "chat" && (
            <g>
              <rect x="150" y="74" width="250" height="112" rx="26" fill="#fff" />
              <path d="M190 186 L176 220 L224 186 Z" fill="#fff" />
              <rect x="180" y="104" width="150" height="12" rx="6" fill="#cbd5e1" />
              <rect x="180" y="128" width="190" height="12" rx="6" fill="#e2e8f0" />
              <rect x="180" y="152" width="110" height="12" rx="6" fill="#e2e8f0" />
              <rect x="290" y="176" width="210" height="100" rx="26" fill="#0f172a" fillOpacity=".78" stroke="#fff" strokeOpacity=".4" />
              <path d="M460 276 L476 306 L428 276 Z" fill="#0f172a" fillOpacity=".78" />
              {[0, 1, 2].map((i) => <circle key={i} cx={348 + i * 30} cy={226} r="9" fill="#fff" fillOpacity={0.95 - i * 0.25} />)}
            </g>
          )}
          {t.kind === "doc" && (
            <g>
              <rect x="215" y="46" width="210" height="270" rx="20" fill="#fff" />
              <circle cx="262" cy="98" r="24" fill={t.a} fillOpacity=".25" />
              <circle cx="262" cy="92" r="9" fill={t.a} /><path d="M246 112 a16 14 0 0 1 32 0 Z" fill={t.a} />
              <rect x="300" y="82" width="90" height="10" rx="5" fill="#334155" />
              <rect x="300" y="102" width="60" height="8" rx="4" fill="#cbd5e1" />
              {[150, 176, 202, 228, 254].map((y, i) => <rect key={y} x="244" y={y} width={i % 2 ? 130 : 150} height="9" rx="4.5" fill="#e2e8f0" />)}
              <rect x="244" y="282" width="70" height="14" rx="7" fill={t.a} fillOpacity=".85" />
              <circle cx="418" cy="62" r="30" fill="#10b981" stroke="#fff" strokeWidth="5" />
              <path d="M404 62 l10 11 l18 -22" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          {t.kind === "search" && (
            <g>
              <circle cx="290" cy="165" r="86" fill="#fff" fillOpacity=".2" stroke="#fff" strokeWidth="16" />
              <path d="M352 228 L420 296" stroke="#fff" strokeWidth="24" strokeLinecap="round" />
              <path d="M290 112 c-26 0 -44 19 -44 42 c0 30 44 66 44 66 s44 -36 44 -66 c0 -23 -18 -42 -44 -42 Z" fill="#0f172a" fillOpacity=".85" />
              <circle cx="290" cy="154" r="15" fill="#fff" />
              <path d="M468 118 l8 18 l20 3 l-15 14 l4 20 l-17 -10 l-17 10 l4 -20 l-15 -14 l20 -3 Z" fill="#fde68a" />
            </g>
          )}
          {t.kind === "path" && (
            <g>
              <path d="M70 288 C 190 288 170 196 300 196 S 430 104 570 92" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="8" strokeLinecap="round" strokeDasharray="2 18" />
              {[[70, 288], [300, 196], [570, 92]].map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="22" fill="#fff" /><circle cx={x} cy={y} r="10" fill={i === 2 ? "#f59e0b" : t.a} />
                </g>
              ))}
              <path d="M570 70 V30 L612 44 L570 58" fill="#f59e0b" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
              <rect x="248" y="96" width="120" height="58" rx="14" fill="#fff" fillOpacity=".95" />
              <rect x="266" y="114" width="64" height="9" rx="4.5" fill="#94a3b8" /><rect x="266" y="130" width="84" height="9" rx="4.5" fill="#cbd5e1" />
            </g>
          )}
        </g>
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
      <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-900 shadow">{category}</span>
    </div>
  );
}
