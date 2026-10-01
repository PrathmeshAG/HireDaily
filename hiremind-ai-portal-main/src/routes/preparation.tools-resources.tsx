import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Sparkles, Wrench } from "lucide-react";

export const Route = createFileRoute("/preparation/tools-resources")({
  component: ToolsResourcesPage,
});

function ToolsResourcesPage() {
  const resources = [
    { title: "Productivity Tools", description: "Useful tools for learning, applications and daily career workflow." },
    { title: "Interview Resources", description: "Platforms and resources to strengthen interview preparation." },
    { title: "Career Resources", description: "Practical resources for resumes, LinkedIn and job search." },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <section className="pt-32 pb-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Tools & Resources
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Your career toolkit.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55">
            A curated space for useful tools and resources to support your career journey.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {resources.map((resource) => (
            <div key={resource.title} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.035]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <Wrench className="h-7 w-7" />
              </div>
              <h2 className="mt-6 text-xl font-bold">{resource.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/45">{resource.description}</p>
              <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-white">
                Coming Soon <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
