import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

const heading = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" } as const;
const card =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none";
const tile =
  "rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.03]";
const accent = "bg-cyan-50 text-cyan-700 dark:bg-[#00e5ff]/10 dark:text-[#00e5ff]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500";

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold text-cyan-700 dark:text-[#00e5ff]/80">{eyebrow}</p>
      <h2 className="mt-1 text-balance text-3xl font-bold tracking-tight sm:text-4xl" style={heading}>{title}</h2>
      {children && <p className="mt-3 text-base leading-7 text-slate-600 dark:text-white/55">{children}</p>}
    </div>
  );
}

const highlights = [
  { icon: BadgeCheck, title: "Source transparency", text: "Listings reviewed for source and application information." },
  { icon: Users, title: "Freshers and internships", text: "Fresher hiring and internship opportunities in one place." },
  { icon: Search, title: "Smart search and filters", text: "Find relevant roles faster with search and filters." },
  { icon: Gift, title: "Completely free", text: "No charges to browse jobs or use the platform." },
  { icon: Smartphone, title: "Mobile friendly", text: "A smooth experience on phones, tablets and desktops." },
];

const steps = [
  {
    title: "Source the opportunity",
    text: "We identify opportunities from official company career pages and trusted public recruitment sources. Official employer sources are preferred whenever they are available.",
  },
  {
    title: "Review the job information",
    text: "We review the available company, role, location, application source, deadline, and other job details before publishing or updating a listing.",
  },
  {
    title: "Record verification information",
    text: "When verification evidence is available, the job can include its verification status and a last-verified timestamp. The timestamp indicates when the available job information was last checked; it does not guarantee that an employer has not changed the posting afterward.",
  },
  {
    title: "Review expiry and application status",
    text: "Listings are reviewed for their application deadline and current status. Expired opportunities are removed from active job listings, while an existing job page may remain accessible when useful so applicants can see that its application period has closed.",
  },
];

const aiTools = [
  "Resume Analysis",
  "ATS Resume Builder",
  "AI Interview Preparation",
  "Smart Job Recommendations",
  "Career Insights",
  "Personalized Learning",
];

export default function About() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl dark:bg-[#00e5ff]/10" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl dark:bg-[#7c3aed]/10" />

      {/* Hero */}
      <section className="relative px-4 pb-14 pt-24 sm:px-6 sm:pt-32 sm:pb-20">
        <div className="mx-auto max-w-6xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-xs font-semibold text-cyan-800 dark:border-[#00e5ff]/20 dark:bg-[#00e5ff]/5 dark:text-[#00e5ff]">
            <Sparkles className="h-3.5 w-3.5" /> About us
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={heading}>
            About{" "}
            <span className="bg-gradient-to-r from-cyan-600 to-violet-600 bg-clip-text text-transparent dark:from-[#00e5ff] dark:to-violet-400">
              Hire Daily
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-8 text-slate-600 dark:text-white/55 sm:text-lg">
            Hire Daily is a modern job discovery platform helping students, freshers, and professionals find job
            opportunities from official company career pages and trusted public recruitment sources.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/jobs"
              className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 motion-reduce:transition-none dark:bg-[#00e5ff] dark:text-slate-950 dark:shadow-cyan-500/20 dark:hover:bg-cyan-300 ${focus}`}
            >
              Browse jobs <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#verification"
              className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 motion-reduce:transition-none dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 ${focus}`}
            >
              How we verify jobs
            </a>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className={`p-4 ${tile}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon className="h-4 w-4" /></span>
              <h3 className="mt-3 text-sm font-bold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-white/45">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Mission and why */}
      <section className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          <div className={`p-7 sm:p-9 ${card}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}><Rocket className="h-6 w-6" /></span>
            <h2 className="mt-5 text-2xl font-bold" style={heading}>Our mission</h2>
            <p className="mt-3 text-[15px] leading-8 text-slate-600 dark:text-white/55">
              We aim to simplify the job search process by providing useful job opportunities, internships,
              off-campus drives, interview resources, and career guidance in one place.
            </p>
          </div>

          <div className={`p-7 sm:p-9 ${card}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}><Users className="h-6 w-6" /></span>
            <h2 className="mt-5 text-2xl font-bold" style={heading}>Why Hire Daily?</h2>
            <ul className="mt-4 space-y-3">
              {[
                "Job opportunities reviewed for source and application information",
                "Internship opportunities",
                "Fresher hiring",
                "Smart search and filters",
                "Completely free platform",
                "Mobile friendly experience",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-6 text-slate-600 dark:text-white/60">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-[#00e5ff]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section id="verification" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-6 sm:pb-20">
        <div className={`p-6 sm:p-9 md:p-12 ${card}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
              <ClipboardCheck className="h-7 w-7" />
            </span>
            <SectionHead eyebrow="Trust and transparency" title="How we verify jobs">
              We focus on source transparency and accurate application information rather than simply adding more listings.
            </SectionHead>
          </div>

          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className={`relative p-6 ${tile}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-[#00e5ff] dark:text-slate-950">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-600 dark:text-white/55">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-violet-50 p-6 dark:border-[#00e5ff]/15 dark:from-[#00e5ff]/[0.05] dark:to-[#7c3aed]/[0.05]">
            <p className="text-[15px] leading-7 text-slate-600 dark:text-white/60">
              <span className="font-semibold text-slate-900 dark:text-white">About salary:</span> If a job shows a salary as{" "}
              <span className="font-semibold text-slate-900 dark:text-white">Expected</span>, it means the available job information
              does not provide a confirmed employer salary figure. It should not be interpreted as a guaranteed salary or an
              estimate created by Hire Daily.
            </p>
          </div>
        </div>
      </section>

      {/* Applying */}
      <section className="relative mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
        <SectionHead eyebrow="Application guidance" title="Applying through Hire Daily" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["We are not a recruiter", "Hire Daily is a job discovery platform, not a recruitment agency. We do not make hiring decisions, conduct employer interviews, or act as the employer for the opportunities shown on the platform."],
            ["Apply on the official source", "When an application link is provided, applicants should review the job details and apply through the employer's official application page or the source identified on the listing."],
            ["Verify before you submit", "Employers control their own vacancies, eligibility requirements, application deadlines, hiring decisions, and application processes. Job information can change after a listing has been published, so applicants should verify the current information before submitting an application."],
          ].map(([t, text]) => (
            <article key={t} className={`p-6 ${card}`}>
              <h3 className="text-lg font-bold" style={heading}>{t}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600 dark:text-white/55">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="relative mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20">
        <div className={`p-6 sm:p-9 md:p-12 ${card}`}>
          <div className="flex items-center gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent}`}><ShieldCheck className="h-6 w-6" /></span>
            <h2 className="text-3xl font-bold" style={heading}>Disclaimer</h2>
          </div>

          <div className="mt-6 max-w-4xl space-y-5 text-[15px] leading-8 text-slate-600 dark:text-white/55">
            <p>
              Hire Daily shares publicly available job opportunities for informational purposes only. We are{" "}
              <strong className="text-slate-900 dark:text-white">not a recruitment agency</strong>,{" "}
              <strong className="text-slate-900 dark:text-white">not an employer</strong>, and{" "}
              <strong className="text-slate-900 dark:text-white">not affiliated</strong> with the companies listed unless explicitly stated.
            </p>
            <p>
              Job details, eligibility criteria, salaries, deadlines, locations, and hiring processes are managed solely by
              the respective employers and may change without prior notice.
            </p>
            <p>Applicants should always verify every job posting through the company's official careers website before applying.</p>
            <p>
              Hire Daily and HireMind AI are not responsible for expired links, hiring decisions, application outcomes,
              inaccurate information supplied by third parties, technical issues, or any direct or indirect loss resulting
              from the use of this platform.
            </p>
            <p>
              By using this website, you acknowledge that all employment decisions are solely between you and the
              respective employer.
            </p>
          </div>
        </div>
      </section>

      {/* HireMind AI */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-8 text-center dark:border-[#00e5ff]/15 dark:from-[#00e5ff]/10 dark:via-transparent dark:to-[#7c3aed]/10 sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-[#00e5ff] dark:text-slate-950">
            <Briefcase className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl" style={heading}>HireMind AI</h2>
          <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
            Coming soon
          </p>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 dark:text-white/55">
            We're building AI-powered career tools to help you land your dream job faster.
          </p>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {aiTools.map((t) => (
              <li key={t} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}