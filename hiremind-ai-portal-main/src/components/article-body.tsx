import { Fragment } from "react";

/** Renders the plain-text article format used in data/articles.ts. */
export const slugifyHeading = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function headingsOf(body: string) {
  return body.split("\n\n").filter((b) => b.startsWith("## ")).map((b) => b.slice(3).trim());
}

export function ArticleBody({ body }: { body: string }) {
  return (
    <>
      {body.split("\n\n").map((block, i) => {
        if (block.startsWith("## ")) {
          const text = block.slice(3).trim();
          return (
            <h2 key={i} id={slugifyHeading(text)} className="mt-10 scroll-mt-28 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {text}
            </h2>
          );
        }
        if (block.startsWith("~~~")) {
          return (
            <pre key={i} className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 font-mono text-[13px] leading-6 text-cyan-100">
              <code>{block.replace(/^~~~\n?/, "").replace(/\n?~~~$/, "")}</code>
            </pre>
          );
        }
        if (block.split("\n").every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-8 text-slate-700 marker:text-cyan-600 dark:text-white/70 dark:marker:text-[#00e5ff]">
              {block.split("\n").map((l) => <li key={l}>{l.slice(2)}</li>)}
            </ul>
          );
        }
        return (
          <Fragment key={i}>
            <p className="mt-5 text-[17px] leading-8 text-slate-700 dark:text-white/70">{block}</p>
          </Fragment>
        );
      })}
    </>
  );
}
