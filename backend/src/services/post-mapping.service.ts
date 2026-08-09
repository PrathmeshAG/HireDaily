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
  reason: string;
}

/**
 * Minimal data-access contract used by the resolution logic. It is injected
 * so unit tests can substitute in-memory stubs and never touch Firebase.
 */
export interface DataReader {
  /** Returns the post mapping for a media id, or null when absent. */
  getPostMapping(mediaId: string): Promise<{ jobId: string; jobTitleCache: string | null } | null>;
/** Returns the job record for a job id, or null when absent. */
  getJob(jobId: string): Promise<{
    jobTitle: string | null;
    company: string | null;
    location: string | null;
  } | null>;
}

/** Builds the public Hire Daily job detail URL: `${base}/jobs/${jobId}`. */
export function buildJobUrl(base: string, jobId: string): string {
  const normalizedBase = base.replace(/\/+$/, "");
  return `${normalizedBase}/jobs/${jobId}`;
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
  if (!jobId) {
    return notMapped(mediaId, "post_mapping_invalid", jobId);
  }

  const job = await reader.getJob(jobId);
  if (!job) {
    return notMapped(mediaId, "job_not_found", jobId);
  }

// The job record is the source of truth for the title; the cache is only a
  // fallback for convenience (and is never preferred over the real record).
  const jobTitle = job.jobTitle ?? jobTitleCache;

  return {
    mapped: true,
    mediaId,
    jobId,
    jobUrl: buildJobUrl(publicBaseUrl, jobId),
    jobTitle,
    company: job.company,
    title: job.jobTitle,
    location: job.location,
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
      return m ? { jobId: m.jobId, jobTitleCache: m.jobTitleCache } : null;
    },
    getJob: async (id) => readJob(id),
  };
  return resolvePostJobWithReader(mediaId, reader, env.publicAppUrl);
}
