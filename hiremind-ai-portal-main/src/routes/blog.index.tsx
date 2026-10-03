import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3 } from "lucide-react";
import { ARTICLES } from "../data/articles";
import { SITE } from "../lib/site";

const TITLE = "Career Guides for Freshers — Interviews, Resumes and Job Search | Hire Daily";
const DESC = "Practical, original career guides for students and freshers: interview questions, ATS resume tips and city-wise job search advice written by the Hire Daily team.";

export const Route = createFileRoute("/blog/")({
  component: BlogIndex,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/blog` }],
  }),
});

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function BlogIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]">Career guides</p>
        <h1 className="mt-1 text-balance text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">Guides for freshers and job seekers</h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-white/55">
          Original, practical articles on interviews, resumes and job searching, written by {SITE.owner.name} and the {SITE.name} team.
        </p>
      </header>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {ARTICLES.map((a, i) => (
          <article key={a.slug} className={`group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.035] ${i === 0 ? "md:col-span-2" : ""}`}>
            <p className="text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]">{a.category}</p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              <Link to="/blog/$slug" params={{ slug: a.slug }} className="after:absolute after:inset-0 relative">{a.title}</Link>
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">{a.description}</p>
            <div className="mt-5 flex items-center justify-between text-xs text-slate-500 dark:text-white/45">
              <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {a.minutes} min read · {fmt(a.updated)}</span>
              <span className="flex items-center gap-1 font-semibold text-cyan-700 dark:text-[#00e5ff]">Read <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500 dark:text-white/45">New guides are published regularly. Have a topic request? Write to us from the Contact page.</p>
    </div>
  );
}
