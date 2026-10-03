import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { ARTICLES, getArticle } from "../data/articles";
import { ArticleBody, headingsOf, slugifyHeading } from "../components/article-body";
import { SITE } from "../lib/site";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  component: ArticlePage,
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "Article not found — Hire Daily" }] };
    const title = `${a.title} | Hire Daily`;
    return {
      meta: [
        { title },
        { name: "description", content: a.description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: a.description },
        { property: "article:published_time", content: a.published },
        { property: "article:modified_time", content: a.updated },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: a.description },
      ],
      links: [{ rel: "canonical", href: `${SITE.url}/blog/${a.slug}` }],
    };
  },
});

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function ArticlePage() {
  const { article: a } = Route.useLoaderData();
  const toc = headingsOf(a.body);
  const related = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 2);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title,
    description: a.description,
    datePublished: a.published,
    dateModified: a.updated,
    mainEntityOfPage: `${SITE.url}/blog/${a.slug}`,
    author: { "@type": "Person", name: SITE.owner.name },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-[#00e5ff]">
        <ArrowLeft className="h-4 w-4" /> All guides
      </Link>

      <article className="mt-6">
        <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]">{a.category}</p>
        <h1 className="mt-2 text-balance text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">{a.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-white/60">{a.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-slate-200 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-white/45">
          <span>By <b className="font-semibold text-slate-700 dark:text-white/75">{SITE.owner.name}</b></span>
          <span>Updated {fmt(a.updated)}</span>
          <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {a.minutes} min read</span>
        </div>

        <nav aria-label="In this article" className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-sm font-bold text-slate-900 dark:text-white">In this article</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-white/60">
            {toc.map((h) => <li key={h}><a href={`#${slugifyHeading(h)}`} className="hover:text-cyan-700 hover:underline dark:hover:text-[#00e5ff]">{h}</a></li>)}
          </ol>
        </nav>

        <div className="mt-2"><ArticleBody body={a.body} /></div>
      </article>

      <aside className="mt-12 flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.035]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] text-lg font-bold text-[#050816]">{SITE.owner.name[0]}</span>
        <div>
          <p className="font-bold text-slate-900 dark:text-white">{SITE.owner.name} <span className="font-normal text-slate-500 dark:text-white/45">· {SITE.owner.role}</span></p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/55">{SITE.owner.bio} <Link to="/about" className="font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff]">About us</Link></p>
        </div>
      </aside>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link to="/preparation/interview" className="flex items-center justify-between rounded-2xl bg-slate-900 p-5 text-white dark:bg-white/[0.06] dark:ring-1 dark:ring-white/10">
          <span><b className="block">Practise interview questions</b><span className="text-sm text-white/60">With answers by domain and level</span></span><ArrowRight className="h-5 w-5" />
        </Link>
        <Link to="/jobs" className="flex items-center justify-between rounded-2xl border border-slate-200 p-5 dark:border-white/10">
          <span><b className="block text-slate-900 dark:text-white">Browse current jobs</b><span className="text-sm text-slate-500 dark:text-white/50">Fresher and internship roles</span></span><ArrowRight className="h-5 w-5 text-slate-700 dark:text-white" />
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Keep reading</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} to="/blog/$slug" params={{ slug: r.slug }} className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10">
                <p className="text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]">{r.category}</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{r.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
