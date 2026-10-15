import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, Download as DownloadIcon, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import {
  fetchDownloadBySlug,
  drivePreviewUrl,
  driveDownloadUrl,
  driveViewUrl,
  driveThumbUrl,
} from "../lib/downloads";
import { SITE } from "../lib/site";

export const Route = createFileRoute("/downloads/$slug")({
  ssr: true,
  loader: async ({ params }) => {
    const { item, all } = await fetchDownloadBySlug(params.slug);
    if (!item) throw notFound();
    return { item, related: all.filter((d) => d.id !== item.id).slice(0, 3) };
  },
  component: DownloadPage,
  head: ({ loaderData }) => {
    const d = loaderData?.item;
    if (!d) return { meta: [{ title: "PDF not found — Hire Daily" }] };
    const title = `${d.title} (PDF) | Hire Daily`;
    const url = `${SITE.url}/downloads/${d.slug}`;
    const image = driveThumbUrl(d.fileId, 1000);
    return {
      meta: [
        { title },
        { name: "description", content: d.description },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: d.description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: d.description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 motion-reduce:transition-none dark:bg-[#00e5ff] dark:text-slate-950 dark:shadow-cyan-500/20 dark:hover:bg-cyan-300 ${focus}`;
const btnGhost = `inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 motion-reduce:transition-none dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 ${focus}`;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function DownloadPage() {
  const { item: d, related } = Route.useLoaderData();
  const [msg, setMsg] = useState("");
  const pageUrl = `${SITE.url}/downloads/${d.slug}`;

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 2200);
  };
  const copy = async () => flash((await copyText(pageUrl)) ? "Link copied to clipboard" : "Could not copy. Please copy the link from the box.");
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: d.title, text: d.description, url: pageUrl });
        return;
      } catch {
        /* user cancelled: fall back to copy */
      }
    }
    await copy();
  };
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${d.title} — ${pageUrl}`)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
      <Link to="/downloads" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-[#00e5ff]">
        <ArrowLeft className="h-4 w-4" /> All downloads
      </Link>

      <header className="mt-6">
        {d.category && <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]">{d.category}</p>}
        <h1 className="mt-2 text-balance text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">{d.title}</h1>
        <p className="mt-4 whitespace-pre-line text-base leading-7 text-slate-600 dark:text-white/60">{d.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href={driveDownloadUrl(d.fileId)} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
            <DownloadIcon className="h-4 w-4" /> Download PDF
          </a>
          <button type="button" onClick={share} className={btnGhost}>
            <Share2 className="h-4 w-4" /> Share
          </button>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={pageUrl}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Link to this page"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
          />
          <button type="button" onClick={copy} className={btnGhost}>
            {msg.startsWith("Link copied") ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-2 h-4 text-xs text-emerald-600 dark:text-emerald-300">{msg}</p>
      </header>

      <section aria-label="PDF preview" className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <iframe
            src={drivePreviewUrl(d.fileId)}
            title={`Preview: ${d.title}`}
            loading="lazy"
            allow="autoplay"
            className="h-[75vh] min-h-[480px] w-full"
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-white/45">
          Preview not loading?{" "}
          <a href={driveViewUrl(d.fileId)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff]">
            Open in Google Drive <ExternalLink className="h-3 w-3" />
          </a>
          . Think something is wrong with this file?{" "}
          <Link to="/contact" className="font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff]">Contact us</Link>.
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-label="More downloads">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">More PDFs</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to="/downloads/$slug"
                  params={{ slug: r.slug }}
                  className="block h-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none dark:border-white/10 dark:bg-white/[0.035] dark:text-white"
                >
                  {r.title}
                  {r.category && <span className="mt-1 block text-xs font-medium text-cyan-700 dark:text-[#00e5ff]">{r.category}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
