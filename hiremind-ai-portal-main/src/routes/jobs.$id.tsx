import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Copy,
  Check,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Laptop,
  MapPin,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { fetchJob, fetchJobs } from "../lib/jobs";
import { JobCard } from "../components/job-card";

export const Route = createFileRoute("/jobs/$id")({
  ssr: true,
  loader: async ({ params }) => ({
    job: await fetchJob(params.id),
    allJobs: await fetchJobs(),
  }),
  component: JobDetailPage,
  head: ({ loaderData }) => {
    const job = loaderData?.job;

    return {
      meta: [
        {
          title: job
            ? `${job.role} at ${job.companyName} — Hire Daily`
            : "Job Not Found — Hire Daily",
        },
        {
          name: "description",
          content: job
            ? `${job.role} at ${job.companyName}. View job description, location, experience, skills, salary information, deadline and application details on Hire Daily.`
            : "The requested job listing could not be found on Hire Daily.",
        },
        {
          property: "og:title",
          content: job
            ? `${job.role} at ${job.companyName} — Hire Daily`
            : "Job Not Found — Hire Daily",
        },
        {
          property: "og:description",
          content: job
            ? `Review the details and application information for ${job.role} at ${job.companyName}.`
            : "The requested job listing could not be found.",
        },
      ],
    };
  },
});

function InfoItem({
  icon: Icon,
  label,
  value,
  compact = false,
}: {
  icon: typeof MapPin;
  label: string;
  value?: string;
  compact?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl bg-white/[0.035] ring-1 ring-white/[0.06] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-[#00e5ff]/10 ${
          compact ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <Icon
          className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-[#00e5ff]`}
        />
      </span>

      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-white/85">
          {value}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e5ff]/70">
          {eyebrow}
        </p>
      )}
      <h2
        className="text-xl font-bold text-white md:text-2xl"
        style={{ fontFamily: "'Space Grotesk'" }}
      >
        {children}
      </h2>
    </div>
  );
}

function JobDetailPage() {
  const { job, allJobs } = Route.useLoaderData();
  const [copied, setCopied] = React.useState(false);

  if (!job) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <div className="glass-strong rounded-3xl p-8 text-center md:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Search className="h-6 w-6 text-[#00e5ff]" />
          </div>

          <h1
            className="mt-6 text-3xl font-bold text-white"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Job listing not found
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/55">
            This listing may have been removed, closed, or the link may no
            longer be valid.
          </p>

          <Link
            to="/jobs"
            className="btn-glow mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse all jobs
          </Link>
        </div>
      </main>
    );
  }

  const deadlineTimestamp = job.lastDate
    ? Date.parse(job.lastDate)
    : Number.NaN;

  const isExpired =
    Number.isFinite(deadlineTimestamp) && deadlineTimestamp < Date.now();

  const deadlineText = job.lastDate || "Not specified";

  const postedTimestamp =
    typeof job.createdAt === "number"
      ? job.createdAt
      : Number(job.createdAt);

  const postedText = Number.isFinite(postedTimestamp)
    ? `Posted ${new Date(postedTimestamp).toLocaleDateString()}`
    : "Date not specified";

  const skills = job.skills
    ? job.skills
        .split(/[,|•\n]+/)
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const handleShare = async () => {
    const shareData = {
      title: `${job.role} at ${job.companyName} — Hire Daily`,
      text: `Check out this job opportunity on Hire Daily: ${job.role} at ${job.companyName}.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled sharing or clipboard access was unavailable.
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access may be unavailable in restricted browsers.
    }
  };

  const normalizeRelatedValue = (value: unknown) =>
    typeof value === "string"
      ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
      : "";

  const currentRole = normalizeRelatedValue(job.role);
  const currentRoleTokens = new Set(
    currentRole.split(/\s+/).filter((token) => token.length >= 3),
  );

  const relatedJobs = (allJobs ?? [])
    .filter((candidate) => candidate.id !== job.id)
    .map((candidate: NonNullable<typeof job>) => {
      const role = normalizeRelatedValue(candidate.role);
      const location = normalizeRelatedValue(candidate.location);
      const skills = normalizeRelatedValue(candidate.skills);
      let score = 0;

      if (role === currentRole) score += 100;
      else if (currentRole && role.includes(currentRole)) score += 80;
      else if (role && currentRole.includes(role)) score += 70;

      const roleTokens = role.split(/\s+/).filter((token) => token.length >= 3);
      score += roleTokens.filter((token) => currentRoleTokens.has(token)).length * 20;

      if (location && location === normalizeRelatedValue(job.location)) score += 8;
      if (skills && job.skills && skills === normalizeRelatedValue(job.skills)) score += 5;

      return { candidate, score };
    })
    .filter(({ score }: { score: number }) => score >= 20)
    .sort(
      (
        a: { candidate: NonNullable<typeof job>; score: number },
        b: { candidate: NonNullable<typeof job>; score: number },
      ) =>
        b.score - a.score ||
        (b.candidate.createdAt ?? 0) - (a.candidate.createdAt ?? 0),
    )
    .slice(0, 3)
    .map(({ candidate }) => candidate);

  return (
    <main className="relative mx-auto max-w-6xl px-3 py-5 pb-28 sm:px-4 sm:py-8 sm:pb-20">
      <div className="pointer-events-none absolute left-1/4 top-16 -z-10 h-72 w-72 rounded-full bg-[#00e5ff]/8 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-[28rem] -z-10 h-80 w-80 rounded-full bg-[#7c3aed]/8 blur-3xl" />

      {/* Breadcrumb / utility bar */}
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-xs text-white/50 transition-colors hover:text-[#00e5ff] sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:px-4 sm:text-sm"
            aria-label="Share job"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className={`btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-200 sm:px-4 sm:text-sm ${
              copied ? "text-[#00e5ff] ring-1 ring-[#00e5ff]/30" : ""
            }`}
            aria-label={copied ? "Job link copied" : "Copy job link"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? "Copied!" : "Copy link"}</span>
          </button>
        </div>
      </div>

      {/* Job hero */}
      <section className="glass-strong relative overflow-hidden rounded-3xl p-4 sm:p-6 md:p-9">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00e5ff]/[0.07] via-transparent to-[#7c3aed]/[0.08]" />

        <div className="relative">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex items-start gap-4 md:contents">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10 sm:h-20 sm:w-20">
                {job.companyLogo ? (
                  <img
                    src={job.companyLogo}
                    alt={`${job.companyName} logo`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white/80 sm:text-3xl">
                    {job.companyName?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-white/65">
                    {job.companyName}
                  </span>

                  {job.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#00e5ff]/10 px-2.5 py-1 text-[10px] font-semibold text-[#00e5ff]">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified listing
                    </span>
                  )}
                </div>

                <h1
                  className="mt-2 text-[1.8rem] font-bold leading-[1.08] text-white sm:text-3xl md:text-5xl"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  {job.role}
                </h1>

                <div className="mt-4 flex flex-wrap gap-2">
                  {job.jobType && (
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/70 ring-1 ring-white/10">
                      {job.jobType}
                    </span>
                  )}
                  {job.experience && (
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/70 ring-1 ring-white/10">
                      {job.experience}
                    </span>
                  )}
                  {job.category && (
                    <span className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/70 ring-1 ring-white/10">
                      {job.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto md:min-w-[220px]">
              {isExpired ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-5 py-4 text-center">
                  <p className="text-sm font-semibold text-rose-200">
                    Applications closed
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    The listed deadline has passed.
                  </p>
                </div>
              ) : (
                <a
                  href={job.applyLink}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn-glow flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-bold"
                >
                  Apply Now
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick facts inside hero */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-5 sm:grid-cols-4 md:mt-7 md:gap-3">
            <InfoItem
              icon={MapPin}
              label="Location"
              value={job.location || "Remote"}
              compact
            />
            <InfoItem
              icon={IndianRupee}
              label="Salary"
              value={job.salary || "Not disclosed"}
              compact
            />
            <InfoItem
              icon={Clock3}
              label="Posted"
              value={postedText}
              compact
            />
            <InfoItem
              icon={CalendarDays}
              label="Apply by"
              value={deadlineText}
              compact
            />
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* Overview */}
          <article className="glass rounded-3xl p-5 sm:p-6 md:p-8">
            <SectionTitle eyebrow="Role overview">About this job</SectionTitle>

            <div className="mt-5 whitespace-pre-line text-sm leading-7 text-white/65">
              {job.description ||
                "The employer has not provided a detailed description for this listing."}
            </div>
          </article>

          {/* Skills */}
          {skills.length > 0 && (
            <article className="glass rounded-3xl p-5 sm:p-6 md:p-8">
              <SectionTitle eyebrow="What you may need">
                Skills & requirements
              </SectionTitle>

              <div className="mt-5 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white/70 ring-1 ring-white/10"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  job.experience
                    ? `Experience: ${job.experience}`
                    : "Check the listing for experience requirements",
                  job.jobType
                    ? `Work type: ${job.jobType}`
                    : "Check the listing for the work arrangement",
                  job.location
                    ? `Location: ${job.location}`
                    : "Location information is not specified",
                  job.salary
                    ? `Compensation: ${job.salary}`
                    : "Salary information is not disclosed",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 rounded-xl bg-white/[0.025] px-3 py-3 text-xs leading-5 text-white/60 ring-1 ring-white/[0.06]"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
                    {item}
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* How to apply */}
          <article className="rounded-3xl border border-[#00e5ff]/10 bg-gradient-to-br from-[#00e5ff]/[0.045] to-[#7c3aed]/[0.045] p-5 sm:p-6 md:p-8">
            <SectionTitle eyebrow="Application">Before you apply</SectionTitle>

            <p className="mt-3 text-sm leading-6 text-white/55">
              Review the listing carefully and make sure the role, location,
              eligibility and deadline match your requirements before
              continuing to the employer or original application source.
            </p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "Review the complete job description",
                "Confirm experience and eligibility",
                "Check the work location or remote arrangement",
                "Check the application deadline",
                "Keep your resume and required documents ready",
                "Apply through the provided application option",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-xl bg-black/10 px-3 py-3 text-xs text-white/65 ring-1 ring-white/[0.06]"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
                  {item}
                </div>
              ))}
            </div>

            {!isExpired && (
              <a
                href={job.applyLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold sm:w-auto sm:max-w-xs"
              >
                Continue to application
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </article>

          {/* Source & verification */}
          <section className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-6 md:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[#00e5ff]/5 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <SectionTitle eyebrow="Trust & transparency">
                    Source & verification
                  </SectionTitle>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-white/45 sm:text-sm">
                    This section explains where the application destination
                    comes from and what Hire Daily can verify about this
                    listing.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-medium text-white/50 ring-1 ring-white/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
                  Listing transparency
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                      <Search className="h-4 w-4 text-[#00e5ff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Source
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-white/80">
                        {job.sourceName || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                      <ExternalLink className="h-4 w-4 text-[#00e5ff]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Application destination
                      </p>
                      {job.applyLink ? (
                        <a
                          href={job.applyLink}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-[#00e5ff] transition-colors hover:text-white"
                        >
                          <span className="truncate">Official employer application page</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-white/50">
                          Application link not available
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                      <BadgeCheck className="h-4 w-4 text-[#00e5ff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Verification
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white/80">
                        {job.verificationStatus === "verified"
                          ? "Verified listing"
                          : "Not independently verified"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                      <BriefcaseBusiness className="h-4 w-4 text-[#00e5ff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                        Application
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white/80">
                        Employer / original listing
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3">
                <p className="text-xs leading-5 text-white/45">
                  Hire Daily displays information available for this listing.
                  Always review the destination page, eligibility criteria
                  and application requirements before submitting personal
                  information. Hiring decisions and job availability are
                  controlled by the employer or original listing source.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-[#00e5ff]" />
              <h2
                className="text-lg font-bold text-white"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Application details
              </h2>
            </div>

            <div className="mt-5 space-y-2">
              <InfoItem
                icon={CalendarDays}
                label="Apply by"
                value={job.lastDate || "Not specified"}
                compact
              />
              <InfoItem
                icon={BriefcaseBusiness}
                label="Job type"
                value={job.jobType || "Not specified"}
                compact
              />
              <InfoItem
                icon={GraduationCap}
                label="Experience"
                value={job.experience || "Not specified"}
                compact
              />
              <InfoItem
                icon={Laptop}
                label="Work arrangement"
                value={
                  job.location?.toLowerCase().includes("remote")
                    ? "Remote"
                    : job.location || "See listing"
                }
                compact
              />
            </div>

            {!isExpired ? (
              <a
                href={job.applyLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold"
              >
                Apply for this job
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <div className="mt-5 rounded-xl bg-rose-400/5 px-4 py-3 text-center text-xs text-rose-200 ring-1 ring-rose-400/15">
                Applications closed
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-white">
              Looking for more opportunities?
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Browse more fresher, internship, remote and location-based jobs
              on Hire Daily.
            </p>

            <Link
              to="/jobs"
              className="btn-ghost-glow mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold"
            >
              Explore more jobs
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobile sticky apply */}
      {!isExpired && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#090d16]/95 p-2.5 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-xs font-semibold text-white">
                {job.role}
              </p>
              <p className="truncate text-[10px] text-white/40">
                {job.companyName}
              </p>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/65 ring-1 ring-white/10"
              aria-label="Share job"
            >
              <Share2 className="h-4 w-4" />
            </button>

            <a
              href={job.applyLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="btn-glow flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold"
            >
              Apply Now
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
      {relatedJobs.length > 0 && (
        <section className="mt-10 sm:mt-12 md:mt-16">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00e5ff]/70">
                More opportunities
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "'Space Grotesk'" }}>
                Related Jobs
              </h2>
              <p className="mt-1 text-xs text-white/40 sm:text-sm">
                Similar roles you may want to explore.
              </p>
            </div>
            <Link
              to="/jobs"
              className="hidden items-center gap-1.5 text-xs font-semibold text-[#00e5ff] hover:text-white sm:inline-flex"
            >
              View all jobs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relatedJobs.map((relatedJob, index) => (
              <JobCard key={relatedJob.id} job={relatedJob} index={index} />
            ))}
          </div>

          <Link
            to="/jobs"
            className="btn-ghost-glow mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold sm:hidden"
          >
            View all jobs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

    </main>
  );
}
