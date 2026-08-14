import { createFileRoute } from "@tanstack/react-router";
import { fetchJobs } from "../lib/jobs";
import { getJobDateState } from "../lib/job-dates";

const BASE_URL = "https://hire-daily.vercel.app";

type SitemapEntry = {
  path: string;
  changefreq: "hourly" | "daily" | "weekly" | "monthly" | "yearly";
  priority: string;
  lastModified?: number;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(value?: number | null): string | null {
  if (!value || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const jobs = await fetchJobs();
        const now = Date.now();

        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/jobs", changefreq: "hourly", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.6" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/how-we-verify-jobs", changefreq: "monthly", priority: "0.6" },
        ];

        const jobEntries: SitemapEntry[] = jobs
          .filter((job) => !getJobDateState(job.createdAt, job.updatedAt, job.lastDate, now).expired)
          .map((job) => ({
            path: `/jobs/${encodeURIComponent(job.id)}`,
            changefreq: "daily",
            priority: "0.8",
            lastModified: job.updatedAt ?? job.createdAt ?? undefined,
          }));

        const entries = [...staticEntries, ...jobEntries];

        const urls = entries
          .map((entry) => {
            const lastModified = toIsoDate(entry.lastModified);
            return [
              "  <url>",
              `    <loc>${escapeXml(`${BASE_URL}${entry.path}`)}</loc>`,
              ...(lastModified ? [`    <lastmod>${lastModified}</lastmod>`] : []),
              `    <changefreq>${entry.changefreq}</changefreq>`,
              `    <priority>${entry.priority}</priority>`,
              "  </url>",
            ].join("\n");
          })
          .join("\n");

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${urls}\n` +
          `</urlset>\n`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
