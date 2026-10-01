import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, FileText, Map, Sparkles } from "lucide-react";

export const Route = createFileRoute("/preparation/study-material")({
  component: StudyMaterialPage,
});

function StudyMaterialPage() {
  const items = [
    { title: "Notes", description: "Structured notes for popular IT and analytics domains.", icon: FileText },
    { title: "Cheat Sheets", description: "Quick-reference material for revision before interviews.", icon: BookOpen },
    { title: "Roadmaps", description: "Step-by-step learning roadmaps for different career paths.", icon: Map },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <section className="pt-32 pb-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> Study Material
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Learn. Revise. Move faster.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55">
            Notes, cheat sheets and career roadmaps designed for practical preparation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                <Icon className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-xl font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/45">{description}</p>
              <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-white">
                Coming Soon <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
