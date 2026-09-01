import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Zap, Shield, Rocket, Building2, CheckCircle2, ChevronDown, Instagram, MessageCircle, ExternalLink, MapPin, GraduationCap, Laptop, BriefcaseBusiness, Clock3 } from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { JobCard, JobCardSkeleton } from "../components/job-card";
import { Particles } from "../components/aurora-bg";

export const Route = createFileRoute("/")({ component: Home });

function useCounter(target: number, duration = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.floor(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function Stat({ value, label }: { value: number; label: string }) {
  const n = useCounter(value);
  return <div className="glass gradient-border rounded-2xl p-6 text-center"><div className="text-4xl font-bold text-gradient">{n.toLocaleString()}+</div><div className="mt-1 text-xs uppercase tracking-widest text-white/60">{label}</div></div>;
}

function Home() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const latest = jobs?.slice(0, 6) ?? [];
  const companyCount = jobs ? new Set(jobs.map((job) => job.companyName.trim()).filter(Boolean)).size : 0;
  const verifiedCount = jobs ? jobs.filter((job) => job.verificationStatus === "verified").length : 0;

  return (
    <div className="mx-auto max-w-7xl px-4">
      <section className="relative overflow-hidden py-12 md:py-20">
        <Particles count={30} />
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/70 backdrop-blur">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e5ff]" /></span>
            Fresh opportunities • source & verification details
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white md:text-7xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
            Find Your <span className="text-gradient">Dream Job</span><br /> Faster
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/60 md:text-lg">
            Discover job opportunities with structured role details, eligibility information, source and verification details, and direct application links.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/jobs" className="btn-glow group flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"><Search className="h-4 w-4" /> Search Jobs <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            <Link to="/jobs" className="btn-ghost-glow flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"><Zap className="h-4 w-4 text-[#00e5ff]" /> Latest Hiring</Link>
          </div>
        </div>
        <div className="pointer-events-none absolute left-10 top-20 hidden md:block animate-float"><div className="glass flex h-14 w-14 items-center justify-center rounded-2xl"><Building2 className="h-6 w-6 text-[#00e5ff]" /></div></div>
        <div className="pointer-events-none absolute right-16 top-40 hidden md:block animate-float"><div className="glass flex h-14 w-14 items-center justify-center rounded-2xl"><Rocket className="h-6 w-6 text-[#7c3aed]" /></div></div>
      </section>

      <section className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-3">
        <Stat value={jobs?.length ?? 0} label="Jobs Available" /><Stat value={companyCount} label="Companies" /><Stat value={verifiedCount} label="Verified Listings" />
      </section>

      <section className="py-14">
        <div className="mb-6 flex items-end justify-between">
          <div><h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>Browse Jobs</h2><p className="mt-2 text-sm text-white/60">Explore opportunities by the way you search.</p></div>
          <Link to="/jobs" className="hidden items-center gap-1 text-sm text-[#00e5ff] md:inline-flex">View all jobs <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Latest Jobs", "Recently posted opportunities", ClockIcon],
            ["Fresher Jobs", "Entry-level and graduate roles", GraduationCap],
            ["Work From Home", "Remote and WFH opportunities", Laptop],
            ["Internship", "Intern and trainee opportunities", GraduationCap],
            ["Remote", "Remote-friendly listings", Laptop],
            ["Pune Jobs", "Opportunities in Pune", MapPin],
            ["Mumbai Jobs", "Opportunities in Mumbai", MapPin],
            ["Bangalore Jobs", "Opportunities in Bangalore", MapPin],
            ["Data Analyst", "Data and analytics roles", BriefcaseBusiness],
            ["Software Engineer", "Software development roles", BriefcaseBusiness],
            ["Marketing", "Marketing and growth roles", BriefcaseBusiness],
          ].map(([label, body, Icon]) => (
            <a key={label as string} href={`/jobs?browse=${encodeURIComponent(label as string)}`} className="glass card-glow rounded-2xl p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5"><Icon className="h-4 w-4 text-[#00e5ff]" /></div>
              <div className="mt-4 text-sm font-semibold text-white">{label as string}</div>
              <div className="mt-1 text-xs leading-relaxed text-white/45">{body as string}</div>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-white/35">Categories are based on the information available in current Hire Daily listings. Select any option to refine the live jobs directory.</p>
      </section>

      <section className="py-16">
        <div className="mb-8 flex items-end justify-between"><div><h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>Latest Jobs</h2><p className="mt-2 text-sm text-white/60">Freshly posted opportunities</p></div><Link to="/jobs" className="hidden items-center gap-1 text-sm text-[#00e5ff] md:inline-flex">View all <ArrowRight className="h-4 w-4" /></Link></div>
        {isLoading ? <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}</div> : latest.length === 0 ? <div className="glass rounded-3xl p-16 text-center"><Search className="mx-auto h-7 w-7 text-[#00e5ff]" /><h3 className="mt-6 text-lg font-semibold text-white">No jobs yet</h3><p className="mt-2 text-sm text-white/60">New opportunities will appear here as they become available.</p></div> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">{latest.map((job, i) => <JobCard key={job.id} job={job} index={i} />)}</div>}
      </section>

      <section className="py-16"><div className="mx-auto max-w-4xl"><h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>How Hire Daily Works</h2><p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-white/60">Hire Daily connects candidates from our social discovery flow to the specific opportunity they want to review.</p><div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">{[
        [Instagram, "Discover", "Find a relevant hiring opportunity through Hire Daily's Instagram posts and reels."],
        [MessageCircle, "Get the opportunity", "When you interact with a relevant post, our automated workflow routes you to the matching Hire Daily job page."],
        [ExternalLink, "Review & apply", "Review the available role, eligibility and verification information, then continue to the listed application destination."],
      ].map(([Icon, title, body], i) => <div key={i} className="glass card-glow rounded-2xl p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5"><Icon className="h-6 w-6 text-[#00e5ff]" /></div><div className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/40">Step {i + 1}</div><h3 className="mt-2 text-lg font-semibold text-white">{title as string}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{body as string}</p></div>)}</div></div></section>

      <section className="py-16"><h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>Why <span className="text-gradient">Hire Daily</span></h2><div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">{[
        [Zap, "Fresh Opportunities", "New opportunities are added as they become available, with listing status handled over time."],
        [Shield, "Source & Verification Details", "Job pages show available source, verification and application information so candidates can evaluate the listing."],
        [CheckCircle2, "Candidate-Focused Pages", "Each listing is organized around the information candidates need to understand the role and decide whether to apply."],
      ].map(([Icon, title, body], i) => <div key={i} className="glass card-glow rounded-2xl p-6"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5"><Icon className="h-6 w-6 text-[#00e5ff]" /></div><h3 className="mt-4 text-lg font-semibold text-white">{title as string}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{body as string}</p></div>)}</div></section>

      <section className="py-16"><div className="mx-auto max-w-4xl"><h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>Candidate Journey</h2><div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">{[
        ["01", "Discover on Instagram", "Find a role that matches what you are looking for."],
        ["02", "Review the listing", "Check the role, requirements, source and verification information available on the job page."],
        ["03", "Apply directly", "Continue to the listed employer or application destination when you are ready."],
      ].map(([n,t,b]) => <div key={n} className="glass rounded-2xl p-6"><div className="text-sm font-bold text-[#00e5ff]">{n}</div><h3 className="mt-3 text-lg font-semibold text-white">{t}</h3><p className="mt-2 text-sm leading-relaxed text-white/60">{b}</p></div>)}</div></div></section>

      <section className="py-16"><h2 className="text-center text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>Frequently Asked</h2><div className="mx-auto mt-10 max-w-2xl space-y-3">{[
        ["Is Hire Daily free to use?", "Yes — completely free for job seekers. No signup is required to browse or continue to an application."],
        ["How often are jobs updated?", "Job listings are reviewed and updated as source information changes. Expired opportunities are handled according to their application status."],
        ["Where do I apply for a job?", "Use the Apply Now link on the job page. When available, it takes you to the employer's official application page or the listed application source."],
        ["How does Hire Daily verify jobs?", "Verification is based on the available source and verification information for the listing. A job is not treated as verified simply because an application URL exists."],
      ].map(([q,a]) => <details key={q} className="glass group rounded-2xl p-5 open:ring-1 open:ring-[#00e5ff]/30"><summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-white">{q}<ChevronDown className="h-4 w-4 text-white/60 transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p></details>)}</div></section>
    </div>
  );
}

function ClockIcon(props: any) {
  return <Clock3 {...props} />;
}
