import { useId, type ReactNode } from "react";

// Original SVG artwork for the automation admin. Brand colors only
// (#00e5ff cyan, #7c3aed violet, emerald for success). All art is decorative
// (aria-hidden); motion classes are disabled under prefers-reduced-motion.

function Frame({ children, id }: { children: (g: { cyan: string; violet: string; glow: string }) => ReactNode; id: string }) {
  const cyan = `${id}-c`;
  const violet = `${id}-v`;
  const glow = `${id}-g`;
  return (
    <svg viewBox="0 0 240 160" fill="none" aria-hidden="true" className="h-auto w-full">
      <defs>
        <linearGradient id={cyan} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00e5ff" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={violet} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#00e5ff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {children({ cyan: `url(#${cyan})`, violet: `url(#${violet})`, glow: `url(#${glow})` })}
    </svg>
  );
}

/** Comment → rule → DM with job links: the core automation story. */
export function HeroArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="74" fill={glow} />
          {/* comment bubble */}
          <g className="hd-drift">
            <rect x="14" y="26" width="86" height="38" rx="12" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <path d="M34 64 L30 78 L48 64 Z" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <circle cx="32" cy="45" r="8" fill={violet} />
            <rect x="46" y="38" width="38" height="6" rx="3" fill="#ffffff" fillOpacity="0.75" />
            <rect x="46" y="49" width="24" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.28" />
          </g>
          {/* flow line */}
          <path d="M100 52 C130 52 118 96 146 96" stroke={cyan} strokeWidth="2" strokeLinecap="round" pathLength="1" className="hd-draw" />
          <circle cx="123" cy="74" r="9" fill="#0b1220" stroke={cyan} strokeWidth="1.5" />
          <path d="M119 74 l3 3 l6 -6" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* DM card with links */}
          <g className="hd-drift-slow">
            <rect x="140" y="70" width="86" height="64" rx="12" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <path d="M153 83 l16 8 l-16 8 l4 -8 Z" fill={cyan} />
            <rect x="176" y="82" width="38" height="6" rx="3" fill="#ffffff" fillOpacity="0.7" />
            <rect x="152" y="106" width="62" height="7" rx="3.5" fill={violet} fillOpacity="0.85" />
            <rect x="152" y="118" width="46" height="7" rx="3.5" fill={cyan} fillOpacity="0.75" />
          </g>
          <circle cx="22" cy="120" r="3" fill="#00e5ff" fillOpacity="0.6" />
          <circle cx="210" cy="30" r="2.5" fill="#7c3aed" fillOpacity="0.8" />
        </>
      )}
    </Frame>
  );
}

export function AnalyticsArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="84" r="72" fill={glow} />
          <path d="M24 132 H216" stroke="#ffffff" strokeOpacity="0.15" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const h = [34, 52, 44, 74, 62, 92][i];
            return (
              <rect key={i} x={36 + i * 30} y={132 - h} width="18" height={h} rx="5" fill={i % 2 ? violet : cyan} fillOpacity="0.85" />
            );
          })}
          <path d="M30 104 C62 96 76 78 104 84 S150 58 176 56 S206 36 214 30" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" pathLength="1" className="hd-draw" />
          <circle cx="214" cy="30" r="5" fill="#00e5ff" className="hd-ring-pulse" />
        </>
      )}
    </Frame>
  );
}

export function LogsArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="70" fill={glow} />
          <rect x="44" y="22" width="152" height="116" rx="14" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx="66" cy={46 + i * 26} r="6" fill={i === 2 ? "#fb7185" : i % 2 ? violet : cyan} />
              <rect x="82" y={40 + i * 26} width={[88, 70, 96, 60][i]} height="6" rx="3" fill="#ffffff" fillOpacity="0.7" />
              <rect x="82" y={51 + i * 26} width={[56, 44, 38, 50][i]} height="4" rx="2" fill="#ffffff" fillOpacity="0.25" />
            </g>
          ))}
          <path d="M66 52 V104" stroke="#ffffff" strokeOpacity="0.1" />
        </>
      )}
    </Frame>
  );
}

export function SettingsArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="72" fill={glow} />
          <g className="hd-drift">
            <circle cx="104" cy="82" r="30" fill="#111827" stroke={cyan} strokeWidth="2.5" />
            <circle cx="104" cy="82" r="11" fill={cyan} fillOpacity="0.85" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <rect key={a} x="100" y="44" width="8" height="12" rx="3" fill={cyan} transform={`rotate(${a} 104 82)`} />
            ))}
          </g>
          <g className="hd-drift-slow">
            <path d="M178 62 l26 9 v22 c0 15 -11 25 -26 31 c-15 -6 -26 -16 -26 -31 v-22 Z" fill="#111827" stroke={violet} strokeWidth="2.5" />
            <path d="M167 94 l8 8 l15 -16" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </>
      )}
    </Frame>
  );
}

export function RulesArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="72" fill={glow} />
          <path d="M44 80 H88 M88 80 C108 80 108 42 132 42 H178 M88 80 C108 80 108 118 132 118 H178" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" pathLength="1" className="hd-draw" />
          <rect x="22" y="64" width="40" height="32" rx="9" fill={violet} />
          <text x="42" y="84" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="'Space Grotesk', sans-serif">JOB</text>
          <rect x="98" y="66" width="28" height="28" rx="8" fill="#111827" stroke={cyan} strokeWidth="2" />
          <path d="M106 80 l5 5 l9 -10" stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="176" y="28" width="42" height="28" rx="8" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" />
          <rect x="184" y="38" width="26" height="5" rx="2.5" fill={cyan} />
          <rect x="176" y="104" width="42" height="28" rx="8" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" />
          <path d="M186 118 l12 -6 l-4 12 l-3 -5 Z" fill={violet} />
        </>
      )}
    </Frame>
  );
}

export function TemplatesArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="72" fill={glow} />
          <g className="hd-drift">
            <rect x="26" y="28" width="104" height="44" rx="14" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <rect x="40" y="40" width="64" height="6" rx="3" fill="#ffffff" fillOpacity="0.75" />
            <rect x="40" y="52" width="76" height="6" rx="3" fill={cyan} fillOpacity="0.85" />
          </g>
          <g className="hd-drift-slow">
            <rect x="110" y="82" width="104" height="50" rx="14" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <rect x="124" y="94" width="50" height="6" rx="3" fill="#ffffff" fillOpacity="0.75" />
            <rect x="124" y="106" width="72" height="6" rx="3" fill={violet} fillOpacity="0.9" />
            <rect x="124" y="118" width="40" height="6" rx="3" fill="#ffffff" fillOpacity="0.25" />
          </g>
          <text x="176" y="52" fontSize="12" fontWeight="700" fill="#00e5ff" fontFamily="monospace">{"{{ }}"}</text>
        </>
      )}
    </Frame>
  );
}

export function MappingArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="72" fill={glow} />
          <g className="hd-drift">
            <rect x="20" y="30" width="72" height="92" rx="12" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <rect x="28" y="38" width="56" height="52" rx="8" fill={violet} fillOpacity="0.85" />
            <circle cx="46" cy="56" r="6" fill="#ffffff" fillOpacity="0.8" />
            <path d="M32 84 l16 -16 l12 10 l10 -8 l6 8 v6 h-44 Z" fill="#ffffff" fillOpacity="0.35" />
            <rect x="28" y="98" width="38" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.6" />
          </g>
          <path d="M92 76 H148" stroke={cyan} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 6" />
          <circle cx="120" cy="76" r="11" fill="#0b1220" stroke={cyan} strokeWidth="1.8" />
          <path d="M114 76 h12 M121 70 l6 6 l-6 6" stroke="#00e5ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <g className="hd-drift-slow">
            <rect x="148" y="30" width="72" height="92" rx="12" fill="#111827" stroke="#ffffff" strokeOpacity="0.14" />
            <rect x="158" y="42" width="30" height="30" rx="8" fill={cyan} />
            <rect x="158" y="80" width="52" height="6" rx="3" fill="#ffffff" fillOpacity="0.75" />
            <rect x="158" y="92" width="38" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.3" />
            <rect x="158" y="104" width="52" height="8" rx="4" fill={violet} fillOpacity="0.9" />
          </g>
        </>
      )}
    </Frame>
  );
}

export function UsersArt() {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="80" r="72" fill={glow} />
          <g className="hd-drift">
            <circle cx="120" cy="62" r="20" fill={cyan} />
            <path d="M80 126 c0 -24 18 -38 40 -38 s40 14 40 38 Z" fill={cyan} fillOpacity="0.85" />
          </g>
          <g className="hd-drift-slow">
            <circle cx="58" cy="76" r="13" fill={violet} />
            <path d="M32 126 c0 -17 11 -27 26 -27 s26 10 26 27 Z" fill={violet} fillOpacity="0.8" />
            <circle cx="184" cy="76" r="13" fill={violet} fillOpacity="0.7" />
            <path d="M158 126 c0 -17 11 -27 26 -27 s26 10 26 27 Z" fill={violet} fillOpacity="0.6" />
          </g>
        </>
      )}
    </Frame>
  );
}

/** Small artwork for empty tables, charts and lists. */
export function EmptyArt({ kind }: { kind: "inbox" | "chart" | "search" | "rules" | "templates" | "link" }) {
  const id = useId();
  return (
    <Frame id={id}>
      {({ cyan, violet, glow }) => (
        <>
          <circle cx="120" cy="82" r="62" fill={glow} />
          {kind === "inbox" && (
            <>
              <path d="M62 92 l16 -34 h84 l16 34 v34 h-116 Z" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />
              <path d="M62 92 h38 c0 10 8 16 20 16 s20 -6 20 -16 h38" stroke={cyan} strokeWidth="2.2" strokeLinejoin="round" />
              <circle cx="168" cy="52" r="6" fill={violet} />
            </>
          )}
          {kind === "chart" && (
            <>
              <path d="M52 124 H188" stroke="#ffffff" strokeOpacity="0.2" />
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={64 + i * 30} y={124 - [20, 34, 26, 44][i]} width="18" height={[20, 34, 26, 44][i]} rx="5" fill={i % 2 ? violet : cyan} fillOpacity="0.35" strokeDasharray="3 3" stroke="#ffffff" strokeOpacity="0.3" />
              ))}
            </>
          )}
          {kind === "search" && (
            <>
              <circle cx="108" cy="76" r="26" fill="#111827" stroke={cyan} strokeWidth="3" />
              <path d="M128 96 l24 24" stroke={cyan} strokeWidth="5" strokeLinecap="round" />
              <path d="M98 76 h20" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
            </>
          )}
          {kind === "rules" && (
            <>
              <rect x="70" y="52" width="100" height="22" rx="8" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" />
              <rect x="70" y="84" width="100" height="22" rx="8" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" />
              <circle cx="84" cy="63" r="4" fill={cyan} />
              <circle cx="84" cy="95" r="4" fill={violet} />
              <path d="M170 118 v-8 M166 114 h8" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
          {kind === "templates" && (
            <>
              <rect x="64" y="50" width="86" height="34" rx="12" fill="#111827" stroke="#ffffff" strokeOpacity="0.2" />
              <rect x="90" y="92" width="86" height="30" rx="12" fill="#111827" stroke={cyan} strokeOpacity="0.6" />
              <rect x="76" y="62" width="44" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.5" />
              <rect x="102" y="102" width="52" height="5" rx="2.5" fill={violet} />
            </>
          )}
          {kind === "link" && (
            <>
              <rect x="56" y="62" width="62" height="34" rx="17" fill="none" stroke={cyan} strokeWidth="4" />
              <rect x="122" y="62" width="62" height="34" rx="17" fill="none" stroke={violet} strokeWidth="4" />
              <path d="M104 79 h32" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
            </>
          )}
        </>
      )}
    </Frame>
  );
}
