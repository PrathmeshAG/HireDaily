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

/** Hexagon badge drawn in SVG. Colour = level, symbol = track, stars = difficulty. */
export function TaskBadge({ problem, locked = false, size = 88 }: { problem: Pick<Problem, "track" | "level" | "title">; locked?: boolean; size?: number }) {
  const gid = useId().replace(/:/g, "");
  const [c1, c2] = locked ? ["#64748b", "#94a3b8"] : LEVEL_COLORS[problem.level];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${problem.title} badge${locked ? " (locked)" : ""}`} className={locked ? "opacity-60" : "drop-shadow-lg"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <polygon points="50,4 91,27 91,73 50,96 9,73 9,27" fill={`url(#${gid})`} />
      <polygon points="50,11 85,31 85,69 50,89 15,69 15,31" fill="rgba(5,8,22,.28)" stroke="rgba(255,255,255,.45)" strokeWidth="1.5" />
      {locked ? (
        <g stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round"><rect x="38" y="46" width="24" height="18" rx="3" fill="rgba(255,255,255,.2)" /><path d="M43 46 V40 a7 7 0 0 1 14 0 V46" /></g>
      ) : (
        <Symbol track={problem.track} />
      )}
      <g fill={locked ? "#cbd5e1" : "#fde68a"}>
        {Array.from({ length: STARS[problem.level] }).map((_, i) => {
          const x = 50 + (i - (STARS[problem.level] - 1) / 2) * 11;
          return <polygon key={i} transform={`translate(${x} 78)`} points="0,-5 1.5,-1.5 5,-1.2 2.3,1.2 3.1,4.8 0,2.9 -3.1,4.8 -2.3,1.2 -5,-1.2 -1.5,-1.5" />;
        })}
      </g>
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
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {problemsOf(t.id).map((pr) => {
                const got = collected && !!progress[pr.id];
                return (
                  <div key={pr.id} className="flex flex-col items-center text-center" title={`${pr.title} (${pr.level})`}>
                    <TaskBadge problem={pr} locked={!got} size={72} />
                    <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-600 dark:text-white/55">{pr.title}</span>
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
