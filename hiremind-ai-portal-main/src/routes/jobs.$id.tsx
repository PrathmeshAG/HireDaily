import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  Clock,
  ExternalLink,
  IndianRupee,
  MapPin,
  Share2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { fetchJob, fetchJobs } from "../lib/jobs";
import { JobCard } from "../components/job-card";
import { JobValue } from "../components/job-value";
import { JobEligibility } from "../components/job-eligibility";
import { ApplicationGuidance } from "../components/application-guidance";
import { SourceVerification } from "../components/source-verification";
import { formatJobDate, getJobDateState } from "../lib/job-dates";

const JobAd = lazy(() =>
  import("../components/job-ad").then((m) => ({ default: m.JobAd })),
);

export const Route = createFileRoute("/jobs/$id")({
  ssr: true,
  loader: async ({ params }) => {
    const job = await fetchJob(params.id);
    if (!job) throw notFound();
    const allJobs = await fetchJobs();
    return { job, allJobs };
  },
  head: ({ loaderData, params }) => {
    const job = loaderData?.job;
    const canonical = `https://hire-daily.vercel.app/jobs/${encodeURIComponent(params.id)}`;

    if (!job) {
      return {
        meta: [
          { title: "Job Not Found — Hire Daily" },
          { name: "robots", content: "noindex, nofollow" },
        ],
      };
    }

    const title = `${job.role} at ${job.companyName} — Hire Daily`;
    const description = (
      job.description ||
      `${job.role} at ${job.companyName} in ${job.location || "India"}.`
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: JobDetail,
});

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || /^n\/?a$/i.test(text)) return null;
  return text;
}

function splitList(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];
  return text
    .split(/[,\\n;•]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstAvailable(...values: unknown[]): string | null {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return null;
}

function JobDetail() {
  const { job, allJobs } = Route.useLoaderData();

  const link = typeof window !== "undefined" ? window.location.href : "";

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.role} at ${job.companyName}`,
          url: link,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const related = (allJobs ?? [])
    .filter((j) => j.id !== job.id && j.role === job.role)
    .slice(0, 3);

  const skills = splitList(job.skills);
  const description = cleanText(job.description);
  const quickSummary = firstAvailable(
    description,
    `${job.role} at ${job.companyName}`,
  );

  const responsibilities = splitList(
    (job as { responsibilities?: string }).responsibilities,
  );

  const eligibility = splitList(
    (job as {
      eligibility?: string;
      qualifications?: string;
      requirements?: string;
    }).eligibility ??
      (job as { qualifications?: string }).qualifications ??
      (job as { requirements?: string }).requirements,
  );

  const howToApply = firstAvailable(
    (job as { howToApply?: string }).howToApply,
    job.applyLink ? "Apply through the official application link." : null,
  );

  const dateState = getJobDateState(
    job.createdAt,
    job.updatedAt,
    job.lastDate,
  );

  const remaining =
    dateState.applyByTime === null
      ? null
      : Math.ceil(
          (dateState.applyByTime - Date.now()) / (1000 * 60 * 60 * 24),
        );

  const urgent =
    !dateState.expired &&
    remaining !== null &&
    remaining >= 0 &&
    remaining <= 3;

  const expired = dateState.expired;

  const postedDate = job.createdAt
    ? new Date(job.createdAt).toISOString()
    : undefined;

  const applicationDeadline = job.lastDate
    ? new Date(job.lastDate).toISOString()
    : undefined;

  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.role,
    description: description ?? `${job.role} at ${job.companyName}`,
    ...(postedDate ? { datePosted: postedDate } : {}),
    ...(applicationDeadline ? { validThrough: applicationDeadline } : {}),
    ...(job.jobType ? { employmentType: job.jobType } : {}),
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
      ...(job.companyLogo ? { logo: job.companyLogo } : {}),
    },
    ...(job.location
      ? {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
            },
          },
        }
      : {}),
    ...(job.salary
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: "INR",
            value: {
              "@type": "QuantitativeValue",
              value: job.salary,
            },
          },
        }
      : {}),
    ...(job.experience
      ? { experienceRequirements: job.experience }
      : {}),
    ...(job.skills ? { skills: job.skills } : {}),
    directApply: Boolean(job.applyLink) && !expired,
    url: `https://hire-daily.vercel.app/jobs/${encodeURIComponent(job.id)}`,
  };

  const overview = [
    { icon: MapPin, label: "Location", text: job.location || "Not specified" },
    {
      icon: IndianRupee,
      label: "Salary",
      text: job.salary || "Not specified",
    },
    {
      icon: Briefcase,
      label: "Experience",
      text: job.experience || "Not specified",
    },
    { icon: Clock, label: "Job type", text: job.jobType || "Not specified" },
  ];

  const dates = [
    formatJobDate(dateState.postedAt)
      ? {
          label: "Posted",
          value: formatJobDate(dateState.postedAt)!,
        }
      : null,
    formatJobDate(dateState.updatedAt)
      ? {
          label: "Updated",
          value: formatJobDate(dateState.updatedAt)!,
        }
      : null,
    dateState.applyBy
      ? {
          label: "Apply by",
          value:
            formatJobDate(dateState.applyBy) ?? dateState.applyBy,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }}
      />

      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-[#00e5ff]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      {/* <div className="mt-8">
        <Suspense fallback={null}>
          <JobAd />
        </Suspense>
      </div> */}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass card-glow relative overflow-hidden rounded-3xl p-6 animate-fade-up md:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#7c3aed]/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10">
                {job.companyLogo ? (
                  <img
                    src={job.companyLogo}
                    alt={job.companyName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white/80">
                    {job.companyName?.[0]}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm text-white/70">{job.companyName}</p>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#00e5ff]" />

                  {urgent && (
                    <span className="ml-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300 ring-1 ring-rose-500/30">
                      {remaining === 0
                        ? "Closes today"
                        : `${remaining}d left`}
                    </span>
                  )}
                </div>

                <h1
                  className="mt-1 text-3xl font-bold text-white md:text-4xl"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  {job.role}
                </h1>
              </div>
            </div>

            {skills.length > 0 && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  Required Skills
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-gradient-to-br from-[#00e5ff]/10 to-[#7c3aed]/10 px-3 py-1.5 text-xs text-white ring-1 ring-white/10"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {quickSummary && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  Quick Summary
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {quickSummary}
                </p>
              </div>
            )}

            {description && description !== quickSummary && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  Description
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {description}
                </p>
              </div>
            )}

            {responsibilities.length > 0 && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  Key Responsibilities
                </h2>

                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/80">
                  {responsibilities.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#22d3ee]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {eligibility.length > 0 && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  Eligibility / Qualifications
                </h2>

                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/80">
                  {eligibility.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#22d3ee]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {howToApply && (
              <div className="relative mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                  How to Apply
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  {howToApply}
                </p>
              </div>
            )}

            <JobValue
              role={job.role}
              company={job.companyName}
              location={job.location}
              experience={job.experience}
              skills={skills}
              description={description}
            />

            <JobEligibility
              role={job.role}
              location={job.location}
              experience={job.experience}
              skills={skills}
            />

            <ApplicationGuidance applyLink={job.applyLink} />
            <SourceVerification applyLink={job.applyLink} />
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="space-y-6 lg:sticky lg:top-24">
            <div
              className="glass card-glow rounded-3xl p-6 animate-fade-up"
              style={{ animationDelay: "80ms" }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
                Job Overview
              </h2>

              <div className="mt-4 space-y-3">
                {overview.map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 text-sm text-white/80"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                      <o.icon className="h-3.5 w-3.5 text-[#22d3ee]" />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-[11px] uppercase tracking-wide text-white/40">
                        {o.label}
                      </span>
                      <span className="truncate">{o.text}</span>
                    </span>
                  </div>
                ))}

                {dates.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-2.5 text-sm text-white/80"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                      <CalendarClock className="h-3.5 w-3.5 text-[#22d3ee]" />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-[11px] uppercase tracking-wide text-white/40">
                        {d.label}
                      </span>
                      <span className="truncate">{d.value}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 hidden flex-col gap-2 lg:flex">
                {expired ? (
                  <span className="flex items-center justify-center rounded-xl px-6 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
                    Applications closed
                  </span>
                ) : (
                  <a
                    href={job.applyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-glow flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm"
                  >
                    Apply Now <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={share}
                    className="btn-ghost-glow flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>

                  <button
                    onClick={copy}
                    className="btn-ghost-glow flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <Copy className="h-4 w-4" /> Copy link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Related Jobs
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((j, i) => (
              <JobCard key={j.id} job={j} index={i} />
            ))}
          </div>
        </section>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050816]/95 p-3 backdrop-blur-lg lg:hidden"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          {expired ? (
            <span className="flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
              Applications closed
            </span>
          ) : (
            <a
              href={job.applyLink}
              target="_blank"
              rel="noreferrer"
              className="btn-glow flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm"
            >
              Apply Now <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            onClick={share}
            className="btn-ghost-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <button
            onClick={copy}
            className="btn-ghost-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            aria-label="Copy link"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
