import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Search,
  Zap,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  Instagram,
  MessageCircle,
  ExternalLink,
  MapPin,
  GraduationCap,
  Laptop,
  BriefcaseBusiness,
  BookOpen,
  FileText,
  UserCheck,
  Sparkles,
  Globe2,
  Clock3,
  BadgeCheck,
} from "lucide-react";
import { fetchJobs } from "../lib/jobs";
import { JobCard, JobCardSkeleton } from "../components/job-card";
import { Particles } from "../components/aurora-bg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Hire Daily — Jobs, Internships & Career Opportunities" },
      {
        name: "description",
        content:
          "Discover current jobs, internships, fresher opportunities, remote roles and career resources on Hire Daily. Browse by role, company, location and experience.",
      },
      {
        property: "og:title",
        content: "Hire Daily — Jobs, Internships & Career Opportunities",
      },
      {
        property: "og:description",
        content:
          "Explore current job opportunities, internships, fresher roles, remote jobs and practical career resources.",
      },
    ],
  }),
});

function useCounter(target: number, duration = 1400) {
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

function Stat({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: typeof Search;
}) {
  const n = useCounter(value);

  return (
    <div className="glass gradient-border rounded-2xl p-5 hd-glow-card hd-shimmer">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
          <Icon className="h-4 w-4 text-[#00e5ff]" />
        </div>
        <span className="text-3xl font-bold text-gradient">
          {n.toLocaleString()}+
        </span>
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-white/55">
        {label}

      <style>{`
        .hd-reveal {
          animation: hdReveal .8s cubic-bezier(.2,.8,.2,1) both;
        }
        .hd-reveal-delay-1 { animation-delay: 80ms; }
        .hd-reveal-delay-2 { animation-delay: 160ms; }
        .hd-reveal-delay-3 { animation-delay: 240ms; }

        .hd-float {
          animation: hdFloat 6s ease-in-out infinite;
        }

        .hd-pulse-orb {
          animation: hdPulseOrb 5s ease-in-out infinite;
        }

        .hd-shimmer {
          position: relative;
          overflow: hidden;
        }
        .hd-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(100deg, transparent 25%, rgba(255,255,255,.08) 48%, transparent 70%);
          animation: hdShimmer 4.5s ease-in-out infinite;
          pointer-events: none;
        }

        .hd-glow-card {
          transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease;
        }
        .hd-glow-card:hover {
          transform: translateY(-6px);
          border-color: rgba(0,229,255,.22);
          box-shadow: 0 22px 55px rgba(0,0,0,.26), 0 0 35px rgba(0,229,255,.07);
        }

        .hd-icon-bounce {
          transition: transform .35s cubic-bezier(.2,.8,.2,1);
        }
        .hd-glow-card:hover .hd-icon-bounce {
          transform: translateY(-2px) scale(1.08) rotate(-3deg);
        }

        .hd-magnetic {
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;
        }
        .hd-magnetic:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 35px rgba(0,229,255,.12);
        }

        @keyframes hdReveal {
          from { opacity: 0; transform: translateY(22px); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes hdFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(1.5deg); }
        }
        @keyframes hdPulseOrb {
          0%,100% { transform: scale(1); opacity: .45; }
          50% { transform: scale(1.12); opacity: .7; }
        }
        @keyframes hdShimmer {
          0%,58%,100% { transform: translateX(-120%); }
          72% { transform: translateX(120%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hd-reveal, .hd-float, .hd-pulse-orb, .hd-shimmer::after {
            animation: none !important;
          }
          .hd-glow-card, .hd-magnetic, .hd-icon-bounce {
            transition: none !important;
          }
        }
      `}</style>

      </div>
    </div>
  );
}

const BROWSE_ITEMS = [
  ["Latest Jobs", "Recently posted opportunities", Clock3],
  ["Fresher Jobs", "Entry-level and graduate roles", GraduationCap],
  ["Work From Home", "Work-from-home opportunities", Laptop],
  ["Internship", "Intern and trainee opportunities", GraduationCap],
  ["Remote", "Remote-friendly roles", Globe2],
  ["Pune Jobs", "Opportunities in Pune", MapPin],
  ["Mumbai Jobs", "Opportunities in Mumbai", MapPin],
  ["Bangalore Jobs", "Opportunities in Bangalore", MapPin],
  ["Data Analyst", "Data and analytics roles", BriefcaseBusiness],
  ["Software Engineer", "Software development roles", BriefcaseBusiness],
  ["Marketing", "Marketing and growth roles", BriefcaseBusiness],
] as const;

const CAREER_RESOURCES = [
  {
    icon: FileText,
    title: "Resume Checklist for Freshers",
    text: "A practical checklist for improving structure, clarity, skills and project presentation before applying.",
  },
  {
    icon: UserCheck,
    title: "How to Read a Job Description",
    text: "Understand experience requirements, must-have skills, responsibilities and application details before you apply.",
  },
  {
    icon: ShieldCheck,
    title: "How to Spot a Suspicious Job",
    text: "Simple checks candidates can use to evaluate application links, recruiter requests and unusual job offers.",
  },
  {
    icon: BookOpen,
    title: "Interview Preparation Basics",
    text: "A practical starting point for preparing examples, technical fundamentals and questions for an interview.",
  },
];

const FAQS = [
  {
    q: "What is Hire Daily?",
    a: "Hire Daily is a job discovery platform that helps candidates find and review current employment opportunities. Listings can be explored by role, location, experience, job type and other information available in the source listing.",
  },
  {
    q: "How do I find a job on Hire Daily?",
    a: "Use Browse Jobs to search by role, company, location, skills or experience. You can also start with categories such as fresher jobs, internships, remote jobs, Pune jobs, Mumbai jobs and Bangalore jobs.",
  },
  {
    q: "Where do I apply?",
    a: "Open the individual job page and use its application link. Where available, the listing identifies the employer or source destination so you can review the details before continuing.",
  },
  {
    q: "Does Hire Daily charge candidates?",
    a: "No. Hire Daily is designed as a free job discovery experience for candidates. You can browse listings without paying a fee to Hire Daily.",
  },
  {
    q: "What does verification mean?",
    a: "Verification information is shown according to the available source and checking information for a listing. A verification label is not a guarantee of employment, and candidates should review the source and application destination before applying.",
  },
  {
    q: "Are company logos shown as hiring partners?",
    a: "No. When employer names are displayed, they are presented to identify companies referenced by job listings. Hire Daily does not claim an employer partnership unless that partnership is explicitly stated.",
  },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function companyDomain(company: string) {
  const normalized = company
    .toLowerCase()
    .replace(/\b(inc|ltd|limited|llp|plc|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  const known: Record<string, string> = {
    accenture: "accenture.com",
    amazon: "amazon.com",
    microsoft: "microsoft.com",
    google: "google.com",
    meta: "meta.com",
    apple: "apple.com",
    infosys: "infosys.com",
    tcs: "tcs.com",
    "tataconsultancyservices": "tcs.com",
    wipro: "wipro.com",
    cognizant: "cognizant.com",
    deloitte: "deloitte.com",
    capgemini: "capgemini.com",
    ibm: "ibm.com",
    oracle: "oracle.com",
    adobe: "adobe.com",
    salesforce: "salesforce.com",
    hcl: "hcltech.com",
    hcltech: "hcltech.com",
    flipkart: "flipkart.com",
    walmart: "walmart.com",
    uber: "uber.com",
    airbnb: "airbnb.com",
    linkedin: "linkedin.com",
    zoho: "zoho.com",
    freshworks: "freshworks.com",
    phonepe: "phonepe.com",
    swiggy: "swiggy.com",
    zomato: "zomato.com",
    razorpay: "razorpay.com",
    cred: "cred.club",
    paytm: "paytm.com",
  };

  return known[normalized] ?? null;
}

function CompanyLogo({
  company,
  className = "",
}: {
  company: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const domain = companyDomain(company);

  return (
    <div
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] ${className}`}
    >
      {!failed && domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${company} logo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-7 w-7 object-contain transition duration-500 group-hover:scale-110"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold tracking-tight text-white">
          {initials(company)}
        </span>
      )}
    </div>
  );
}

function Home() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });

  const allJobs = jobs ?? [];
  const latest = allJobs.slice(0, 6);

  const companyStats = useMemo(() => {
    const counts = new Map<string, number>();
    allJobs.forEach((job) => {
      const name = job.companyName?.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [allJobs]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    allJobs.forEach((job) => {
      const category = job.category?.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [allJobs]);

  const locationStats = useMemo(() => {
    const counts = new Map<string, number>();
    allJobs.forEach((job) => {
      const location = job.location?.trim();
      if (location) counts.set(location, (counts.get(location) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  }, [allJobs]);

  const verifiedCount = allJobs.filter(
    (job) => job.verificationStatus === "verified",
  ).length;

  return (
    <div className="relative mx-auto max-w-7xl px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] hd-grid" />
      <div className="pointer-events-none absolute left-[8%] top-[180px] -z-10 h-40 w-40 rounded-full bg-[#00e5ff]/10 blur-3xl hd-pulse-orb" />
      <div className="pointer-events-none absolute right-[8%] top-[360px] -z-10 h-52 w-52 rounded-full bg-[#7c3aed]/10 blur-3xl hd-pulse-orb" />
      {/* Hero */}
      <section className="relative overflow-hidden py-12 md:py-20 hd-reveal">
        <Particles count={34} />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 px-4 py-1.5 text-xs text-white/75 backdrop-blur animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
            Jobs • Internships • Fresher Roles • Remote Opportunities
          </div>

          <h1
            className="mx-auto mt-6 max-w-5xl text-5xl font-bold leading-[1.02] tracking-tight text-white animate-fade-up md:text-7xl"
            style={{
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              animationDelay: "80ms",
            }}
          >
            Find Your Next{" "}
            <span className="text-gradient">Career Opportunity</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/62 md:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Explore current job opportunities with structured role details,
            company information, location, experience, source and application
            information — all in one place.
          </p>

          <div
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              to="/jobs"
              className="btn-glow group flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"
            >
              <Search className="h-4 w-4" />
              Browse All Jobs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/jobs"
              className="btn-ghost-glow flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm"
            >
              <GraduationCap className="h-4 w-4 text-[#00e5ff]" />
              Explore Fresher Jobs
            </Link>
          </div>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs text-white/45">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              Search by role
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              Search by company
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              Search by location
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
              Search by skills
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute left-8 top-24 hidden md:block animate-float">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <Building2 className="h-6 w-6 text-[#00e5ff]" />
          </div>
        </div>

        <div className="pointer-events-none absolute right-10 top-40 hidden md:block animate-float">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-2xl">
            <RocketIcon />
          </div>
        </div>
      </section>

      {/* Live directory metrics */}
      <section className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-3 hd-reveal hd-reveal-delay-1">
        <Stat value={allJobs.length} label="Current Job Listings" icon={BriefcaseBusiness} />
        <Stat value={companyStats.length} label="Companies in This View" icon={Building2} />
        <Stat value={verifiedCount} label="Listings Marked Verified" icon={BadgeCheck} />
      </section>

      <p className="mx-auto max-w-3xl text-center text-xs leading-5 text-white/35">
        Counts are generated from the current Hire Daily listing data and can
        change as jobs are added, updated or removed.
      </p>

      {/* Browse */}
      <section className="py-16 hd-reveal hd-reveal-delay-1">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <Search className="h-3.5 w-3.5" />
              Explore
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Browse Jobs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Start with the type of opportunity or location you are looking
              for, then refine the results on the jobs directory.
            </p>
          </div>

          <Link
            to="/jobs"
            className="hidden items-center gap-1 text-sm text-[#00e5ff] hover:text-white md:inline-flex"
          >
            View all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BROWSE_ITEMS.map(([label, body, Icon]) => (
            <a
              key={label}
              href={`/jobs?browse=${encodeURIComponent(label)}`}
              className="glass card-glow group rounded-2xl p-4 transition hover:-translate-y-0.5 hd-glow-card hd-shimmer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
                  <Icon className="h-4 w-4 text-[#00e5ff]" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-[#00e5ff]" />
              </div>
              <div className="mt-4 text-sm font-semibold text-white">
                {label}
              </div>
              <div className="mt-1 text-xs leading-5 text-white/45">
                {body}
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-white/35">
          Browse categories are connected to the live jobs directory. If a
          category has no matching listing, the directory will show an
          appropriate no-results state rather than inventing opportunities.
        </p>
      </section>

      {/* Latest jobs */}
      <section className="py-14 hd-reveal hd-reveal-delay-2">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <Clock3 className="h-3.5 w-3.5" />
              Current listings
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Latest Jobs
            </h2>
            <p className="mt-2 text-sm text-white/55">
              A live selection from the current Hire Daily job directory.
            </p>
          </div>

          <Link
            to="/jobs"
            className="hidden items-center gap-1 text-sm text-[#00e5ff] hover:text-white md:inline-flex"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="glass rounded-3xl p-14 text-center">
            <Search className="mx-auto h-7 w-7 text-[#00e5ff]" />
            <h3 className="mt-5 text-lg font-semibold text-white">
              No active listings yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
              New opportunities will appear here as they become available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Featured employers from real listing data */}
      {companyStats.length > 0 && (
        <section className="relative overflow-hidden py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
                <Building2 className="h-3.5 w-3.5" />
                Employer directory
              </div>
              <h2
                className="text-3xl font-bold text-white md:text-4xl"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Companies Featured in Job Listings
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Employer names are derived automatically from current Hire Daily
                listings. They are shown for identification and discovery, not
                as a claim of partnership or endorsement.
              </p>
            </div>
          </div>

          <div className="company-marquee-shell">
            <div className="company-marquee group">
              {[...companyStats, ...companyStats].map(([company, count], i) => (
                <a
                  key={`${company}-${i}`}
                  href={`/jobs?q=${encodeURIComponent(company)}`}
                  aria-label={`View ${company} jobs`}
                  className="company-marquee-card glass card-glow group/card"
                >
                  <CompanyLogo company={company} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {company}
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {count} {count === 1 ? "listing" : "listings"}
                    </div>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/20 transition duration-300 group-hover/card:translate-x-1 group-hover/card:text-[#00e5ff]" />
                </a>
              ))}
            </div>
          </div>

          <style>{`
            .company-marquee-shell {
              position: relative;
              overflow: hidden;
              padding: 10px 0 18px;
              mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent);
              -webkit-mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent);
            }

            .company-marquee {
              display: flex;
              width: max-content;
              gap: 14px;
              animation: hireDailyCompanyMarquee 34s linear infinite;
              will-change: transform;
            }

            .company-marquee:hover {
              animation-play-state: paused;
            }

            .company-marquee-card {
              display: flex;
              width: 285px;
              min-height: 82px;
              align-items: center;
              gap: 13px;
              border-radius: 18px;
              padding: 14px;
              transition:
                transform 300ms ease,
                border-color 300ms ease,
                box-shadow 300ms ease,
                background 300ms ease;
            }

            .company-marquee-card:hover {
              transform: translateY(-4px) scale(1.015);
              border-color: rgba(0,229,255,.24);
              background: rgba(255,255,255,.055);
              box-shadow:
                0 18px 45px rgba(0,0,0,.25),
                0 0 30px rgba(0,229,255,.08);
            }

            .company-marquee-card img {
              filter: grayscale(.55) brightness(.9);
              opacity: .78;
            }

            .company-marquee-card:hover img {
              filter: grayscale(0) brightness(1);
              opacity: 1;
            }

            @keyframes hireDailyCompanyMarquee {
              from { transform: translate3d(0, 0, 0); }
              to { transform: translate3d(-50%, 0, 0); }
            }

            @media (prefers-reduced-motion: reduce) {
              .company-marquee {
                animation: none;
                transform: none;
                flex-wrap: wrap;
                width: auto;
              }

              .company-marquee-shell {
                mask-image: none;
                -webkit-mask-image: none;
              }
            }

            @media (max-width: 640px) {
              .company-marquee {
                animation-duration: 42s;
              }

              .company-marquee-card {
                width: 250px;
              }
            }
          `}</style>

          <div className="mt-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-5 text-white/35">
            Company names, trademarks and logos belong to their respective
            owners. Hire Daily does not represent these employers as partners
            unless a partnership is explicitly disclosed.
          </div>
        </section>
      )}

      {/* Categories + locations from actual data */}
      <section className="grid grid-cols-1 gap-6 py-16 hd-reveal hd-reveal-delay-1 lg:grid-cols-2">
        <DirectoryPanel
          icon={BriefcaseBusiness}
          eyebrow="Job taxonomy"
          title="Explore by Category"
          description="Use the categories represented in the current listing data to narrow your search."
          items={categoryStats}
          hrefPrefix="/jobs"
        />
        <DirectoryPanel
          icon={MapPin}
          eyebrow="Location directory"
          title="Explore by Location"
          description="Find opportunities based on the locations currently represented in the directory."
          items={locationStats}
          hrefPrefix="/jobs"
        />
      </section>

      {/* Original informational content */}
      <section className="py-16 hd-reveal">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <BookOpen className="h-3.5 w-3.5" />
              Candidate guide
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              More Than a Job List
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-white/55">
              A useful job search should help you understand an opportunity,
              not just send you somewhere else. Hire Daily organizes listing
              information and provides practical guidance so candidates can
              make a more informed decision before applying.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Discover",
                body: "Search opportunities by role, company, location, experience, job type and skills.",
              },
              {
                icon: ShieldCheck,
                title: "Review",
                body: "Read the available role information, source details, eligibility and application context before continuing.",
              },
              {
                icon: ExternalLink,
                title: "Apply",
                body: "When you are ready, use the application destination provided on the individual listing.",
              },
            ].map((item, i) => (
              <div key={item.title} className="glass card-glow rounded-2xl p-6 hd-glow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
                  <item.icon className="h-6 w-6 text-[#00e5ff]" />
                </div>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/35">
                  Step {i + 1}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is on a job page */}
      <section className="py-16 hd-reveal">
        <div className="glass-strong rounded-3xl p-7 md:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Listing transparency
              </div>
              <h2
                className="text-3xl font-bold text-white md:text-4xl"
                style={{ fontFamily: "'Space Grotesk'" }}
              >
                Know What You Are Applying For
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/55">
                Individual job pages are designed to bring the important
                information together before a candidate leaves Hire Daily.
                The exact fields depend on what is available in the source
                listing.
              </p>
              <Link
                to="/jobs"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#00e5ff] hover:text-white"
              >
                Browse the job directory <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Role", "Job title and position"],
                ["Company", "Employer named in listing"],
                ["Location", "Listed work location"],
                ["Experience", "Experience level when available"],
                ["Skills", "Relevant skills and requirements"],
                ["Application", "Available application destination"],
                ["Source", "Source information when available"],
                ["Verification", "Verification status and date"],
                ["Deadline", "Application deadline when available"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/7 bg-white/[0.025] p-4"
                >
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-white/40">
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Career resources */}
      <section className="py-16 hd-reveal">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <BookOpen className="h-3.5 w-3.5" />
              Career resources
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Practical Guidance for Job Seekers
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
              Useful, candidate-focused guidance to complement the job
              directory. These topics are intentionally practical rather than
              generic keyword pages.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {CAREER_RESOURCES.map((resource) => (
            <div
              key={resource.title}
              className="glass card-glow rounded-2xl p-6 hd-glow-card"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
                <resource.icon className="h-5 w-5 text-[#00e5ff]" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                {resource.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                {resource.text}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-white/35">
                Career guidance <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Hire Daily works */}
      <section className="py-16 hd-reveal">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <Instagram className="h-3.5 w-3.5" />
              Discovery flow
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              How Hire Daily Works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/55">
              Hire Daily connects social discovery with a structured web
              directory so candidates can move from a job post to the
              underlying opportunity page.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-4">
            {[
              [
                Instagram,
                "Discover",
                "Find a relevant opportunity through Hire Daily's Instagram content.",
              ],
              [
                MessageCircle,
                "Get the link",
                "Our automated workflow can route an interaction to the relevant job page.",
              ],
              [
                FileText,
                "Review",
                "Check role, company, eligibility, source and verification information available.",
              ],
              [
                ExternalLink,
                "Apply",
                "Continue to the application destination when you decide the role is suitable.",
              ],
            ].map(([Icon, title, body], i) => (
              <div key={title as string} className="glass card-glow rounded-2xl p-6 hd-glow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
                  <Icon className="h-6 w-6 text-[#00e5ff]" />
                </div>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/35">
                  0{i + 1}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {title as string}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {body as string}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why / transparency */}
      <section className="grid grid-cols-1 gap-5 py-16 hd-reveal md:grid-cols-3">
        {[
          [
            Zap,
            "Fresh Opportunity Discovery",
            "The directory is built around current job listings and searchable filters rather than a static list of links.",
          ],
          [
            ShieldCheck,
            "Source-Aware Listings",
            "Job pages expose source and verification information when available so candidates can make their own checks.",
          ],
          [
            CheckCircle2,
            "Candidate-First Experience",
            "The goal is to help a candidate understand a role before sending them to an external application destination.",
          ],
        ].map(([Icon, title, body]) => (
          <div key={title as string} className="glass card-glow rounded-2xl p-6 hd-glow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 hd-icon-bounce">
              <Icon className="h-6 w-6 text-[#00e5ff]" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {title as string}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              {body as string}
            </p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 hd-reveal">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#00e5ff]">
              <MessageCircle className="h-3.5 w-3.5" />
              Help
            </div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ fontFamily: "'Space Grotesk'" }}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="glass group rounded-2xl p-5 hd-magnetic open:ring-1 open:ring-[#00e5ff]/25"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-5 text-sm font-medium text-white">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/45 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial / transparency note */}
      <section className="pb-20 pt-8 hd-reveal">
        <div className="rounded-3xl border border-[#00e5ff]/10 bg-gradient-to-br from-[#00e5ff]/5 via-transparent to-[#7c3aed]/5 p-7 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
              <Globe2 className="h-5 w-5 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                A transparent way to explore job opportunities
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">
                Hire Daily is a discovery and information layer for candidates.
                We organize job information into searchable pages and provide
                context around the available source, verification and
                application details. Employer names shown on this site identify
                companies referenced by listings; they should not be interpreted
                as endorsements, partnerships or guarantees of hiring unless
                explicitly stated.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/about"
                  className="btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                >
                  About Hire Daily <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/how-we-verify-jobs"
                  className="btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                >
                  How we verify jobs <ShieldCheck className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DirectoryPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
  hrefPrefix,
}: {
  icon: typeof Search;
  eyebrow: string;
  title: string;
  description: string;
  items: [string, number][];
  hrefPrefix: string;
}) {
  return (
    <div className="glass rounded-3xl p-6 md:p-7">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#00e5ff]">
        <Icon className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2
        className="mt-3 text-2xl font-bold text-white"
        style={{ fontFamily: "'Space Grotesk'" }}
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {items.map(([item, count]) => (
          <a
            key={item}
            href={`${hrefPrefix}?q=${encodeURIComponent(item)}`}
            className="group flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3 transition hover:border-[#00e5ff]/20 hover:bg-white/[0.05]"
          >
            <span className="truncate text-xs font-medium text-white/80">
              {item}
            </span>
            <span className="ml-2 shrink-0 text-[10px] text-white/30 group-hover:text-[#00e5ff]">
              {count}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function RocketIcon() {
  return <Zap className="h-6 w-6 text-[#7c3aed]" />;
}
