import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowRight,
  MapPin,
  BriefcaseBusiness,
  GraduationCap,
  Laptop,
  Clock3,
  Timer,
  Sparkles,
  Building2,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { getJobDateState } from "../lib/job-dates";
import { JobCard, JobCardSkeleton } from "../components/job-card";

export const Route = createFileRoute("/jobs/")({
  ssr: true,
  loader: async () => ({ jobs: await fetchJobs() }),
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Browse Jobs — Fresh Fresher, Remote & Internship Jobs | Hire Daily" },
      {
        name: "description",
        content:
          "Discover fresh job opportunities across India. Search jobs by role, company, location, experience and job type, then review job details and application information before applying.",
      },
      { property: "og:title", content: "Browse Jobs — Hire Daily" },
      {
        property: "og:description",
        content:
          "Discover fresh jobs, fresher opportunities, internships, remote roles and location-based openings on Hire Daily.",
      },
    ],
  }),
});

const SORTS = ["Newest", "Oldest", "Deadline", "A → Z"] as const;
type Sort = (typeof SORTS)[number];

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
  const text =
    `${job.experience ?? ""} ${job.category ?? ""} ${job.role ?? ""} ${job.description ?? ""}`.toLowerCase();

  return containsAny(text, [
    "fresher",
    "freshers",
    "entry level",
    "entry-level",
    "0 year",
    "0-1",
    "0 – 1",
    "0–1",
    "graduate",
    "campus",
  ]);
}

function isRemote(job: any) {
  const text =
    `${job.location ?? ""} ${job.jobType ?? ""} ${job.description ?? ""}`.toLowerCase();

  return containsAny(text, [
    "remote",
    "work from home",
    "wfh",
    "work-from-home",
  ]);
}

function isInternship(job: any) {
  const text =
    `${job.jobType ?? ""} ${job.category ?? ""} ${job.role ?? ""}`.toLowerCase();

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
    test: (job) =>
      containsAny(normalize(job.location), ["bangalore", "bengaluru"]),
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
        [
          "software engineer",
          "software developer",
          "developer",
          "frontend",
          "backend",
          "full stack",
          "full-stack",
        ],
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

function getPostedTime(job: any) {
  return getJobDateState(job.createdAt, job.updatedAt, job.lastDate).postedAt ?? 0;
}

function isActiveJob(job: any) {
  return !getJobDateState(job.createdAt, job.updatedAt, job.lastDate).expired;
}

function getDeadlineDays(job: any) {
  const state = getJobDateState(job.createdAt, job.updatedAt, job.lastDate);
  if (state.applyByTime === null) return null;
  return Math.ceil((state.applyByTime - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

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
  const [showGuide, setShowGuide] = useState(false);

  const normalizeOption = (value?: string) =>
    value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

  const formatText = (value?: string) =>
    value
      ?.trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const browse = params.get("browse")?.trim() ?? "";
    const query = params.get("q")?.trim() ?? "";
    const categoryParam = params.get("category")?.trim() ?? "";
    const locationParam = params.get("location")?.trim() ?? "";
    const typeParam = params.get("jobType")?.trim() ?? "";
    const experienceParam = params.get("experience")?.trim() ?? "";

    const preset = browse
      ? PRESETS.find(
          (item) =>
            normalizeOption(item.label) === normalizeOption(browse),
        )
      : undefined;

    if (query) setQ(query);
    if (categoryParam) setCategory(categoryParam);
    if (locationParam) setLocation(locationParam);
    if (typeParam) setJobType(typeParam);
    if (experienceParam) setExperience(experienceParam);

    if (preset) {
      setActiveBrowse(preset.label);
    } else if (
      query ||
      categoryParam ||
      locationParam ||
      typeParam ||
      experienceParam
    ) {
      setActiveBrowse("");
    }

    if (
      preset ||
      query ||
      categoryParam ||
      locationParam ||
      typeParam ||
      experienceParam
    ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

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

  const activeJobs = useMemo(() => jobs.filter(isActiveJob), [jobs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = jobs.filter((j) => {
      if (query) {
        const hay =
          `${j.role} ${j.companyName} ${j.location} ${j.skills} ${j.category} ${j.description}`.toLowerCase();

        if (!hay.includes(query)) return false;
      }

      if (
        category &&
        normalizeOption(j.category) !== normalizeOption(category)
      )
        return false;

      if (
        location &&
        normalizeOption(j.location) !== normalizeOption(location)
      )
        return false;

      if (
        jobType &&
        normalizeOption(j.jobType) !== normalizeOption(jobType)
      )
        return false;

      if (
        experience &&
        normalizeOption(j.experience) !== normalizeOption(experience)
      )
        return false;

      return true;
    });

    const preset = PRESETS.find((p) => p.label === activeBrowse);

    if (preset && activeBrowse !== "Latest Jobs") {
      list = list.filter(preset.test);
    }

    if (sort === "Newest") {
      list = [...list].sort((a, b) => getPostedTime(b) - getPostedTime(a));
    } else if (sort === "Oldest") {
      list = [...list].sort((a, b) => getPostedTime(a) - getPostedTime(b));
    } else if (sort === "A → Z") {
      list = [...list].sort((a, b) => a.role.localeCompare(b.role));
    } else {
      list = [...list].sort((a, b) =>
        (a.lastDate ?? "").localeCompare(b.lastDate ?? ""),
      );
    }

    return list;
  }, [
    jobs,
    q,
    category,
    location,
    jobType,
    experience,
    sort,
    activeBrowse,
  ]);

  const freshJobs = useMemo(
    () =>
      [...activeJobs]
        .sort((a, b) => getPostedTime(b) - getPostedTime(a))
        .filter((job) => Date.now() - getPostedTime(job) <= 48 * 60 * 60 * 1000)
        .slice(0, 3),
    [activeJobs],
  );

  const closingSoon = useMemo(
    () =>
      [...activeJobs]
        .map((job) => ({ job, days: getDeadlineDays(job) }))
        .filter(
          (item) =>
            item.days !== null && item.days >= 0 && item.days <= 7,
        )
        .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))
        .slice(0, 3),
    [activeJobs],
  );

  const popularCompanies = useMemo(() => {
    const map = new Map<
      string,
      { name: string; logo?: string; count: number }
    >();

    activeJobs.forEach((job) => {
      const name = (job.companyName ?? "").trim();
      if (!name) return;

      const key = normalize(name);
      const current = map.get(key);

      if (current) {
        current.count += 1;
        if (!current.logo && job.companyLogo) current.logo = job.companyLogo;
      } else {
        map.set(key, {
          name,
          logo: job.companyLogo,
          count: 1,
        });
      }
    });

    return [...map.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [activeJobs]);

  const stats = useMemo(
    () => [
      {
        value: activeJobs.length,
        label: "Active jobs",
        icon: BriefcaseBusiness,
      },
      {
        value: activeJobs.filter(isFresher).length,
        label: "Fresher friendly",
        icon: GraduationCap,
      },
      {
        value: activeJobs.filter(isRemote).length,
        label: "Remote / WFH",
        icon: Laptop,
      },
      {
        value: activeJobs.filter(isInternship).length,
        label: "Internships",
        icon: Sparkles,
      },
    ],
    [activeJobs],
  );

  const anyFilter = Boolean(
    q ||
      category ||
      location ||
      jobType ||
      experience ||
      activeBrowse !== "Latest Jobs",
  );

  const updateUrl = (params: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);

    Object.entries(params).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ""}`,
    );
  };

  const clear = () => {
    setQ("");
    setCategory("");
    setLocation("");
    setJobType("");
    setExperience("");
    setActiveBrowse("Latest Jobs");
    updateUrl({
      q: "",
      browse: "",
      category: "",
      location: "",
      jobType: "",
      experience: "",
    });
  };

  const activatePreset = (label: string) => {
    setActiveBrowse(label);
    setQ("");
    setCategory("");
    setLocation("");
    setJobType("");
    setExperience("");

    updateUrl({
      q: "",
      browse: label === "Latest Jobs" ? "" : label,
      category: "",
      location: "",
      jobType: "",
      experience: "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setSearch = (value: string) => {
    setQ(value);
    setActiveBrowse("");
    updateUrl({ q: value, browse: "" });
  };

  const companySearch = (company: string) => {
    setQ(company);
    setActiveBrowse("");
    updateUrl({ q: company, browse: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sectionJump = () => {
    document
      .getElementById("all-jobs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 pb-12 sm:px-4 sm:py-8 sm:pb-20">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#00e5ff]/10 via-white/[0.02] to-[#7c3aed]/10 px-4 py-6 animate-fade-up sm:rounded-[2rem] sm:px-5 sm:py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#7c3aed]/10 blur-3xl" />

        <div className="relative max-w-3xl md:min-h-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-[#7defff] ring-1 ring-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            Fresh opportunities, organized for faster discovery
          </div>

          <h1
            className="mt-3 text-[2rem] font-bold leading-[1.05] text-white sm:text-4xl md:mt-5 md:text-6xl"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Find your next{" "}
            <span className="text-gradient">opportunity</span>
          </h1>

          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-white/55 sm:text-xs md:mt-4 md:text-base md:leading-7">
            Explore fresher jobs, internships, remote roles and location-based
            opportunities across India. Search by role, company, skills or
            location and review the listing details before you apply.
          </p>

          <div className="mt-5 flex flex-col gap-2 rounded-2xl md:mt-7 bg-black/20 p-2 ring-1 ring-white/10 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sectionJump();
                }}
                placeholder="Search jobs, companies, skills or locations..."
                className="w-full rounded-xl bg-transparent py-3 pl-11 pr-3 text-xs text-white placeholder:text-white/35 focus:outline-none sm:text-sm md:py-3.5 md:pr-4"
              />
            </div>

            <button
              onClick={sectionJump}
              className="btn-glow rounded-xl px-5 py-2.5 text-xs font-semibold sm:text-sm md:px-6 md:py-3"
            >
              Search Jobs
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Fresher Jobs", "Remote", "Internship", "Data Analyst", "Pune Jobs"].map(
              (label, chipIndex) => (
                <button
                  key={label}
                  onClick={() => activatePreset(label)}
                  className={`${chipIndex > 2 ? "hidden sm:inline-flex" : "inline-flex"} rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
      </header>

      {/* Live stats */}
      <section className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 md:mt-5 md:grid md:grid-cols-4 md:overflow-visible">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="glass card-glow min-w-[132px] snap-start rounded-xl p-2.5 animate-fade-up sm:min-w-[145px] md:min-w-0 md:rounded-2xl md:p-4"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                <stat.icon className="h-4 w-4 text-[#00e5ff]" />
              </span>
              <div>
                <div className="text-xl font-bold text-white">
                  {formatCount(stat.value)}
                </div>
                <div className="text-[11px] text-white/45">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Fresh / closing soon */}
      {(freshJobs.length > 0 || closingSoon.length > 0) && (
        <section className="mt-5 grid grid-cols-1 gap-3 lg:mt-10 lg:grid-cols-2">
          {freshJobs.length > 0 && (
            <div className="glass rounded-2xl p-4 md:rounded-3xl md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#00e5ff]" />
                    <h2
                      className="text-xl font-semibold text-white"
                      style={{ fontFamily: "'Space Grotesk'" }}
                    >
                      Fresh Jobs
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    Recently added opportunities
                  </p>
                </div>

                <button
                  onClick={() => activatePreset("Latest Jobs")}
                  className="text-xs text-[#00e5ff] hover:text-white"
                >
                  View latest
                </button>
              </div>

              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 md:mt-5 md:block md:space-y-2">
                {freshJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      window.location.href = `/jobs/${encodeURIComponent(job.id)}`;
                    }}
                    className="group flex min-w-[285px] items-center gap-3 rounded-2xl bg-white/[0.025] p-3 text-left md:min-w-0 ring-1 ring-white/[0.06] transition hover:bg-white/[0.05] hover:ring-white/15"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white/70">
                          {job.companyName?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white group-hover:text-[#00e5ff]">
                        {job.role}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {job.companyName} · {job.location || "Remote"}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:translate-x-1 group-hover:text-[#00e5ff]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {closingSoon.length > 0 && (
            <div className="glass rounded-2xl p-4 md:rounded-3xl md:p-6">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-300" />
                <h2
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  Closing Soon
                </h2>
              </div>
              <p className="mt-1 text-xs text-white/45">
                Opportunities with an upcoming application deadline
              </p>

              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 md:mt-5 md:block md:space-y-2">
                {closingSoon.map(({ job, days }) => (
                  <button
                    key={job.id}
                    onClick={() => {
                      window.location.href = `/jobs/${encodeURIComponent(job.id)}`;
                    }}
                    className="group flex min-w-[285px] items-center gap-3 rounded-2xl bg-white/[0.025] p-3 text-left md:min-w-0 ring-1 ring-white/[0.06] transition hover:bg-white/[0.05] hover:ring-white/15"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      {job.companyLogo ? (
                        <img
                          src={job.companyLogo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white/70">
                          {job.companyName?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white group-hover:text-[#00e5ff]">
                        {job.role}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {job.companyName} · {job.location || "Remote"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200 ring-1 ring-amber-400/20">
                      {days === 0 ? "Today" : `${days}d left`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Mobile-first jobs CTA */}
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#00e5ff]/15 bg-[#00e5ff]/[0.04] px-4 py-3 md:hidden">
        <div>
          <div className="text-sm font-semibold text-white">Ready to browse?</div>
          <div className="mt-0.5 text-[11px] text-white/45">
            {formatCount(activeJobs.length)} active opportunities
          </div>
        </div>
        <button
          onClick={sectionJump}
          className="btn-glow rounded-xl px-4 py-2 text-xs font-semibold"
        >
          View Jobs
        </button>
      </div>

      {/* Mobile priority CTA: jobs stay one tap away */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#00e5ff]/15 bg-[#00e5ff]/[0.045] px-3.5 py-3 md:hidden">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">Browse latest jobs</div>
          <div className="mt-0.5 text-[10px] text-white/45">
            {formatCount(activeJobs.length)} active opportunities
          </div>
        </div>
        <button
          onClick={sectionJump}
          className="btn-glow shrink-0 rounded-xl px-4 py-2 text-xs font-semibold"
        >
          View Jobs
        </button>
      </div>

      {/* Browse */}
      <section className="mt-5 md:mt-10">
        <div className="mb-4">
          <h2
            className="text-xl font-semibold text-white md:text-2xl"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Explore jobs by intent
          </h2>
          <p className="mt-1 text-xs text-white/50 md:text-sm">
            Start with a popular search and refine the results whenever you need.
          </p>
        </div>

        <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {PRESETS.map((preset) => {
            const active = activeBrowse === preset.label;
            const count =
              preset.label === "Latest Jobs"
                ? activeJobs.length
                : activeJobs.filter(preset.test).length;

            return (
              <button
                key={preset.label}
                onClick={() => activatePreset(preset.label)}
                className={`glass card-glow min-w-[188px] snap-start rounded-xl p-3.5 text-left transition sm:min-w-[210px] md:rounded-2xl md:p-4 md:min-w-[230px] lg:min-w-0 ${
                  active
                    ? "ring-1 ring-[#00e5ff]/60"
                    : "ring-1 ring-white/5 hover:-translate-y-0.5 hover:ring-white/15"
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

                <div className="mt-4 text-sm font-semibold text-white">
                  {preset.label}
                </div>

                <div className="mt-1 text-xs leading-relaxed text-white/45">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Companies */}
      {popularCompanies.length > 0 && (
        <section className="mt-6 md:mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#00e5ff]" />
                <h2
                  className="text-xl font-semibold text-white md:text-2xl"
                  style={{ fontFamily: "'Space Grotesk'" }}
                >
                  Companies in job listings
                </h2>
              </div>
              <p className="mt-1 text-xs text-white/50 md:text-sm">
                Explore active listings from companies appearing in Hire Daily jobs.
              </p>
            </div>
          </div>

          <div className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-8 lg:overflow-visible">
            {popularCompanies.map((company) => (
              <button
                key={company.name}
                onClick={() => companySearch(company.name)}
                className="glass min-w-[105px] snap-start rounded-xl p-3 text-center transition sm:min-w-[118px] sm:p-4 md:rounded-2xl hover:-translate-y-0.5 hover:ring-1 hover:ring-[#00e5ff]/30"
                title={`View ${company.name} jobs`}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                  {company.logo ? (
                    <img
                      src={company.logo}
                      alt={`${company.name} logo`}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-base font-bold text-white/70">
                      {company.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-medium text-white/70">
                  {company.name}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35">
                  {company.count} {company.count === 1 ? "job" : "jobs"}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Search / filters */}
      <div id="all-jobs" className="scroll-mt-28" />

      <div className="sticky top-14 z-30 mt-5 animate-fade-up md:top-20 md:mt-10">
        <div className="glass-strong flex items-center gap-1.5 rounded-2xl p-1.5 sm:gap-2 sm:p-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              value={q}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills..."
              className="w-full rounded-xl bg-transparent py-2.5 pl-10 pr-2 text-xs text-white placeholder:text-white/40 focus:outline-none sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
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
              {
                v: location,
                set: setLocation,
                opts: options.locations,
                label: "Location",
              },
              {
                v: jobType,
                set: setJobType,
                opts: options.types,
                label: "Type",
              },
              {
                v: experience,
                set: setExperience,
                opts: options.exps,
                label: "Experience",
              },
            ].map((f, i) => (
              <select
                key={i}
                value={f.v}
                onChange={(e) => {
                  f.set(e.target.value);
                  setActiveBrowse(e.target.value ? "" : "Latest Jobs");
                }}
                className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
              >
                <option value="">All {f.label}s</option>
                {f.opts.map((o) => (
                  <option
                    key={o}
                    value={o}
                    className="bg-[#111827]"
                  >
                    {o}
                  </option>
                ))}
              </select>
            ))}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
            >
              {SORTS.map((s) => (
                <option key={s} value={s} className="bg-[#111827]">
                  {s}
                </option>
              ))}
            </select>

            {anyFilter && (
              <button
                onClick={clear}
                className="btn-ghost-glow col-span-2 flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-sm md:col-span-5"
              >
                <X className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-5 flex items-center justify-between md:mt-8">
        <div>
          <h2
            className="text-xl font-semibold text-white md:text-2xl"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            {activeBrowse || "Filtered Results"}
          </h2>

          <p className="mt-1 text-xs text-white/45">
            {formatCount(filtered.length)} matching{" "}
            {filtered.length === 1 ? "opportunity" : "opportunities"}
          </p>
        </div>

        {activeBrowse !== "Latest Jobs" && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 text-xs text-[#00e5ff] hover:text-white"
          >
            View all jobs <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center">
            <Search className="mx-auto h-7 w-7 text-[#00e5ff]" />
            <h3 className="mt-6 text-lg font-semibold text-white">
              No jobs found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/60">
              Try a broader search, another location or a different job category.
              Hire Daily only shows what is currently available in its listings.
            </p>

            <button
              onClick={clear}
              className="btn-ghost-glow mt-4 rounded-xl px-4 py-2 text-sm"
            >
              View all jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {filtered.map((job, i) => (
              <Fragment key={job.id}>
                <JobCard job={job} index={i} />
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Trust / process */}
      <section className="mt-8 grid grid-cols-1 gap-3 md:mt-16 md:gap-5 lg:grid-cols-3">
        {[
          {
            icon: Search,
            title: "1. Discover",
            text: "Search by role, company, skills, location, experience or job type.",
          },
          {
            icon: ShieldCheck,
            title: "2. Review",
            text: "Check the available job information, deadline and application details before proceeding.",
          },
          {
            icon: CheckCircle2,
            title: "3. Apply",
            text: "Use the application option provided on the individual listing and follow the employer's process.",
          },
        ].map((item) => (
          <div key={item.title} className="glass rounded-3xl p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00e5ff]/10">
              <item.icon className="h-5 w-5 text-[#00e5ff]" />
            </div>
            <h3
              className="mt-5 text-lg font-semibold text-white"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {item.text}
            </p>
          </div>
        ))}
      </section>

      {/* Before you apply */}
      <section className="mt-4 rounded-3xl md:mt-6 border border-[#00e5ff]/10 bg-gradient-to-r from-[#00e5ff]/[0.04] to-[#7c3aed]/[0.05] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#00e5ff]" />
              <h2
                className="text-xl font-semibold text-white md:text-2xl"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Before you apply
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-white/55">
              A quick checklist can help you avoid missing important information
              in a job listing.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "Review the role and responsibilities",
              "Check location and work arrangement",
              "Confirm experience and eligibility",
              "Check the application deadline",
              "Review salary information when provided",
              "Read the complete job description",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs text-white/65 ring-1 ring-white/[0.06]"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Original content / FAQ */}
      <section className="mt-10 md:mt-12">
        <div className="max-w-3xl">
          <h2
            className="text-2xl font-semibold text-white md:text-3xl"
            style={{ fontFamily: "'Space Grotesk'" }}
          >
            Find jobs faster with Hire Daily
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/60">
            Hire Daily is designed to make job discovery easier by bringing
            searchable opportunities into one place. Instead of browsing a
            long, unstructured list, you can narrow listings by role, location,
            experience and job type, then open an individual listing for more
            information.
          </p>

          <p className="mt-3 text-sm leading-7 text-white/60">
            When you are searching for fresher jobs, internships or remote
            opportunities, start with a relevant browse category and refine the
            results using the search bar. Always review the listing carefully
            before applying, especially the eligibility, location and deadline.
          </p>
        </div>

        <div className="mt-7 divide-y divide-white/[0.07] rounded-3xl border border-white/[0.07] bg-white/[0.02]">
          {[
            {
              q: "How do I search for a specific job?",
              a: "Use the search bar for a role, company, skill or location. You can then combine the search with the available filters.",
            },
            {
              q: "Can I find fresher and internship jobs?",
              a: "Yes. Use the Fresher Jobs or Internship browse options to narrow the available listings.",
            },
            {
              q: "Can I find remote jobs?",
              a: "Use the Remote or Work From Home options. The result depends on the information available in each job listing.",
            },
            {
              q: "How do I apply for a job?",
              a: "Open the individual job listing and review the available application information. Use the provided application option to continue to the relevant application process.",
            },
          ].map((item) => (
            <button
              key={item.q}
              onClick={() => setShowGuide((value) => !value)}
              className="flex w-full items-start justify-between gap-5 px-5 py-5 text-left"
            >
              <span>
                <span className="block text-sm font-semibold text-white">
                  {item.q}
                </span>
                {showGuide && (
                  <span className="mt-2 block max-w-3xl text-sm leading-6 text-white/55">
                    {item.a}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`mt-0.5 h-4 w-4 shrink-0 text-white/35 transition ${
                  showGuide ? "rotate-180" : ""
                }`}
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
