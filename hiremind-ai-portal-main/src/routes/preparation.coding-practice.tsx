import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle, Award, BookOpen, CheckCircle2, ExternalLink, Lightbulb, Loader2, Play, RotateCcw, Sparkles, Terminal, Trophy, XCircle,
} from "lucide-react";
import { PROBLEMS, TRACKS, problemsOf, type Level, type Track } from "../data/coding-problems";
import { BadgeShelf, TaskBadge } from "../components/badge";
import { useProgress } from "../lib/progress";
import {
  explainError, explainWrong, runCode, timeoutExplanation,
  type Explanation, type RunOutcome,
} from "../lib/code-runner";

const TITLE = "Coding Practice — Write and Run JavaScript in Your Browser | Hire Daily";
const DESC =
  "Practice interview-style coding problems for software, data analyst and cyber security roles in your browser. Run your code, see each test pass or fail with animation, and learn why errors happen with simple fixes and topics to study.";

export const Route = createFileRoute("/preparation/coding-practice")({
  component: CodingPracticePage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/preparation/coding-practice" }],
  }),
});

const STYLES = `
  @keyframes cpIn { from { opacity: 0; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
  @keyframes cpPop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.15) } 100% { transform: scale(1); opacity: 1 } }
  @keyframes cpShake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
  @keyframes cpBurst { from { transform: translate(0,0) scale(1); opacity: 1 } to { transform: translate(var(--x), var(--y)) scale(0); opacity: 0 } }
  @keyframes cpPulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }
  .cp-in { animation: cpIn .35s cubic-bezier(.16,1,.3,1) both }
  .cp-pop { animation: cpPop .5s cubic-bezier(.34,1.4,.64,1) both }
  .cp-shake { animation: cpShake .4s ease }
  .cp-burst { animation: cpBurst 1.1s ease-out forwards }
  .cp-pulse { animation: cpPulse 1.1s ease-in-out infinite }
  @media (prefers-reduced-motion: reduce) { .cp-in,.cp-pop,.cp-shake,.cp-burst,.cp-pulse { animation: none !important } }
`;

const card = "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]";
const KEY = (id: string) => `hd-code-${id}`;

const show = (v: unknown) => {
  try { return typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v); } catch { return String(v); }
};

function Confetti() {
  const colors = ["#00e5ff", "#7c3aed", "#ff4ecd", "#34d399", "#fbbf24"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2, d = 90 + (i % 4) * 28;
        return (
          <span key={i} className="cp-burst absolute left-1/2 top-12 h-2 w-2 rounded-sm"
            style={{ background: colors[i % colors.length], ["--x" as string]: `${Math.cos(a) * d}px`, ["--y" as string]: `${Math.sin(a) * d}px`, animationDelay: `${(i % 5) * 40}ms` }} />
        );
      })}
    </div>
  );
}

function CodingPracticePage() {
  const [track, setTrack] = useState<Track>("software");
  const [levelFilter, setLevelFilter] = useState<"All" | Level>("All");
  const [pid, setPid] = useState(PROBLEMS[0].id);
  const problem = PROBLEMS.find((p) => p.id === pid) ?? PROBLEMS[0];
  const list = problemsOf(track).filter((p) => levelFilter === "All" || p.level === levelFilter);
  const { progress, record, sync, signedIn } = useProgress();
  const solvedIds = Object.keys(progress);
  const attempts = useRef<Record<string, number>>({});
  const [code, setCode] = useState(problem.starter);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [shown, setShown] = useState(0);
  const [hint, setHint] = useState(false);
  const [shake, setShake] = useState(0);
  const [reveal, setReveal] = useState<string | null>(null);
  const gutter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY(problem.id)); } catch { /* ignore */ }
    setCode(saved ?? problem.starter);
    setOutcome(null); setShown(0); setHint(false); setReveal(null);
  }, [problem]);

  const update = (v: string) => {
    setCode(v);
    try { localStorage.setItem(KEY(problem.id), v); } catch { /* ignore */ }
  };

  const total = problem.tests.length;
  const results = outcome?.type === "done" ? outcome.results : [];
  const passedAll = results.length > 0 && results.every((r) => r.ok);
  const doneShowing = outcome?.type === "done" ? shown >= results.length : !!outcome;

  // animate the tests appearing one by one
  useEffect(() => {
    if (outcome?.type !== "done") return;
    setShown(0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return setShown(outcome.results.length);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1; setShown(n);
      if (n >= outcome.results.length) window.clearInterval(id);
    }, 320);
    return () => window.clearInterval(id);
  }, [outcome]);

  useEffect(() => {
    if (outcome?.type === "done" && passedAll && doneShowing) {
      void record(problem.id, attempts.current[problem.id] ?? 1).then((isNew) => { if (isNew) setReveal(problem.id); });
    }
    if (outcome && doneShowing && !passedAll) setShake((n) => n + 1);
  }, [doneShowing]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true); setOutcome(null); setShown(0);
    attempts.current[problem.id] = (attempts.current[problem.id] ?? 0) + 1;
    const res = await runCode(code, problem.fn, problem.tests);
    setOutcome(res); setRunning(false);
  }, [code, problem, running]);

  const explanation: Explanation | null = useMemo(() => {
    if (!outcome || !doneShowing) return null;
    if (outcome.type === "timeout") return timeoutExplanation;
    if (outcome.type === "error") return explainError(outcome.name, outcome.message, problem.fn);
    if (passedAll) return null;
    const err = outcome.results.find((r) => r.error)?.error;
    return err ? explainError(err.name, err.message, problem.fn) : explainWrong(outcome.results);
  }, [outcome, doneShowing, passedAll, problem.fn]);

  const logs = outcome && "logs" in outcome ? outcome.logs : [];
  const passedCount = results.slice(0, shown).filter((r) => r.ok).length;
  const lines = code.split("\n").length;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void run(); }
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget, s = t.selectionStart;
      update(code.slice(0, s) + "  " + code.slice(t.selectionEnd));
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; });
    }
  };

  const levelCls = (l: string) =>
    l === "Easy" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : l === "Medium" ? "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200" : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6">
      <style>{STYLES}</style>

      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]">Interview preparation</p>
        <h1 className="mt-1 text-balance text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">Coding practice</h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-white/55">
          Write JavaScript, run it in your browser and watch every test pass or fail. If something breaks, we explain why it happened and what to study next.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tracks" className="flex gap-2 overflow-x-auto pb-1">
          {TRACKS.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === track}
              onClick={() => { setTrack(t.id); setLevelFilter("All"); setPid(problemsOf(t.id)[0].id); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${t.id === track ? "border-slate-900 bg-slate-900 text-white dark:border-[#00e5ff] dark:bg-[#00e5ff] dark:text-slate-950" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-white/60">
          <Trophy className="h-4 w-4 text-amber-500" /> {solvedIds.length}/{PROBLEMS.length} solved
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-white/45">{TRACKS.find((t) => t.id === track)?.blurb}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(["All", "Easy", "Medium", "Hard"] as const).map((l) => (
          <button key={l} onClick={() => { setLevelFilter(l); const first = problemsOf(track).find((p) => l === "All" || p.level === l); if (first) setPid(first.id); }}
            aria-pressed={levelFilter === l}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${levelFilter === l ? "bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] text-[#050816]" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"}`}>
            {l}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-white/10" />
        <div className="flex gap-2 overflow-x-auto">
          {list.map((p) => (
            <button key={p.id} onClick={() => setPid(p.id)} aria-current={p.id === pid}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${p.id === pid ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:border-[#00e5ff]/60 dark:bg-[#00e5ff]/10 dark:text-[#00e5ff]" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
              {progress[p.id] && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {p.title}
              <span className={`rounded px-1.5 py-0.5 text-[10px] ${levelCls(p.level)}`}>{p.level}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* problem */}
        <section className={`h-fit p-6 ${card}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${levelCls(problem.level)}`}>{problem.level}</span>
            {problem.topics.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/65">{t}</span>
            ))}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{problem.title}</h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-600 dark:text-white/60">{problem.description}</p>

          <h3 className="mt-6 text-sm font-bold text-slate-900 dark:text-white">Examples</h3>
          <ul className="mt-2 space-y-2">
            {problem.tests.slice(0, 2).map((t, i) => (
              <li key={i} className="rounded-xl bg-slate-50 px-4 py-3 font-mono text-xs leading-6 text-slate-700 dark:bg-white/5 dark:text-white/75">
                {problem.fn}({t.args.map(show).join(", ")}) → <b>{show(t.expected)}</b>
              </li>
            ))}
          </ul>

          <button onClick={() => setHint((h) => !h)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff]">
            <Lightbulb className="h-4 w-4" /> {hint ? "Hide hint" : "Show hint"}
          </button>
          {hint && <p className="cp-in mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">{problem.hint}</p>}
        </section>

        {/* editor + output */}
        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-white/60"><Terminal className="h-3.5 w-3.5" /> JavaScript</span>
              <div className="flex items-center gap-2">
                <button onClick={() => update(problem.starter)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <button onClick={run} disabled={running}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00e5ff] px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60">
                  {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} {running ? "Running" : "Run tests"}
                </button>
              </div>
            </div>
            <div className="flex h-72 font-mono text-[13px] leading-6 sm:h-80">
              <div ref={gutter} aria-hidden className="w-10 shrink-0 select-none overflow-hidden bg-white/[0.03] py-3 pr-2 text-right text-white/25">
                {Array.from({ length: lines }).map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                value={code}
                onChange={(e) => update(e.target.value)}
                onKeyDown={onKey}
                onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
                spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="Code editor"
                className="h-full min-w-0 flex-1 resize-none bg-transparent p-3 text-cyan-50 caret-[#00e5ff] outline-none"
                wrap="off"
              />
            </div>
            <p className="border-t border-white/10 px-4 py-2 text-[11px] text-white/35">Tip: press Ctrl or Cmd + Enter to run. Your code is saved in this browser.</p>
          </div>

          {/* output */}
          <div key={shake} className={`relative overflow-hidden p-5 ${card} ${outcome && doneShowing && !passedAll ? "cp-shake" : ""}`} aria-live="polite">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Test results</h3>
              {results.length > 0 && <span className="text-xs font-semibold text-slate-500 dark:text-white/50">{passedCount}/{total} passed</span>}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] transition-[width] duration-500" style={{ width: `${(passedCount / total) * 100}%` }} />
            </div>

            {!outcome && !running && <p className="mt-4 text-sm text-slate-500 dark:text-white/45">Press “Run tests” to check your solution.</p>}
            {running && <p className="cp-pulse mt-4 flex items-center gap-2 text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]"><Loader2 className="h-4 w-4 animate-spin" /> Running {total} tests…</p>}

            {outcome?.type === "done" && (
              <ul className="mt-4 space-y-2">
                {results.slice(0, shown).map((r, i) => (
                  <li key={i} className={`cp-in flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${r.ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-400/10" : "border-red-200 bg-red-50 dark:border-red-400/20 dark:bg-red-400/10"}`}>
                    {r.ok ? <CheckCircle2 className="cp-pop mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" /> : <XCircle className="cp-pop mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />}
                    <div className="min-w-0 font-mono leading-5 text-slate-800 dark:text-white/85">
                      <div className="break-words">Test {i + 1}: {problem.fn}({problem.tests[i].args.map(show).join(", ")})</div>
                      {!r.ok && (
                        <div className="mt-1 break-words text-slate-600 dark:text-white/65">
                          expected <b>{show(problem.tests[i].expected)}</b>, got <b>{r.error ? `${r.error.name}: ${r.error.message}` : r.got}</b>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {(outcome?.type === "error" || outcome?.type === "timeout") && (
              <p className="cp-in mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {outcome.type === "timeout" ? "Time limit exceeded (3 seconds)" : `${outcome.name === "NotFound" ? "Function not found" : outcome.name}${outcome.name === "NotFound" ? "" : `: ${outcome.message}`}`}
              </p>
            )}

            {passedAll && doneShowing && (
              <div className="cp-pop relative mt-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 p-5 text-center">
                <Confetti />
                <Sparkles className="mx-auto h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">All {total} tests passed. Great job!</p>
                <div className="mt-3 flex flex-col items-center">
                  <div className={reveal === problem.id ? "cp-pop" : ""}><TaskBadge problem={problem} locked={!signedIn} size={96} /></div>
                  {signedIn ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><Award className="h-4 w-4" /> Badge collected: {problem.title}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-slate-600 dark:text-white/60">You earned this badge. Sign in to collect it and keep your progress.</p>
                      <button onClick={() => window.dispatchEvent(new CustomEvent("hd-open-auth", { detail: "signup" }))} className="btn-glow mt-3 rounded-xl px-5 py-2.5 text-sm font-semibold">Create free account</button>
                    </>
                  )}
                  {signedIn && sync === "error" && <p className="mt-1 text-xs text-slate-500 dark:text-white/45">Saved on this device.</p>}
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-white/45">Console output</p>
                <pre className="mt-1.5 max-h-32 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-200">{logs.slice(0, 50).join("\n")}</pre>
              </div>
            )}
          </div>

          {explanation && (
            <div className="cp-in rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/[0.07]">
              <h3 className="flex items-start gap-2 text-base font-bold text-amber-900 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> {explanation.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75"><b>Why it happened:</b> {explanation.why}</p>
              <p className="mt-3 text-sm font-bold text-amber-900 dark:text-amber-100">How to fix it</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">
                {explanation.fix.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-amber-900 dark:text-amber-100"><BookOpen className="h-4 w-4" /> Topics to study</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {explanation.topics.map((t) => (
                  <a key={t.url} href={t.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-white/5 dark:text-amber-100 dark:hover:bg-white/10">
                    {t.label} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className={`mt-12 p-6 sm:p-8 ${card}`}>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Award className="h-6 w-6 text-amber-500" /> Your badges</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/55">Every coding task you solve earns a badge. Sign in to collect them and see them on your profile.</p>
        <div className="mt-6"><BadgeShelf progress={progress} collected={signedIn} /></div>
      </section>

      <section className={`mt-12 p-6 sm:p-8 ${card}`}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Common JavaScript errors, in plain language</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/55">
          Most beginners meet the same four errors again and again. Knowing what each one means makes debugging much faster in interviews and on the job.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(["SyntaxError", "ReferenceError", "TypeError", "RangeError"] as const).map((n) => {
            const e = explainError(n, "", "fn");
            return (
              <article key={n} className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
                <h3 className="font-bold text-slate-900 dark:text-white">{n}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">{e.why.replace(" ()", "")}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white/80">Quick fix: <span className="font-normal text-slate-600 dark:text-white/55">{e.fix[0]}</span></p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
