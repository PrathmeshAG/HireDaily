import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Search, Zap, Shield, Rocket, Users, Building2, TrendingUp, ChevronDown } from "lucide-react";
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
            Powered by <span className="font-semibold text-white">HireMind AI</span>
          </div>

          <h1
            className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white animate-fade-up md:text-7xl"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", animationDelay: "80ms" }}
          >
            Find Your <span className="text-gradient">Dream Job</span>
            <br /> Faster
          </h1>
          <p
            className="mx-auto mt-6 max-w-2xl text-base text-white/60 md:text-lg animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Fresh, verified opportunities from top companies — curated and updated every single day.
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

        {/* Floating orbs */}
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

      {/* STATS */}
      <section className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-3">
        <Stat value={jobs?.length ?? 1240} label="Jobs Posted" />
        <Stat value={320} label="Companies" />
        <Stat value={1000} label="Daily Visitors" />
      </section>

      {/* LATEST JOBS */}
      <section className="py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>
              Latest Jobs
            </h2>
            <p className="mt-2 text-sm text-white/60">Freshly posted opportunities</p>
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
              New verified openings will appear here as they get posted.
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
            { icon: Zap, title: "Fresh Every Day", body: "New verified openings added daily. Never see a stale post." },
            { icon: Shield, title: "Verified Only", body: "Every company and role is manually reviewed before it goes live." },
            { icon: TrendingUp, title: "AI Matched", body: "HireMind AI surfaces the roles that fit your background best." },
          ].map((b, i) => (
            <div key={i} className="glass card-glow rounded-2xl p-6 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
                <b.icon className="h-6 w-6 text-[#00e5ff]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{b.title}</h3>
              <p className="mt-2 text-sm text-white/60">{b.body}</p>
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
            { q: "Is Hire Daily free to use?", a: "Yes — completely free for job seekers. No signup required to browse or apply." },
            { q: "How often are jobs updated?", a: "Every single day. New verified openings are added and stale listings removed." },
            { q: "Who posts the jobs?", a: "Our team curates and verifies each opening from top companies before it goes live." },
          ].map((f, i) => (
            <details key={i} className="glass group rounded-2xl p-5 open:ring-1 open:ring-[#00e5ff]/30">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-white">
                {f.q}
                <ChevronDown className="h-4 w-4 text-white/60 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-white/60">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
