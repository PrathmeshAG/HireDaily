import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Zap, Shield, Rocket, Building2, TrendingUp, ChevronDown, MessageCircle } from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { JobCard, JobCardSkeleton } from "../components/job-card";
import { Particles } from "../components/aurora-bg";

export const Route = createFileRoute("/")({
  component: Home,
});

function useCounter(target: number, duration = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.floor(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function Stat({ value, label }: { value: number; label: string }) {
  const n = useCounter(value);
  return (
    <div className="glass gradient-border rounded-2xl p-6 text-center">
      <div className="text-4xl font-bold text-gradient">{n.toLocaleString()}+</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}

function Home() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const latest = jobs?.slice(0, 6) ?? [];
  const verifiedCount = jobs?.filter((job) => job.verificationStatus === "verified").length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* HERO */}
      <section className="relative overflow-hidden py-12 md:py-20">
        <Particles count={30} />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/70 backdrop-blur animate-fade-up">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e5ff]" />
            </span>
            <span className="font-semibold text-white">Fresh job opportunities, updated regularly</span>
          </div>
          <h1
            className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white animate-fade-up md:text-7xl"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", animationDelay: "80ms" }}
          >
            Find Your <span className="text-gradient">Dream Job</span>
            <br /> Faster
          </h1>
          <p
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 md:text-lg animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Hire Daily helps job seekers discover current opportunities, review the available role and eligibility information,
            check the listing source and verification details, and continue to the relevant application page.
          </p>
          <div
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              to="/jobs"
              className="btn-glow group flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"
            >
              <Search className="h-4 w-4" />
              Search Jobs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/jobs"
              className="btn-ghost-glow flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"
            >
              <Zap className="h-4 w-4 text-[#00e5ff]" />
              Latest Hiring
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute left-10 top-20 hidden md:block animate-float">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <Building2 className="h-6 w-6 text-[#00e5ff]" />
          </div>
        </div>
        <div className="pointer-events-none absolute right-16 top-40 hidden md:block animate-float" style={{ animationDelay: "1s" }}>
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <Rocket className="h-6 w-6 text-[#7c3aed]" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-10 md:py-14">
        <div className="glass card-glow rounded-3xl p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#22d3ee]">How Hire Daily works</p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: "'Space Grotesk'" }}>
              From a job discovery to a clear application path
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60 md:text-base">
              Many candidates discover Hire Daily through our social posts. The website is the place to review the
              specific opportunity, understand the information available for the role, check its source and verification
              details, and then continue to the application destination.
            </p>
          </div>
          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: MessageCircle, title: "Discover", body: "Find a relevant opportunity through Hire Daily's social content." },
              { icon: Search, title: "Review", body: "Open the specific job page and review the role, requirements, dates and source information." },
              { icon: ArrowRight, title: "Apply", body: "Use the application action on the job page to continue to the listed application destination." },
            ].map((step, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.02] p-5 ring-1 ring-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
                  <step.icon className="h-5 w-5 text-[#00e5ff]" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-3">
        <Stat value={jobs?.length ?? 0} label="Jobs Available" />
        <Stat
          value={jobs ? new Set(jobs.map((job) => job.companyName.trim()).filter(Boolean)).size : 0}
          label="Companies"
        />
        <Stat value={verifiedCount} label="Verified Listings" />
      </section>

      {/* LATEST JOBS */}
      <section className="py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>
              Latest Jobs
            </h2>
            <p className="mt-2 text-sm text-white/60">Current opportunities with available source and job information</p>
          </div>
          <Link to="/jobs" className="hidden text-sm text-[#00e5ff] hover:text-[#22d3ee] md:inline-flex items-center gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : latest.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
              <Search className="h-7 w-7 text-[#00e5ff]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white">No jobs yet</h3>
            <p className="mt-2 text-sm text-white/60">
              New opportunities will appear here as they are added.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}
          </div>
        )}
      </section>

      {/* BENEFITS */}
      <section className="py-16">
        <h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>
          Why <span className="text-gradient">Hire Daily</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { icon: Zap, title: "Fresh Opportunities", body: "New job opportunities are added regularly so candidates can discover current roles in one place." },
            { icon: Shield, title: "Source & Verification Details", body: "Job pages show the available source, verification status and last-checked information when provided." },
            { icon: TrendingUp, title: "Candidate-Focused Job Pages", body: "Review the role, skills, eligibility information and application guidance before leaving for the application destination." },
          ].map((b, i) => (
            <div key={i} className="glass card-glow rounded-2xl p-6 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
                <b.icon className="h-6 w-6 text-[#00e5ff]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>
          Frequently Asked
        </h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {[
            { q: "Is Hire Daily free to use?", a: "Yes — completely free for job seekers. No signup is required to browse or apply." },
            { q: "How do people discover Hire Daily jobs?", a: "Many candidates discover individual opportunities through Hire Daily's social posts and are directed to the corresponding job page." },
            { q: "How often are jobs updated?", a: "Job listings are reviewed and updated as source information changes. Expired opportunities are handled according to their application status." },
            { q: "Who posts the jobs?", a: "Hire Daily curates job opportunities using the available source information for each listing. Source and verification details are shown when available." },
            { q: "Where do I apply for a job?", a: "Use the Apply Now link on the job page. When available, it takes you to the employer's official application page or the listed application source." },
            { q: "How does Hire Daily verify jobs?", a: "Verification is based on the available source and verification information for the listing. A job is not treated as verified simply because an application URL exists." },
            { q: "What does the Last Verified date mean?", a: "It records when the available verification information for a listing was last checked. It does not guarantee that the employer has not changed the vacancy afterward." },
          ].map((f, i) => (
            <details key={i} className="glass group rounded-2xl p-5 open:ring-1 open:ring-[#00e5ff]/30">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-white">
                {f.q}
                <ChevronDown className="h-4 w-4 text-white/60 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
