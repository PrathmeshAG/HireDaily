import { Link } from "@tanstack/react-router";
import { MapPin, Briefcase, IndianRupee, Clock, ExternalLink, Share2, Copy, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import type { Job } from "../lib/firebase";

function isNew(createdAt: number) {
  return Date.now() - createdAt < 24 * 60 * 60 * 1000;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function JobCard({ job, index = 0 }: { job: Job; index?: number }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/jobs/${job.id}` : "";
  const fresh = isNew(job.createdAt);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${job.role} at ${job.companyName}`, url: link });
      } catch {}
    } else {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard");
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Job link copied");
  };

  return (
    <div
      className="glass card-glow group relative flex flex-col overflow-hidden rounded-2xl p-5 animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#00e5ff]/10 blur-3xl transition-opacity group-hover:opacity-100" />

      <div className="flex items-start gap-3">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.companyName}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-white/80">
              {job.companyName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-white/70">{job.companyName}</p>
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
          </div>
          <Link
            to="/jobs/$id"
            params={{ id: job.id }}
            className="mt-0.5 line-clamp-2 block text-lg font-semibold leading-tight text-white transition-colors group-hover:text-[#00e5ff]"
          >
            {job.role}
          </Link>
        </div>
        {fresh && (
          <span className="animate-glow rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#050816]">
            New
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {job.jobType && (
          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/70 ring-1 ring-white/10">
            {job.jobType}
          </span>
        )}
        {job.experience && (
          <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-white/70 ring-1 ring-white/10">
            {job.experience}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#22d3ee]" />
          <span className="truncate">{job.location || "Remote"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IndianRupee className="h-3.5 w-3.5 text-[#22d3ee]" />
          <span className="truncate">{job.salary || "Not disclosed"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-[#22d3ee]" />
          <span className="truncate">{job.experience || "Any"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[#22d3ee]" />
          <span className="truncate">{timeAgo(job.createdAt)}</span>
        </div>
      </div>

      {job.lastDate && (
        <div className="mt-3 text-xs text-white/50">
          Apply by <span className="text-white/80">{job.lastDate}</span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <a
          href={job.applyLink || "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="btn-glow flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm"
        >
          Apply <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={share}
          className="btn-ghost-glow flex h-10 w-10 items-center justify-center rounded-xl"
          aria-label="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
        <button
          onClick={copy}
          className="btn-ghost-glow flex h-10 w-10 items-center justify-center rounded-xl"
          aria-label="Copy link"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex gap-3">
        <div className="shimmer-loading h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="shimmer-loading h-3 w-1/3 rounded" />
          <div className="shimmer-loading h-5 w-2/3 rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="shimmer-loading h-3 w-full rounded" />
        <div className="shimmer-loading h-3 w-4/5 rounded" />
      </div>
      <div className="mt-5 shimmer-loading h-10 rounded-xl" />
    </div>
  );
}