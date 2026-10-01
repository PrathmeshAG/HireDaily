import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, Sparkles, ClipboardCheck } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preparation/interview")({
  component: InterviewPreparationPage,
});

function InterviewPreparationPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/5 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              Interview Preparation
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Walk into interviews prepared.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55 sm:text-lg">
              A structured preparation hub for HR rounds, technical discussions and domain-focused interview readiness.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/preparation/study-material" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.035]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">HR Questions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/45">
              Tell me about yourself, strengths, salary, company-fit and behavioural questions.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-700 dark:text-cyan-300">
              Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link to="/preparation/study-material" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.035]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Technical Questions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/45">
              Prepare technical fundamentals and role-specific questions across popular IT domains.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-300">
              Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link to="/preparation/study-material" className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.035]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <ClipboardCheck className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Domain Preparation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/45">
              Build focused preparation plans for analytics, development, cloud, BA, QA and more.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
