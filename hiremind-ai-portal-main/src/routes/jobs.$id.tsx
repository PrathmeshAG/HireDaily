import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Laptop,
  MapPin,
  Search,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { fetchJob, fetchJobs } from "../lib/jobs";
import { JobCard } from "../components/job-card";

export const Route = createFileRoute("/jobs/$id")({
  ssr: true,
  loader: async ({ params }) => ({
    job: await fetchJob(params.id),
    allJobs: await fetchJobs(),
  }),
  component: LegacyJobDetailPage,
  head: ({ loaderData }) => {
    const job = loaderData?.job;
    const title = job ? `${job.role} at ${job.companyName} — Hire Daily` : "Job Not Found — Hire Daily";

    return {
      meta: [
        { title },
        {
          name: "description",
          content: job
            ? `${job.role} at ${job.companyName}. View job description, location, experience, skills, salary information, deadline and application details on Hire Daily.`
            : "The requested job listing could not be found on Hire Daily.",
        },
        { property: "og:title", content: title },
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

/* ---------- shared style tokens (light + dark) ---------- */
const heading = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" } as const;
const card =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none";
const tile =
  "rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.03]";
const chip =
  "rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70";
const accentIcon = "bg-cyan-50 text-cyan-700 dark:bg-[#00e5ff]/10 dark:text-[#00e5ff]";
const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 motion-reduce:transition-none dark:bg-[#00e5ff] dark:text-slate-950 dark:shadow-cyan-500/20 dark:hover:bg-cyan-300 ${focus}`;
const btnGhost = `inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 motion-reduce:transition-none dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 ${focus}`;

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
    <div className={`flex items-start gap-3 ${tile} ${compact ? "p-3" : "p-4"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentIcon}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 dark:text-white/40">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white/90">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-1 text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]/80">{eyebrow}</p>
      )}
      <h2 className="text-xl font-bold text-slate-900 dark:text-white md:text-2xl" style={heading}>
        {children}
      </h2>
    </div>
  );
}

function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-3 text-sm leading-5 text-slate-600 dark:text-white/65 ${tile}`}>
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-[#00e5ff]" />
      <span>{children}</span>
    </div>
  );
}

/** Copies text even on non-HTTPS pages or browsers without the Clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy method
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function LegacyJobDetailPage() {
  const { job, allJobs } = Route.useLoaderData();
  return <JobDetailPage job={job} allJobs={allJobs} />;
}

export function JobDetailPage({
  job,
  allJobs,
}: {
  job: Awaited<ReturnType<typeof fetchJob>>;
  allJobs: Awaited<ReturnType<typeof fetchJobs>>;
}) {
  const [copied, setCopied] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const flash = (message: string) => {
    setNotice(message);
    timers.current.push(window.setTimeout(() => setNotice(null), 2400));
  };

  if (!job) {
    return (
      <main className="min-h-screen bg-white px-4 py-16 text-slate-900 dark:bg-[#050816] dark:text-white md:py-24">
        <div className={`mx-auto max-w-xl p-8 text-center md:p-10 ${card}`}>
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${accentIcon}`}>
            <Search className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-3xl font-bold" style={heading}>Job listing not found</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-white/55">
            This listing may have been removed, closed, or the link may no longer be valid.
          </p>
          <Link to="/jobs" className={`mt-7 px-5 py-3 text-sm ${btnPrimary}`}>
            <ArrowLeft className="h-4 w-4" />
            Browse all jobs
          </Link>
        </div>
      </main>
    );
  }

  const deadlineTimestamp = job.lastDate ? Date.parse(job.lastDate) : Number.NaN;
  const hasDeadline = Number.isFinite(deadlineTimestamp);
  const isExpired = hasDeadline && deadlineTimestamp < Date.now();
  const daysLeft = hasDeadline && !isExpired ? Math.ceil((deadlineTimestamp - Date.now()) / 86_400_000) : null;
  const deadlineText = job.lastDate || "Not specified";

  const postedTimestamp = typeof job.createdAt === "number" ? job.createdAt : Number(job.createdAt);
  const postedText = Number.isFinite(postedTimestamp)
    ? `Posted ${new Date(postedTimestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
    : "Date not specified";

  const skills = job.skills
    ? job.skills.split(/[,|•\n]+/).map((skill) => skill.trim()).filter(Boolean)
    : [];

  const status = isExpired
    ? { label: "Applications closed", cls: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20" }
    : daysLeft !== null && daysLeft <= 7
      ? { label: daysLeft <= 1 ? "Closing today or tomorrow" : `Closing in ${daysLeft} days`, cls: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20" }
      : { label: "Accepting applications", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20" };

  const handleShare = async () => {
    const url = window.location.href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${job.role} at ${job.companyName} — Hire Daily`,
          text: `Check out this job opportunity on Hire Daily: ${job.role} at ${job.companyName}.`,
          url,
        });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return; // user closed the share sheet
      }
    }

    const ok = await copyText(url);
    flash(ok ? "Link copied to clipboard" : "Could not copy. Please copy the link from the address bar.");
  };

  const handleCopyLink = async () => {
    const ok = await copyText(window.location.href);
    if (ok) {
      setCopied(true);
      timers.current.push(window.setTimeout(() => setCopied(false), 1800));
    }
    flash(ok ? "Link copied to clipboard" : "Could not copy. Please copy the link from the address bar.");
  };

  const normalizeRelatedValue = (value: unknown) =>
    typeof value === "string" ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : "";

  const currentRole = normalizeRelatedValue(job.role);
  const currentRoleTokens = new Set(currentRole.split(/\s+/).filter((token) => token.length >= 3));

  const relatedJobs = (allJobs ?? [])
    .filter((candidate) => candidate.id !== job.id)
    .map((candidate: NonNullable<typeof job>) => {
      const role = normalizeRelatedValue(candidate.role);
      const location = normalizeRelatedValue(candidate.location);
      const candidateSkills = normalizeRelatedValue(candidate.skills);
      let score = 0;

      if (role === currentRole) score += 100;
      else if (currentRole && role.includes(currentRole)) score += 80;
      else if (role && currentRole.includes(role)) score += 70;

      const roleTokens = role.split(/\s+/).filter((token) => token.length >= 3);
      score += roleTokens.filter((token) => currentRoleTokens.has(token)).length * 20;

      if (location && location === normalizeRelatedValue(job.location)) score += 8;
      if (candidateSkills && job.skills && candidateSkills === normalizeRelatedValue(job.skills)) score += 5;

      return { candidate, score };
    })
    .filter(({ score }: { score: number }) => score >= 20)
    .sort(
      (
        a: { candidate: NonNullable<typeof job>; score: number },
        b: { candidate: NonNullable<typeof job>; score: number },
      ) => b.score - a.score || (b.candidate.createdAt ?? 0) - (a.candidate.createdAt ?? 0),
    )
    .slice(0, 3)
    .map(({ candidate }) => candidate);

  const applyProps = {
    href: job.applyLink,
    target: "_blank",
    rel: "noopener noreferrer nofollow",
  } as const;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <div className="pointer-events-none absolute left-1/4 top-10 -z-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-[#00e5ff]/10" />
      <div className="pointer-events-none absolute right-0 top-[28rem] -z-0 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl dark:bg-[#7c3aed]/10" />

      <div className="relative mx-auto max-w-6xl px-3 py-5 pb-32 sm:px-5 sm:py-8 md:pb-20 lg:px-6">
        {/* Utility bar */}
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6 print:hidden">
          <Link
            to="/jobs"
            className={`inline-flex items-center gap-2 rounded-lg py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-white/55 dark:hover:text-[#00e5ff] ${focus}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to jobs
          </Link>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleShare} aria-label="Share job" className={`px-3 py-2 text-sm sm:px-4 ${btnGhost}`}>
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label={copied ? "Job link copied" : "Copy job link"}
              className={`px-3 py-2 text-sm sm:px-4 ${btnGhost} ${copied ? "!border-emerald-300 !text-emerald-700 dark:!border-[#00e5ff]/40 dark:!text-[#00e5ff]" : ""}`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied" : "Copy link"}</span>
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className={`relative overflow-hidden p-4 sm:p-6 md:p-9 ${card}`}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-50/90 via-transparent to-violet-50/90 dark:from-[#00e5ff]/[0.07] dark:to-[#7c3aed]/[0.08]" />

          <div className="relative">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-8">
              <div className="flex min-w-0 items-start gap-4 md:gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 sm:h-20 sm:w-20">
                  {job.companyLogo ? (
                    <img src={job.companyLogo} alt={`${job.companyName} logo`} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-700 dark:text-white/80 sm:text-3xl" style={heading}>
                      {job.companyName?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-white/65">{job.companyName}</span>
                    {job.verificationStatus === "verified" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-200 dark:bg-[#00e5ff]/10 dark:text-[#00e5ff] dark:ring-[#00e5ff]/20">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified listing
                      </span>
                    )}
                  </div>

                  <h1 className="mt-2 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl" style={heading}>
                    {job.role}
                  </h1>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[job.jobType, job.experience, job.category].filter(Boolean).map((v) => (
                      <span key={v} className={chip}>{v}</span>
                    ))}
                    <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${status.cls}`}>{status.label}</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto md:min-w-[230px] print:hidden">
                {isExpired ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-center dark:border-rose-400/20 dark:bg-rose-400/5">
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">Applications closed</p>
                    <p className="mt-1 text-xs text-rose-600/80 dark:text-white/45">The listed deadline has passed.</p>
                  </div>
                ) : (
                  <a {...applyProps} className={`w-full px-6 py-4 text-sm ${btnPrimary}`}>
                    Apply now
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2.5 border-t border-slate-200 pt-6 min-[420px]:grid-cols-2 dark:border-white/[0.08] lg:grid-cols-4 lg:gap-3">
              <InfoItem icon={MapPin} label="Location" value={job.location || "Remote"} compact />
              <InfoItem icon={IndianRupee} label="Salary" value={job.salary || "Not disclosed"} compact />
              <InfoItem icon={Clock3} label="Posted" value={postedText.replace("Posted ", "")} compact />
              <InfoItem icon={CalendarDays} label="Apply by" value={deadlineText} compact />
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-7">
          <div className="min-w-0 space-y-5">
            <article className={`p-5 sm:p-6 md:p-8 ${card}`}>
              <SectionTitle eyebrow="Role overview">About this job</SectionTitle>
              <div className="mt-5 max-w-[75ch] whitespace-pre-line text-[15px] leading-7 text-slate-600 dark:text-white/65">
                {job.description || "The employer has not provided a detailed description for this listing."}
              </div>
            </article>

            {skills.length > 0 && (
              <article className={`p-5 sm:p-6 md:p-8 ${card}`}>
                <SectionTitle eyebrow="What you may need">Skills and requirements</SectionTitle>

                <div className="mt-5 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  <CheckRow>{job.experience ? `Experience: ${job.experience}` : "Check the listing for experience requirements"}</CheckRow>
                  <CheckRow>{job.jobType ? `Work type: ${job.jobType}` : "Check the listing for the work arrangement"}</CheckRow>
                  <CheckRow>{job.location ? `Location: ${job.location}` : "Location information is not specified"}</CheckRow>
                  <CheckRow>{job.salary ? `Compensation: ${job.salary}` : "Salary information is not disclosed"}</CheckRow>
                </div>
              </article>
            )}

            <article className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-violet-50 p-5 dark:border-[#00e5ff]/15 dark:from-[#00e5ff]/[0.05] dark:to-[#7c3aed]/[0.05] sm:p-6 md:p-8">
              <SectionTitle eyebrow="Application">Before you apply</SectionTitle>
              <p className="mt-3 max-w-[65ch] text-sm leading-6 text-slate-600 dark:text-white/55">
                Review the listing carefully and make sure the role, location, eligibility and deadline match your requirements before continuing to the employer or original application source.
              </p>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  "Review the complete job description",
                  "Confirm experience and eligibility",
                  "Check the work location or remote arrangement",
                  "Check the application deadline",
                  "Keep your resume and required documents ready",
                  "Apply through the provided application option",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white/60 bg-white/70 px-3.5 py-3 text-sm text-slate-700 dark:border-white/[0.06] dark:bg-black/10 dark:text-white/65">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-[#00e5ff]" />
                    {item}
                  </div>
                ))}
              </div>

              {!isExpired && (
                <a {...applyProps} className={`mt-6 w-full px-5 py-3.5 text-sm sm:w-auto sm:max-w-xs print:hidden ${btnPrimary}`}>
                  Continue to application
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </article>

            <section className={`relative overflow-hidden p-5 sm:p-6 md:p-8 ${card}`}>
              <div className="relative">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <SectionTitle eyebrow="Trust and transparency">Source and verification</SectionTitle>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/45">
                      This section explains where the application destination comes from and what Hire Daily can verify about this listing.
                    </p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55">
                    <ShieldCheck className="h-3.5 w-3.5 text-cyan-700 dark:text-[#00e5ff]" />
                    Listing transparency
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Search, label: "Source", node: <p className="mt-0.5 truncate text-sm font-semibold">{job.sourceName || "Not specified"}</p> },
                    {
                      icon: ExternalLink,
                      label: "Application destination",
                      node: job.applyLink ? (
                        <a {...applyProps} className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff]">
                          <span className="truncate">Official employer application page</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm font-semibold text-slate-500 dark:text-white/50">Application link not available</p>
                      ),
                    },
                    { icon: BadgeCheck, label: "Verification", node: <p className="mt-0.5 text-sm font-semibold">{job.verificationStatus === "verified" ? "Verified listing" : "Not independently verified"}</p> },
                    { icon: BriefcaseBusiness, label: "Application", node: <p className="mt-0.5 text-sm font-semibold">Employer / original listing</p> },
                  ].map(({ icon: Icon, label, node }) => (
                    <div key={label} className={`flex items-center gap-3 p-4 ${tile}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentIcon}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 text-slate-900 dark:text-white/85">
                        <p className="text-[11px] font-medium text-slate-500 dark:text-white/40">{label}</p>
                        {node}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-white/[0.06] dark:bg-black/10 dark:text-white/45">
                  Hire Daily displays information available for this listing. Always review the destination page, eligibility criteria and application requirements before submitting personal information. Hiring decisions and job availability are controlled by the employer or original listing source.
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className={`p-5 sm:p-6 ${card}`}>
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4 text-cyan-700 dark:text-[#00e5ff]" />
                <h2 className="text-lg font-bold" style={heading}>Application details</h2>
              </div>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                <InfoItem icon={CalendarDays} label="Apply by" value={deadlineText} compact />
                <InfoItem icon={BriefcaseBusiness} label="Job type" value={job.jobType || "Not specified"} compact />
                <InfoItem icon={GraduationCap} label="Experience" value={job.experience || "Not specified"} compact />
                <InfoItem
                  icon={Laptop}
                  label="Work arrangement"
                  value={job.location?.toLowerCase().includes("remote") ? "Remote" : job.location || "See listing"}
                  compact
                />
              </div>

              {!isExpired ? (
                <a {...applyProps} className={`mt-5 w-full px-4 py-3.5 text-sm print:hidden ${btnPrimary}`}>
                  Apply for this job
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-medium text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/5 dark:text-rose-200">
                  Applications closed
                </div>
              )}
            </div>

            <div className={`p-5 sm:p-6 print:hidden ${card}`}>
              <h2 className="text-sm font-semibold">Looking for more opportunities?</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/45">
                Browse more fresher, internship, remote and location-based jobs on Hire Daily.
              </p>
              <Link to="/jobs" className={`mt-4 w-full px-4 py-3 text-xs ${btnGhost}`}>
                Explore more jobs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>

        {/* Related jobs */}
        {relatedJobs.length > 0 && (
          <section className="mt-10 sm:mt-12 md:mt-16 print:hidden">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-cyan-700 dark:text-[#00e5ff]/80">More opportunities</p>
                <h2 className="mt-1 text-2xl font-bold sm:text-3xl" style={heading}>Related jobs</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/45">Similar roles you may want to explore.</p>
              </div>
              <Link to="/jobs" className={`hidden items-center gap-1.5 rounded-lg text-sm font-semibold text-cyan-700 hover:underline dark:text-[#00e5ff] sm:inline-flex ${focus}`}>
                View all jobs <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {relatedJobs.map((relatedJob, index) => (
                <JobCard key={relatedJob.id} job={relatedJob} index={index} />
              ))}
            </div>

            <Link to="/jobs" className={`mt-4 w-full px-4 py-3 text-xs sm:hidden ${btnGhost}`}>
              View all jobs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
      </div>

      {/* Feedback toast */}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8 print:hidden">
        {notice && (
          <div className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">
            {notice}
          </div>
        )}
      </div>

      {/* Mobile sticky apply bar */}
      {!isExpired && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pt-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#090d16]/95 md:hidden print:hidden"
          style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-sm font-semibold">{job.role}</p>
              <p className="truncate text-xs text-slate-500 dark:text-white/45">{job.companyName}</p>
            </div>
            <button type="button" onClick={handleShare} aria-label="Share job" className={`h-11 w-11 shrink-0 ${btnGhost}`}>
              <Share2 className="h-4 w-4" />
            </button>
            <a {...applyProps} className={`h-11 shrink-0 px-5 text-sm ${btnPrimary}`}>
              Apply now
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </main>
  );
}