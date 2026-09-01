import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  MapPin,
  Search,
} from "lucide-react";
import { fetchJob } from "../lib/jobs";
import { getJobDateState } from "../lib/job-dates";

export const Route = createFileRoute("/jobs/$id")({
  ssr: true,
  loader: async ({ params }) => ({
    job: await fetchJob(params.id),
  }),
  component: JobDetailPage,
  head: ({ loaderData }) => {
    const job = loaderData?.job;
    return {
      meta: [
        {
          title: job ? `${job.role} at ${job.companyName} — Hire Daily` : "Job Not Found — Hire Daily",
        },
        {
          name: "description",
          content: job
            ? `${job.role} at ${job.companyName}. View location, experience, skills, salary information and application details on Hire Daily.`
            : "The requested job listing could not be found on Hire Daily.",
        },
      ],
    };
  },
});

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/[0.06]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00e5ff]/10">
        <Icon className="h-4 w-4 text-[#00e5ff]" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium text-white/85">
          {value}
        </p>
      </div>
    </div>
  );
}

function JobDetailPage() {
  const { job } = Route.useLoaderData();

  if (!job) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20">
        <div className="glass-strong rounded-3xl p-10 text-center">
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
            This listing may have been removed, closed, or the link may no longer
            be valid.
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

  const dateState = getJobDateState(job.createdAt, job.updatedAt, job.lastDate);
  const isExpired = dateState.expired;

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-8 pb-20">
      <div className="pointer-events-none absolute left-1/4 top-20 -z-10 h-72 w-72 rounded-full bg-[#00e5ff]/8 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-80 -z-10 h-80 w-80 rounded-full bg-[#7c3aed]/8 blur-3xl" />

      <Link
        to="/jobs"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-[#00e5ff]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Browse Jobs
      </Link>

      <section className="glass-strong relative overflow-hidden rounded-3xl p-6 md:p-9">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#00e5ff]/[0.07] via-transparent to-[#7c3aed]/[0.08]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={`${job.companyName} logo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white/80">
                {job.companyName?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-white/60">
                {job.companyName}
              </span>
              {job.verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#00e5ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00e5ff]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>

            <h1
              className="mt-2 text-3xl font-bold leading-tight text-white md:text-5xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              {job.role}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              {job.jobType && (
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10">
                  {job.jobType}
                </span>
              )}
              {job.experience && (
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10">
                  {job.experience}
                </span>
              )}
              {job.category && (
                <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10">
                  {job.category}
                </span>
              )}
            </div>
          </div>

          <div className="w-full md:w-auto md:min-w-[210px]">
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
      </section>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoItem icon={MapPin} label="Location" value={job.location || "Remote"} />
        <InfoItem icon={IndianRupee} label="Expected salary" value={job.salary || "Not disclosed"} />
        <InfoItem icon={GraduationCap} label="Experience" value={job.experience || "Not specified"} />
        <InfoItem
          icon={Clock3}
          label="Posted"
          value={dateState.relativePosted ? `Posted ${dateState.relativePosted}` : "Date not specified"}
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <article className="glass rounded-3xl p-6 md:p-8">
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Job Description
          </h2>

          <div className="mt-5 whitespace-pre-line text-sm leading-7 text-white/65">
            {job.description || "The employer has not provided a detailed description for this listing."}
          </div>

          {job.skills && (
            <section className="mt-9 border-t border-white/[0.07] pt-7">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Skills & Requirements
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.skills
                  .split(/[,|•\n]+/)
                  .map((skill) => skill.trim())
                  .filter(Boolean)
                  .map((skill) => (
                    <span
                      key={skill}
                      className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10"
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-4">
          <div className="glass rounded-3xl p-6">
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Application Details
            </h2>

            <div className="mt-5 space-y-3">
              <InfoItem icon={CalendarDays} label="Apply by" value={job.lastDate || "Not specified"} />
              <InfoItem icon={BriefcaseBusiness} label="Job type" value={job.jobType || "Not specified"} />
              {job.sourceName && (
                <InfoItem icon={ExternalLink} label="Source" value={job.sourceName} />
              )}
            </div>

            {!isExpired && (
              <a
                href={job.applyLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn-glow mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Continue to application
                <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold text-white">
              Job information
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Review the listing details carefully before applying. Application
              requirements and availability are controlled by the employer or
              original listing source.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
