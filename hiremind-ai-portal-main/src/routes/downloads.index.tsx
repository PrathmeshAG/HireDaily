import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { fetchDownloads, driveThumbUrl } from "../lib/downloads";
import { SITE } from "../lib/site";

const TITLE = "PDF Downloads — Notes, Cheat Sheets and Resume Resources | Hire Daily";
const DESC = "Preview and download PDF notes, cheat sheets and resume resources for freshers and job seekers, curated on Hire Daily.";

export const Route = createFileRoute("/downloads/")({
  ssr: true,
  loader: async () => ({ items: await fetchDownloads() }),
  component: DownloadsIndex,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: `${SITE.url}/downloads` }],
  }),
});

function Thumb({ id, title }: { id: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 dark:bg-white/[0.04]">
        <FileText className="h-10 w-10 text-slate-400 dark:text-white/30" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={driveThumbUrl(id, 600)}
      alt={`Preview of ${title}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="aspect-[4/3] w-full bg-slate-100 object-cover object-top dark:bg-white/[0.04]"
    />
  );
}

function DownloadsIndex() {
  const { items } = Route.useLoaderData();
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(items.map((d) => d.category).filter(Boolean)))];
  const list = cat === "All" ? items : items.filter((d) => d.category === cat);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]">Downloads</p>
        <h1 className="mt-1 text-balance text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">PDF notes and resources</h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-white/55">
          Preview any PDF right on the page, then download it or share the link with a friend.
        </p>
      </header>

      {cats.length > 2 && (
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                cat === c
                  ? "border-slate-900 bg-slate-900 text-white dark:border-[#00e5ff] dark:bg-[#00e5ff] dark:text-slate-950"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/45">
          No PDFs here yet. Please check back soon.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <article
              key={d.id}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl motion-reduce:transition-none dark:border-white/10 dark:bg-white/[0.035]"
            >
              <Thumb id={d.fileId} title={d.title} />
              <div className="flex flex-1 flex-col p-5">
                {d.category && <p className="text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]">{d.category}</p>}
                <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  <Link to="/downloads/$slug" params={{ slug: d.slug }} className="after:absolute after:inset-0">
                    {d.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600 dark:text-white/55">{d.description}</p>
                <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]">
                  Preview &amp; download <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
