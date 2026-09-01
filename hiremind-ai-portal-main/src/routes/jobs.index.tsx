import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, X, SlidersHorizontal, ArrowRight, MapPin, BriefcaseBusiness, GraduationCap, Laptop, Clock3 } from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { getJobDateState } from "../lib/job-dates";
import { JobCard, JobCardSkeleton } from "../components/job-card";

export const Route = createFileRoute("/jobs/")({
  ssr: true,
  loader: async () => ({ jobs: await fetchJobs() }),
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Browse Jobs — Hire Daily" },
      {
        name: "description",
        content:
          "Browse fresh job opportunities by role, location, experience and job type. Search Hire Daily listings and review source, verification and application details.",
      },
      { property: "og:title", content: "Browse Jobs — Hire Daily" },
      {
        property: "og:description",
        content:
          "Search fresh job opportunities by role, location, experience and job type.",
      },
    ],
  }),
});

const SORTS = ["Newest", "Oldest", "Deadline", "A → Z"] as const;
type Sort = typeof SORTS[number];

type BrowsePreset = {
  label: string;
  description: string;
  icon: typeof Search;
  test: (job: any) => boolean;
};

function normalize(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function containsAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function isFresher(job: any) {
  const text = `${job.experience ?? ""} ${job.category ?? ""} ${job.role ?? ""} ${job.description ?? ""}`.toLowerCase();
  return containsAny(text, ["fresher", "freshers", "entry level", "entry-level", "0 year", "0-1", "0 – 1", "0–1", "graduate", "campus"]);
}

function isRemote(job: any) {
  const text = `${job.location ?? ""} ${job.jobType ?? ""} ${job.description ?? ""}`.toLowerCase();
  return containsAny(text, ["remote", "work from home", "wfh", "work-from-home"]);
}

function isInternship(job: any) {
  const text = `${job.jobType ?? ""} ${job.category ?? ""} ${job.role ?? ""}`.toLowerCase();
  return containsAny(text, ["intern", "internship", "trainee"]);
}

const PRESETS: BrowsePreset[] = [
  {
    label: "Latest Jobs",
    description: "Recently posted opportunities",
    icon: Clock3,
    test: () => true,
  },
  {
    label: "Fresher Jobs",
    description: "Entry-level and graduate roles",
    icon: GraduationCap,
    test: isFresher,
  },
  {
    label: "Work From Home",
    description: "Listings mentioning WFH or remote work",
    icon: Laptop,
    test: isRemote,
  },
  {
    label: "Internship",
    description: "Intern and trainee opportunities",
    icon: GraduationCap,
    test: isInternship,
  },
  {
    label: "Remote",
    description: "Remote-friendly listings",
    icon: Laptop,
    test: isRemote,
  },
  {
    label: "Pune Jobs",
    description: "Opportunities in Pune",
    icon: MapPin,
    test: (job) => normalize(job.location).includes("pune"),
  },
  {
    label: "Mumbai Jobs",
    description: "Opportunities in Mumbai",
    icon: MapPin,
    test: (job) => normalize(job.location).includes("mumbai"),
  },
  {
    label: "Bangalore Jobs",
    description: "Opportunities in Bangalore",
    icon: MapPin,
    test: (job) => containsAny(normalize(job.location), ["bangalore", "bengaluru"]),
  },
  {
    label: "Data Analyst",
    description: "Data and analytics roles",
    icon: BriefcaseBusiness,
    test: (job) =>
      containsAny(
        `${job.role ?? ""} ${job.category ?? ""} ${job.skills ?? ""}`.toLowerCase(),
        ["data analyst", "data analytics", "business analyst", "power bi", "sql"],
      ),
  },
  {
    label: "Software Engineer",
    description: "Software development roles",
    icon: BriefcaseBusiness,
    test: (job) =>
      containsAny(
        `${job.role ?? ""} ${job.category ?? ""} ${job.skills ?? ""}`.toLowerCase(),
        ["software engineer", "software developer", "developer", "frontend", "backend", "full stack", "full-stack"],
      ),
  },
  {
    label: "Marketing",
    description: "Marketing and growth roles",
    icon: BriefcaseBusiness,
    test: (job) =>
      containsAny(
        `${job.role ?? ""} ${job.category ?? ""} ${job.skills ?? ""}`.toLowerCase(),
        ["marketing", "growth", "seo", "social media", "content marketing"],
      ),
  },
];

function JobsPage() {
  const { jobs } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [experience, setExperience] = useState("");
  const [sort, setSort] = useState<Sort>("Newest");
  const [showFilters, setShowFilters] = useState(false);
  const [activeBrowse, setActiveBrowse] = useState("Latest Jobs");
  useEffect(() => {
    const browse = new URLSearchParams(window.location.search).get("browse")?.trim();
    const preset = browse && PRESETS.find((item) => normalizeOption(item.label) === normalizeOption(browse));
    if (preset) {
      setActiveBrowse(preset.label);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const normalizeOption = (value?: string) =>
    value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

  const formatText = (value?: string) =>
    value?.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  const options = useMemo(() => {
    const unique = (values: (string | undefined)[]) =>
      Array.from(
        new Map(
          values
            .filter(Boolean)
            .map((v) => [normalizeOption(v), formatText(v)]),
        ).values(),
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
        const hay = `${j.role} ${j.companyName} ${j.location} ${j.skills} ${j.category} ${j.description}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      if (category && normalizeOption(j.category) !== normalizeOption(category)) return false;
      if (location && normalizeOption(j.location) !== normalizeOption(location)) return false;
      if (jobType && normalizeOption(j.jobType) !== normalizeOption(jobType)) return false;
      if (experience && normalizeOption(j.experience) !== normalizeOption(experience)) return false;

      return true;
    });

    if (activeBrowse !== "Latest Jobs") {
      const preset = PRESETS.find((p) => p.label === activeBrowse);
      if (preset) list = list.filter(preset.test);
    }

    if (sort === "Newest") {
      list = [...list].sort(
        (a, b) =>
          (getJobDateState(b.createdAt, b.updatedAt, b.lastDate).postedAt ?? 0) -
          (getJobDateState(a.createdAt, a.updatedAt, a.lastDate).postedAt ?? 0),
      );
    } else if (sort === "Oldest") {
      list = [...list].sort(
        (a, b) =>
          (getJobDateState(a.createdAt, a.updatedAt, a.lastDate).postedAt ?? 0) -
          (getJobDateState(b.createdAt, b.updatedAt, b.lastDate).postedAt ?? 0),
      );
    } else if (sort === "A → Z") {
      list = [...list].sort((a, b) => a.role.localeCompare(b.role));
    } else {
      list = [...list].sort((a, b) => (a.lastDate ?? "").localeCompare(b.lastDate ?? ""));
    }

    return list;
  }, [jobs, q, category, location, jobType, experience, sort, activeBrowse]);

  const anyFilter = Boolean(q || category || location || jobType || experience || activeBrowse !== "Latest Jobs");

  const clear = () => {
    setQ("");
    setCategory("");
    setLocation("");
    setJobType("");
    setExperience("");
    setActiveBrowse("Latest Jobs");
  };

  const activatePreset = (label: string) => {
    setActiveBrowse(label);
    setQ("");
    setCategory("");
    setLocation("");
    setJobType("");
    setExperience("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="animate-fade-up">
        <h1 className="text-4xl font-bold text-white md:text-5xl" style={{ fontFamily: "'Space Grotesk'" }}>
          Browse <span className="text-gradient">Jobs</span>
        </h1>
        <p className="mt-2 text-white/60">{filtered.length} opportunities available</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/65">
          Search Hire Daily's current job listings by role, location, experience and job type.
          Each listing is organized so candidates can review available job information before applying.
        </p>
      </header>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
            Browse Jobs
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Start with a category or location, then refine the results with search and filters.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((preset) => {
            const active = activeBrowse === preset.label;
            const count =
              preset.label === "Latest Jobs"
                ? jobs.length
                : jobs.filter(preset.test).length;

            return (
              <button
                key={preset.label}
                onClick={() => activatePreset(preset.label)}
                className={`glass card-glow rounded-2xl p-4 text-left transition ${
                  active ? "ring-1 ring-[#00e5ff]/60" : "ring-1 ring-white/5 hover:ring-white/15"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <preset.icon className="h-4 w-4 text-[#00e5ff]" />
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/50">
                    {count}
                  </span>
                </div>
                <div className="mt-4 text-sm font-semibold text-white">{preset.label}</div>
                <div className="mt-1 text-xs leading-relaxed text-white/45">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="sticky top-20 z-30 mt-8 animate-fade-up">
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
              { v: category, set: setCategory, opts: options.categories, label: "Category" },
              { v: location, set: setLocation, opts: options.locations, label: "Location" },
              { v: jobType, set: setJobType, opts: options.types, label: "Type" },
              { v: experience, set: setExperience, opts: options.exps, label: "Experience" },
            ].map((f, i) => (
              <select
                key={i}
                value={f.v}
                onChange={(e) => {
                  f.set(e.target.value);
                  setActiveBrowse("Latest Jobs");
                }}
                className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
              >
                <option value="">All {f.label}s</option>
                {f.opts.map((o) => (
                  <option key={o} value={o} className="bg-[#111827]">{o}</option>
                ))}
              </select>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
            >
              {SORTS.map((s) => (
                <option key={s} value={s} className="bg-[#111827]">{s}</option>
              ))}
            </select>
            {anyFilter && (
              <button onClick={clear} className="btn-ghost-glow col-span-2 flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm md:col-span-5">
                <X className="h-4 w-4" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
            {activeBrowse}
          </h2>
          <p className="mt-1 text-xs text-white/45">
            {filtered.length} matching {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
        </div>
        {activeBrowse !== "Latest Jobs" && (
          <button onClick={clear} className="inline-flex items-center gap-1 text-xs text-[#00e5ff] hover:text-white">
            View all jobs <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <Search className="mx-auto h-7 w-7 text-[#00e5ff]" />
            <h3 className="mt-6 text-lg font-semibold text-white">No jobs found</h3>
            <p className="mt-2 text-sm text-white/60">
              This browse category does not currently have matching active listings.
            </p>
            <button onClick={clear} className="btn-ghost-glow mt-4 rounded-xl px-4 py-2 text-sm">
              View all jobs
            </button>
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
