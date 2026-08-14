import { createFileRoute } from "@tanstack/react-router";
import { Fragment, lazy, Suspense, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { getJobDateState } from "../lib/job-dates";
import { JobCard, JobCardSkeleton } from "../components/job-card";

// Lazy-loaded so the ad never blocks the initial job listings render.
const JobAd = lazy(() => import("../components/job-ad").then((m) => ({ default: m.JobAd })));

export const Route = createFileRoute("/jobs/")({
  ssr: true,
  loader: async () => ({ jobs: await fetchJobs() }),
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Browse Jobs — Hire Daily" },
      { name: "description", content: "Browse the freshest verified jobs from top companies. Search by role, company, location, and skills." },
      { property: "og:title", content: "Browse Jobs — Hire Daily" },
      { property: "og:description", content: "Freshest verified jobs from top companies. Updated daily." },
      { property: "og:url", content: "/jobs" },
    ],
    links: [{ rel: "canonical", href: "/jobs" }],
  }),
});

const SORTS = ["Newest", "Oldest", "Deadline", "A → Z"] as const;
type Sort = typeof SORTS[number];

function JobsPage() {
  const { jobs } = Route.useLoaderData();
  const isLoading = false;
  const [q, setQ] = useState("");
 const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [experience, setExperience] = useState("");
  const [sort, setSort] = useState<Sort>("Newest");
  const [showFilters, setShowFilters] = useState(false);

  const normalize = (value?: string) =>
  value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

const formatText = (value?: string) =>
  value
    ?.trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

const options = useMemo(() => {
  const unique = (values: (string | undefined)[]) =>
    Array.from(
      new Map(
        values
          .filter(Boolean)
          .map((v) => [normalize(v), formatText(v)])
      ).values()
    ).sort();

  return {
    categories: unique(jobs.map((j) => j.category)),
    locations: unique(jobs.map((j) => j.location)),
    types: unique(jobs.map((j) => j.jobType)),
    exps: unique(jobs.map((j) => j.experience)),
  };
}, [jobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = jobs.filter((j) => {
      if (query) {
        const hay = `${j.role} ${j.companyName} ${j.location} ${j.skills}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (category && normalize(j.category) !== normalize(category))
  return false;
     if (
  location &&
  normalize(j.location) !== normalize(location)
)
  return false;
      if (jobType && j.jobType !== jobType) return false;
      if (
  experience &&
  normalize(j.experience) !== normalize(experience)
)
  return false;
      return true;
    });
    if (sort === "Newest") list = list.sort((a, b) => (getJobDateState(b.createdAt, b.updatedAt, b.lastDate).postedAt ?? 0) - (getJobDateState(a.createdAt, a.updatedAt, a.lastDate).postedAt ?? 0));
    else if (sort === "Oldest") list = list.sort((a, b) => (getJobDateState(a.createdAt, a.updatedAt, a.lastDate).postedAt ?? 0) - (getJobDateState(b.createdAt, b.updatedAt, b.lastDate).postedAt ?? 0));
    else if (sort === "A → Z") list = list.sort((a, b) => a.role.localeCompare(b.role));
    else if (sort === "Deadline")
      list = list.sort((a, b) => (a.lastDate ?? "").localeCompare(b.lastDate ?? ""));
    return list;
  }, [jobs, q, category, location, jobType, experience, sort]);

  // A single sponsored slot: after the 10th card, or roughly in the middle
  // for shorter result sets. Never shown for very short lists.
  // const adIndex = useMemo(() => {
  //   if (filtered.length < 4) return -1;
  //   return filtered.length >= 10 ? 9 : Math.floor(filtered.length / 2);
  // }, [filtered.length]);

  const anyFilter =
  q || category || location || jobType || experience;
  const clear = () => {
    setQ(""); setCategory("");; setLocation(""); setJobType(""); setExperience("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="animate-fade-up">
        <h1 className="text-4xl font-bold text-white md:text-5xl" style={{ fontFamily: "'Space Grotesk'" }}>
          Browse <span className="text-gradient">Jobs</span>
        </h1>
        <p className="mt-2 text-white/60">{filtered.length} opportunities available</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
          Find verified fresher and entry-level jobs across India.
        </p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/45">
          Hire Daily reviews job information from company career sources and helps you compare role, location, experience, salary information and application details.
        </p>
      </div>

      {/* Search */}
      <div className="sticky top-20 z-30 mt-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="glass-strong flex items-center gap-2 rounded-2xl p-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search company, role, location, skills…"
              className="w-full rounded-xl bg-transparent py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-ghost-glow flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="glass mt-2 grid grid-cols-2 gap-2 rounded-2xl p-3 md:grid-cols-5 animate-scale-in">
            {[
             {
  v: category,
  set: setCategory,
  opts: options.categories,
  label: "Category",
},
              { v: location, set: setLocation, opts: options.locations, label: "Location" },
              { v: jobType, set: setJobType, opts: options.types, label: "Type" },
              { v: experience, set: setExperience, opts: options.exps, label: "Experience" },
            ].map((f, i) => (
              <select
                key={i}
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
              >
                <option value="">All {f.label}s</option>
                {f.opts.map((o) => <option key={o} value={o} className="bg-[#111827]">{o}</option>)}
              </select>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
            >
              {SORTS.map((s) => <option key={s} value={s} className="bg-[#111827]">{s}</option>)}
            </select>
            {anyFilter && (
              <button onClick={clear} className="btn-ghost-glow col-span-2 flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm md:col-span-5">
                <X className="h-4 w-4" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

            {/* Sponsored Ad
      <div className="mt-6 mb-8">
        <Suspense fallback={null}>
          <JobAd />
        </Suspense>
      </div> */}

      

      {/* Results */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
              <Search className="h-7 w-7 text-[#00e5ff]" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white">No jobs found</h3>
            <p className="mt-2 text-sm text-white/60">Try adjusting your search or filters.</p>
            {anyFilter && (
              <button onClick={clear} className="btn-ghost-glow mt-4 rounded-xl px-4 py-2 text-sm">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((job, i) => (
              <Fragment key={job.id}>
                <JobCard job={job} index={i} />
                
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}