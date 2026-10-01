import type { Job } from "./firebase";

export function slugify(value: string | undefined | null): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function getJobPath(job: Pick<Job, "id" | "location" | "role" | "companyName">): string {
  return `/jobs/${slugify(job.location) || "remote"}/${slugify(job.role) || "job"}/${slugify(job.companyName) || "company"}/${encodeURIComponent(job.id)}`;
}
