import { useId } from "react";
import { Flame, Lock, Medal, Rocket, Target, Trophy } from "lucide-react";
import { PROBLEMS, TRACKS, problemsOf, type Level, type Problem, type Track } from "../data/coding-problems";
import type { Progress } from "../lib/progress";

const LEVEL_COLORS: Record<Level, [string, string]> = {
  Easy: ["#34d399", "#00e5ff"],
  Medium: ["#7c3aed", "#00e5ff"],
  Hard: ["#f43f5e", "#fbbf24"],
};
const STARS: Record<Level, number> = { Easy: 1, Medium: 2, Hard: 3 };

function Symbol({ track }: { track: Track }) {
  if (track === "analyst")
    return (
      <g fill="#fff">
        <rect x="31" y="46" width="8" height="16" rx="2" />
        <rect x="46" y="36" width="8" height="26" rx="2" />
        <rect x="61" y="27" width="8" height="35" rx="2" />
      </g>
    );
  if (track === "cyber")
    return <path d="M50 26 L68 33 V48 C68 58 60 65 50 69 C40 65 32 58 32 48 V33 Z M50 36 V59 M41 47 H59" fill="rgba(255,255,255,.18)" stroke="#fff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />;
  return <text x="50" y="57" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="ui-monospace, monospace">{"</>"}</text>;
}

const METAL: Record<Level, { ring: [string, string, string]; glow: string; word: string }> = {
  Easy: { ring: ["#f3c9a0", "#b9784a", "#e8b48a"], glow: "#34d399", word: "EASY" },
  Medium: { ring: ["#f1f5f9", "#94a3b8", "#e2e8f0"], glow: "#60a5fa", word: "MEDIUM" },
  Hard: { ring: ["#fde68a", "#d97706", "#fbbf24"], glow: "#f472b6", word: "HARD" },
};
const TRACK_NAME: Record<Track, string> = { software: "SOFTWARE", analyst: "DATA ANALYST", cyber: "CYBER SECURITY" };

/** Split a title into at most 3 short lines so it can be written on the badge. */
function wrapTitle(title: string, max = 15) {
  const lines: string[] = [];
  let cur = "";
  for (const w of title.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/**
 * Achievement badge in the style of professional skill badges: metal ring (bronze, silver, gold by level),
 * dark centre with the track emblem, the task name written on it and a ribbon with the level.
 */
export function TaskBadge({ problem, locked = false, size = 96 }: { problem: Pick<Problem, "track" | "level" | "title">; locked?: boolean; size?: number }) {
  const gid = useId().replace(/:/g, "");
  const m = METAL[problem.level];
  const ring = locked ? ["#e2e8f0", "#94a3b8", "#cbd5e1"] : m.ring;
  const lines = wrapTitle(problem.title);
  const y0 = 82 - (lines.length - 1) * 5;
  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} role="img" aria-label={`${problem.title} badge, ${problem.level}${locked ? ", locked" : ""}`} className={locked ? "opacity-70 grayscale" : "drop-shadow-[0_8px_14px_rgba(15,23,42,.35)]"}>
      <defs>
        <linearGradient id={`m${gid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={ring[0]} /><stop offset=".5" stopColor={ring[1]} /><stop offset="1" stopColor={ring[2]} /></linearGradient>
        <linearGradient id={`c${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e293b" /><stop offset="1" stopColor="#020617" /></linearGradient>
        <radialGradient id={`h${gid}`} cx=".5" cy=".3" r=".6"><stop offset="0" stopColor={locked ? "#94a3b8" : m.glow} stopOpacity=".5" /><stop offset="1" stopColor={m.glow} stopOpacity="0" /></radialGradient>
        <linearGradient id={`b${gid}`} x1="0" x2="1"><stop offset="0" stopColor={locked ? "#64748b" : "#0ea5e9"} /><stop offset="1" stopColor={locked ? "#475569" : "#7c3aed"} /></linearGradient>
      </defs>
      <polygon points="60,6 107,33 107,87 60,114 13,87 13,33" fill={`url(#m${gid})`} />
      <polygon points="60,12 101,36 101,84 60,108 19,84 19,36" fill={`url(#c${gid})`} />
      <polygon points="60,12 101,36 101,84 60,108 19,84 19,36" fill={`url(#h${gid})`} />
      <polygon points="60,16 97,38 97,82 60,104 23,82 23,38" fill="none" stroke={ring[0]} strokeOpacity=".5" strokeWidth=".8" strokeDasharray="1.5 2.5" />
      <g fill={locked ? "#cbd5e1" : "#fde68a"}>
        {Array.from({ length: STARS[problem.level] }).map((_, i) => (
          <polygon key={i} transform={`translate(${60 + (i - (STARS[problem.level] - 1) / 2) * 11} 25)`} points="0,-4.2 1.3,-1.3 4.2,-1 2,1 2.7,4 0,2.4 -2.7,4 -2,1 -4.2,-1 -1.3,-1.3" />
        ))}
      </g>
      <g transform="translate(36 30) scale(.48)" opacity={locked ? 0.55 : 1}><Symbol track={problem.track} /></g>
      {locked && (
        <g stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" transform="translate(51 37)"><rect x="0" y="9" width="18" height="13" rx="2.5" fill="rgba(255,255,255,.2)" /><path d="M4 9 V5 a5 5 0 0 1 10 0 V9" /></g>
      )}
      <text x="60" y="68" textAnchor="middle" fontSize="5.2" fontWeight="700" letterSpacing=".9" fill={locked ? "#94a3b8" : "#7dd3fc"} fontFamily="ui-sans-serif, system-ui, sans-serif">{TRACK_NAME[problem.track]}</text>
      {lines.map((l, i) => (
        <text key={i} x="60" y={y0 + i * 10 + 6} textAnchor="middle" fontSize="8.4" fontWeight="800" fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif">{l}</text>
      ))}
      <polygon points="4,100 116,100 108,112 116,124 4,124 12,112" fill={`url(#b${gid})`} stroke="#fff" strokeOpacity=".55" strokeWidth=".8" />
      <text x="60" y="116" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="2" fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif">{m.word}</text>
      <text x="60" y="136" textAnchor="middle" fontSize="5.5" fontWeight="700" letterSpacing="1.2" fill="#64748b" fontFamily="ui-sans-serif, system-ui, sans-serif">HIRE DAILY</text>
    </svg>
  );
}

/* ---------------- milestones ---------------- */

type Milestone = { id: string; title: string; note: string; icon: typeof Trophy; test: (p: Progress) => boolean };
const solvedCount = (p: Progress) => PROBLEMS.filter((x) => p[x.id]).length;
const allOf = (p: Progress, list: Problem[]) => list.length > 0 && list.every((x) => p[x.id]);

export const MILESTONES: Milestone[] = [
  { id: "first", title: "First solve", note: "Solve any problem", icon: Rocket, test: (p) => solvedCount(p) >= 1 },
  { id: "five", title: "On a roll", note: "Solve 5 problems", icon: Flame, test: (p) => solvedCount(p) >= 5 },
  { id: "ten", title: "Double digits", note: "Solve 10 problems", icon: Target, test: (p) => solvedCount(p) >= 10 },
  { id: "easy", title: "Easy sweep", note: "Solve every Easy problem", icon: Medal, test: (p) => allOf(p, PROBLEMS.filter((x) => x.level === "Easy")) },
  ...TRACKS.map((t) => ({ id: `track-${t.id}`, title: `${t.label} master`, note: `Solve every ${t.label} problem`, icon: Trophy, test: (p: Progress) => allOf(p, problemsOf(t.id)) })),
];

export const earnedMilestones = (p: Progress) => MILESTONES.filter((m) => m.test(p));

function MilestoneBadge({ m, earned }: { m: Milestone; earned: boolean }) {
  const Icon = m.icon;
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${earned ? "border-amber-300 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10" : "border-slate-200 opacity-60 dark:border-white/10"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${earned ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow" : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/40"}`}>
        {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{m.title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-white/45">{m.note}</p>
      </div>
    </div>
  );
}

/** Full badge collection: one badge per coding task, grouped by track, plus milestones. */
export function BadgeShelf({ progress, collected }: { progress: Progress; collected: boolean }) {
  const total = PROBLEMS.length;
  const done = PROBLEMS.filter((x) => progress[x.id]).length;
  return (
    <div>
      <p className="text-sm text-slate-600 dark:text-white/55">
        <b className="text-slate-900 dark:text-white">{collected ? done : 0}</b> of {total} task badges collected
        {!collected && done > 0 && <> · you have solved {done}. Sign in to collect them.</>}
      </p>

      <div className="mt-5 space-y-6">
        {TRACKS.map((t) => (
          <section key={t.id}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.label}</h3>
            <div className="mt-3 grid grid-cols-2 gap-4 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
              {problemsOf(t.id).map((pr) => {
                const got = collected && !!progress[pr.id];
                return (
                  <div key={pr.id} className="flex flex-col items-center text-center" title={`${pr.title} (${pr.level})`}>
                    <TaskBadge problem={pr} locked={!got} size={92} />
                    
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <h3 className="mt-8 text-sm font-bold text-slate-900 dark:text-white">Milestones</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {MILESTONES.map((m) => <MilestoneBadge key={m.id} m={m} earned={collected && m.test(progress)} />)}
      </div>
    </div>
  );
}
