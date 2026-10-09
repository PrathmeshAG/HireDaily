// Phase 5 Checkpoint 2 — Instagram Post → Hire Daily Job resolution.
//
// Flow:
//   mediaId
//     → automation/postMappings/{mediaId}  (read)
//     → jobId
//     → jobs/{jobId}                       (READ-ONLY)
//     → public Hire Daily job URL
//
// This service is deliberately framework-free for the resolution logic. The
// actual Firebase reads are injected via a `DataReader` so the resolution
// logic can be unit-tested with mocked/in-memory data (no Firebase, no
// production writes). The production bindings (readPostMapping / readJob / env)
// are wired in `resolvePostJob` at the bottom.

import { env } from "../config/env.js";
import { readPostMapping, readJob } from "./firebase-admin.service.js";
import type { MappingExtraLink, ResolvedLink } from "./job-links.js";

export interface PostJobResolution {
  mapped: boolean;
  mediaId: string;
  jobId: string | null;
  jobUrl: string | null;
  jobTitle: string | null;
  /** Company name from the job record (Checkpoint 3 template rendering). */
  company: string | null;
  /** Job title from the job record (Checkpoint 3 template rendering). */
  title: string | null;
  /** Job location from the job record (Checkpoint 3 template rendering). */
  location: string | null;
  /**
   * All links to deliver, primary job first, then any extra job/external
   * links (max 5 total). Always has at least the primary link when mapped.
   * Single-job mappings produce exactly one entry, so legacy behavior holds.
   */
  links: ResolvedLink[];
  reason: string;
}

/**
 * Minimal data-access contract used by the resolution logic. It is injected
 * so unit tests can substitute in-memory stubs and never touch Firebase.
 */
export interface DataReader {
  /** Returns the post mapping for a media id, or null when absent. */
  getPostMapping(mediaId: string): Promise<{
    jobId: string;
    jobTitleCache: string | null;
    status?: "active" | "archived";
    extraLinks?: MappingExtraLink[];
  } | null>;
/** Returns the job record for a job id, or null when absent. */
  getJob(jobId: string): Promise<{
    jobTitle: string | null;
    company: string | null;
    location: string | null;
  } | null>;
}

/** Builds the public Hire Daily job detail URL: `${base}/jobs/${jobId}`. */
export function buildJobUrl(
  base: string,
  jobId: string,
  location?: string | null,
  jobTitle?: string | null,
  company?: string | null,
): string {
  const normalizedBase = base.replace(/\/+$/, "");
  if (!location || !jobTitle || !company) return `${normalizedBase}/jobs/${jobId}`;

  const slugify = (value: string): string =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  return `${normalizedBase}/jobs/${slugify(location) || "remote"}/${slugify(jobTitle) || "job"}/${slugify(company) || "company"}/${encodeURIComponent(jobId)}`;
}

function jobLabel(company: string | null, title: string | null): string {
  if (company && title) return `${title} - ${company}`;
  return title || company || "Job";
}

function notMapped(mediaId: string, reason: string, jobId: string | null = null): PostJobResolution {
  return {
    mapped: false,
    mediaId,
    jobId,
    jobUrl: null,
    jobTitle: null,
    company: null,
    title: null,
    location: null,
    links: [],
    reason,
  };
}

/**
 * Pure resolution logic. Given a mediaId and a DataReader, resolves the
 * mapped job and its public URL without touching Firebase directly.
 *
 * - No mapping      → { mapped:false, reason:"post_mapping_not_found" }
 * - No job          → { mapped:false, reason:"job_not_found" }
 * - Success         → { mapped:true, jobId, jobUrl, jobTitle }
 */
export async function resolvePostJobWithReader(
  mediaId: string,
  reader: DataReader,
  publicBaseUrl: string,
): Promise<PostJobResolution> {
  if (!mediaId) {
    return notMapped(mediaId, "media_id_missing");
  }

  const mapping = await reader.getPostMapping(mediaId);
  if (!mapping) {
    return notMapped(mediaId, "post_mapping_not_found");
  }

  const { jobId, jobTitleCache } = mapping;
  if (mapping.status === "archived") {
    return notMapped(mediaId, "post_mapping_archived", jobId || null);
  }
  if (!jobId) {
    // No primary job: valid only when the mapping has extra links (for
    // example external-only). Without any link there is nothing to send.
    const extras = mapping.extraLinks ?? [];
    if (extras.length === 0) {
      return notMapped(mediaId, "post_mapping_invalid", jobId);
    }

    const links: ResolvedLink[] = [];
    let firstJob: { company: string | null; title: string | null; location: string | null } | null = null;
    for (const extra of extras) {
      if (links.length >= 5) break;
      if (extra.type === "external") {
        links.push({ label: extra.label, url: extra.url });
        continue;
      }
      const extraJob = await reader.getJob(extra.jobId);
      if (!extraJob) continue;
      if (links.length === 0) {
        firstJob = { company: extraJob.company, title: extraJob.jobTitle, location: extraJob.location };
      }
      links.push({
        label: extra.label || jobLabel(extraJob.company, extraJob.jobTitle),
        url: buildJobUrl(publicBaseUrl, extra.jobId, extraJob.location, extraJob.jobTitle, extraJob.company),
      });
    }
    if (links.length === 0) {
      return notMapped(mediaId, "job_not_found", null);
    }

    // {{title}}: the first job's title, or the first link's name for
    // external links. {{company}} / {{location}} are only known for jobs.
    const title = firstJob?.title ?? links[0].label;
    return {
      mapped: true,
      mediaId,
      jobId: null,
      jobUrl: links[0].url,
      jobTitle: title,
      company: firstJob?.company ?? null,
      title,
      location: firstJob?.location ?? null,
      links,
      reason: "resolved",
    };
  }

  const job = await reader.getJob(jobId);
  if (!job) {
    return notMapped(mediaId, "job_not_found", jobId);
  }

// The job record is the source of truth for the title; the cache is only a
  // fallback for convenience (and is never preferred over the real record).
  const jobTitle = job.jobTitle ?? jobTitleCache;
  const jobUrl = buildJobUrl(publicBaseUrl, jobId, job.location, job.jobTitle, job.company);

  const links: ResolvedLink[] = [
    { label: jobLabel(job.company, jobTitle), url: jobUrl },
  ];

  // Optional extra links (additional jobs / external URLs). A missing extra
  // job is skipped — it must never block the primary job delivery.
  for (const extra of mapping.extraLinks ?? []) {
    if (links.length >= 5) break;
    if (extra.type === "external") {
      links.push({ label: extra.label, url: extra.url });
      continue;
    }
    if (extra.jobId === jobId) continue;
    const extraJob = await reader.getJob(extra.jobId);
    if (!extraJob) continue;
    links.push({
      label: extra.label || jobLabel(extraJob.company, extraJob.jobTitle),
      url: buildJobUrl(publicBaseUrl, extra.jobId, extraJob.location, extraJob.jobTitle, extraJob.company),
    });
  }

  return {
    mapped: true,
    mediaId,
    jobId,
    jobUrl,
    jobTitle,
    company: job.company,
    title: job.jobTitle,
    location: job.location,
    links,
    reason: "resolved",
  };
}

/**
 * Production entry point used by the webhook/rule flow. Reads the real
 * Realtime Database (postMappings + jobs, jobs is READ-ONLY) and builds the
 * public URL from the configured base.
 */
export async function resolvePostJob(mediaId: string): Promise<PostJobResolution> {
  const reader: DataReader = {
    getPostMapping: async (id) => {
      const m = await readPostMapping(id);
      return m
        ? { jobId: m.jobId, jobTitleCache: m.jobTitleCache, status: m.status, extraLinks: m.extraLinks }
        : null;
    },
    getJob: async (id) => readJob(id),
  };
  const publicBaseUrl = process.env.NODE_ENV === "production"
    ? "https://hire-daily.vercel.app"
    : env.publicAppUrl;
  return resolvePostJobWithReader(mediaId, reader, publicBaseUrl);
}
