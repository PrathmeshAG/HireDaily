import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Brain, Briefcase, Bug, ChevronDown, Clock, Cloud,
  Code2, Search, Server, ShieldCheck, Sparkles, Users, ClipboardCheck,
} from "lucide-react";
import { EXTRA } from "../data/interview-questions"

export const Route = createFileRoute("/preparation/interview")({
  component: InterviewPreparationPage,
});

type Level = "Beginner" | "Intermediate" | "Advanced";
type QA = { q: string; a: string; level: Level };
type Domain = {
  id: string; name: string; kind: "hr" | "technical"; live: boolean;
  blurb: string; topics: string[]; img: string; icon: typeof Code2;
  accent: string; qs: QA[];
};

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const BASE: Domain[] = [
  {
    id: "hr", name: "HR Interview", kind: "hr", live: true, icon: Users, accent: "from-cyan-500 to-sky-600",
    blurb: "Introductions, strengths, salary talks and behavioural answers that sound confident, not rehearsed.",
    topics: ["Introduction", "Behavioural", "Salary", "Culture fit"],
    img: img("photo-1573497019940-1c28c88b4f3e"),
    qs: [
      { level: "Beginner", q: "Tell me about yourself.", a: "Use a present-past-future structure in about 60 seconds. Present: your current role or degree and one strength. Past: two or three experiences that built that strength. Future: why this role is the natural next step. Do not read out your resume." },
      { level: "Beginner", q: "What are your strengths and weaknesses?", a: "Pick strengths the job actually needs and back each with one short example. For a weakness, name a real but non-critical one, then explain what you are doing to improve it, such as a course, a habit or feedback from a mentor." },
      { level: "Intermediate", q: "Describe a time you handled a conflict at work.", a: "Answer with the STAR method: Situation, Task, Action, Result. Focus on listening to the other person, finding the shared goal and the measurable outcome. Avoid blaming anyone." },
      { level: "Intermediate", q: "What are your salary expectations?", a: "Research the market range first. Give a range instead of one number, anchor it to your skills and the role's scope, and say you are open to discussing the full package. If asked too early, redirect to fit and responsibilities first." },
      { level: "Advanced", q: "Where do you see yourself in five years?", a: "Show ambition that aligns with the company: growing into deeper ownership, mentoring others, or leading a domain. Avoid naming a specific title or saying you will leave for something else." },
    ],
  },
  {
    id: "software", name: "Software Development", kind: "technical", live: true, icon: Code2, accent: "from-violet-500 to-fuchsia-600",
    blurb: "Core programming, OOP, data structures, APIs and system basics for developer roles.",
    topics: ["OOP", "DSA", "REST APIs", "Git"],
    img: img("photo-1555949963-ff9fe0c870eb"),
    qs: [
      { level: "Beginner", q: "What are the four pillars of OOP?", a: "Encapsulation (bundling data with the methods that use it), abstraction (hiding complexity behind a simple interface), inheritance (reusing behaviour from a parent class) and polymorphism (one interface, many implementations)." },
      { level: "Beginner", q: "What is the difference between an array and a linked list?", a: "Arrays store elements contiguously, giving O(1) index access but costly inserts in the middle. Linked lists use nodes with pointers, giving cheap inserts and deletes once you hold the node, but O(n) access." },
      { level: "Intermediate", q: "Explain REST and the common HTTP methods.", a: "REST is a stateless, resource-oriented API style. GET reads, POST creates, PUT replaces, PATCH updates partially and DELETE removes. Good REST APIs use clear resource URLs, proper status codes and idempotent PUT and DELETE." },
      { level: "Intermediate", q: "What is the difference between a process and a thread?", a: "A process has its own memory space and resources. Threads live inside a process and share its memory, so they are lighter to create but need synchronisation (locks, semaphores) to avoid race conditions." },
      { level: "Advanced", q: "How would you design a URL shortener?", a: "Clarify scale first. Generate unique short keys using a base62-encoded counter or hash, store key-to-URL in a key-value store, put a cache in front for hot links, and use a load-balanced stateless service. Add analytics and expiry as extensions." },
    ],
  },
  {
    id: "analyst", name: "Data Analyst", kind: "technical", live: true, icon: BarChart3, accent: "from-emerald-500 to-teal-600",
    blurb: "SQL, Excel, statistics and dashboards. Questions asked in analyst and BI interviews.",
    topics: ["SQL", "Excel", "Statistics", "Power BI"],
    img: img("photo-1551288049-bebda4e38f71"),
    qs: [
      { level: "Beginner", q: "What is the difference between WHERE and HAVING in SQL?", a: "WHERE filters rows before grouping and cannot use aggregate functions. HAVING filters groups after GROUP BY and can use aggregates such as COUNT or SUM." },
      { level: "Beginner", q: "Explain the types of SQL joins.", a: "INNER returns matching rows only. LEFT keeps all rows from the left table, RIGHT keeps all from the right, FULL OUTER keeps everything, and CROSS returns every combination of rows." },
      { level: "Intermediate", q: "How do you handle missing values in a dataset?", a: "First understand why they are missing. Then drop them if few and random, impute with mean, median or mode, use model-based imputation, or flag them as a separate category. Always document the choice and its effect." },
      { level: "Intermediate", q: "What is the difference between mean, median and mode, and when to use each?", a: "Mean suits symmetric data without outliers. Median is better for skewed data or outliers, such as salaries. Mode is used for categorical data or most frequent values." },
      { level: "Advanced", q: "How would you investigate a sudden 20% drop in daily active users?", a: "Check data quality and tracking first. Then segment by platform, region, version and acquisition channel, compare with seasonality and recent releases, and form hypotheses to test. Present findings with the impact and a recommended action." },
    ],
  },
  {
    id: "cyber", name: "Cyber Security", kind: "technical", live: true, icon: ShieldCheck, accent: "from-rose-500 to-orange-600",
    blurb: "Security fundamentals, common attacks, network defence and incident response basics.",
    topics: ["CIA Triad", "OWASP", "Networking", "Incident response"],
    img: img("photo-1550751827-4bd374c3f58b"),
    qs: [
      { level: "Beginner", q: "What is the CIA triad?", a: "Confidentiality (only authorised people see data), Integrity (data is not altered improperly) and Availability (systems and data are accessible when needed). Every security control supports at least one of these." },
      { level: "Beginner", q: "What is the difference between symmetric and asymmetric encryption?", a: "Symmetric uses one shared key, is fast and suits bulk data (AES). Asymmetric uses a public and private key pair, is slower and suits key exchange and signatures (RSA, ECC). TLS uses both." },
      { level: "Intermediate", q: "Explain SQL injection and how to prevent it.", a: "Attackers inject SQL through unsanitised input to read or change data. Prevent it with parameterised queries or prepared statements, input validation, least-privilege database accounts and a web application firewall." },
      { level: "Intermediate", q: "What is XSS and what are its types?", a: "Cross-site scripting injects malicious scripts into pages viewed by others. Types are stored, reflected and DOM-based. Prevent with output encoding, a strict Content Security Policy and input validation." },
      { level: "Advanced", q: "What steps would you take during a security incident?", a: "Follow the lifecycle: preparation, detection and analysis, containment, eradication, recovery and lessons learned. Isolate affected systems, preserve evidence, identify the root cause, restore from clean backups and update controls." },
    ],
  },
  { id: "ds", name: "Data Science", kind: "technical", live: false, icon: Brain, accent: "from-indigo-500 to-blue-600", blurb: "Machine learning, model evaluation, feature engineering and case studies.", topics: ["ML", "Python", "Modelling"], img: img("photo-1677442136019-21780ecad995"), qs: [] },
  { id: "cloud", name: "Cloud Computing", kind: "technical", live: false, icon: Cloud, accent: "from-sky-500 to-cyan-600", blurb: "AWS, Azure and GCP services, architecture, networking and cost control.", topics: ["AWS", "Azure", "GCP"], img: img("photo-1451187580459-43490279c0fa"), qs: [] },
  { id: "devops", name: "DevOps", kind: "technical", live: false, icon: Server, accent: "from-amber-500 to-orange-600", blurb: "CI/CD, Docker, Kubernetes, Terraform and monitoring.", topics: ["CI/CD", "Docker", "K8s"], img: img("photo-1558494949-ef010cbdcc31"), qs: [] },
  { id: "qa", name: "QA & Testing", kind: "technical", live: false, icon: Bug, accent: "from-lime-500 to-green-600", blurb: "Manual and automation testing, test design and bug lifecycle.", topics: ["Selenium", "API testing"], img: img("photo-1516116216624-53e697fedbea"), qs: [] },
  { id: "ba", name: "Business Analyst", kind: "technical", live: false, icon: Briefcase, accent: "from-purple-500 to-pink-600", blurb: "Requirements, stakeholders, user stories and process modelling.", topics: ["BRD", "Agile", "UML"], img: img("photo-1454165804606-c3d57bc86b40"), qs: [] },
];

const DOMAINS: Domain[] = BASE.map((d) => ({ ...d, qs: [...d.qs, ...(EXTRA[d.id] ?? [])] }));

const PAGE = 10;
const LEVELS: ("All" | Level)[] = ["All", "Beginner", "Intermediate", "Advanced"];
const KINDS = [
  { id: "all", label: "All" },
  { id: "hr", label: "HR Interview" },
  { id: "technical", label: "Technical Interview" },
] as const;

const levelStyle: Record<Level, string> = {
  Beginner: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  Intermediate: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  Advanced: "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
};

function InterviewPreparationPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("all");
  const [level, setLevel] = useState<"All" | Level>("All");
  const [selected, setSelected] = useState("hr");
  const [open, setOpen] = useState<number | null>(0);
  const [shown, setShown] = useState(PAGE);

  const q = query.trim().toLowerCase();
  const domains = useMemo(
    () => DOMAINS.filter((d) =>
      (kind === "all" || d.kind === kind) &&
      (!q || [d.name, d.blurb, ...d.topics, ...d.qs.map((x) => x.q)].join(" ").toLowerCase().includes(q))),
    [q, kind],
  );

  const active = DOMAINS.find((d) => d.id === selected) ?? DOMAINS[0];
  const questions = active.qs.filter((x) =>
    (level === "All" || x.level === level) &&
    (!q || x.q.toLowerCase().includes(q) || x.a.toLowerCase().includes(q) || active.name.toLowerCase().includes(q)));
  const liveCount = DOMAINS.filter((d) => d.live).length;
  const totalQs = DOMAINS.reduce((n, d) => n + d.qs.length, 0);

  const pick = (d: Domain) => { if (d.live) { setSelected(d.id); setOpen(0); setShown(PAGE); document.getElementById("qa")?.scrollIntoView({ behavior: "smooth", block: "start" }); } };

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/5 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Interview Preparation
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Walk into interviews prepared.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55 sm:text-lg">
              Real questions with clear answers for HR rounds and technical interviews, organised by domain and difficulty level.
            </p>
          </div>

          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/60 focus-within:ring-2 focus-within:ring-cyan-400 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a domain, topic or question: SQL, DevOps, OOP…"
              aria-label="Search interview preparation"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-white/35 sm:text-base"
            />
          </div>

          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
            {[[`${DOMAINS.length}`, "Domains"], [`${liveCount}`, "Live now"], [`${totalQs}`, "Questions with answers"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-2xl font-black">{v}</dt>
                <dd className="mt-1 text-xs text-slate-500 dark:text-white/45">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Domains */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Choose your interview track</h2>
          <div role="tablist" className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
            {KINDS.map((k) => (
              <button key={k.id} role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${kind === k.id ? "bg-slate-900 text-white dark:bg-cyan-400 dark:text-slate-950" : "text-slate-600 hover:text-slate-900 dark:text-white/55 dark:hover:text-white"}`}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {domains.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-white/15 dark:text-white/45">
            No domain matches "{query}". Try SQL, OOP, cloud or security.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((d) => {
              const Icon = d.icon;
              const isActive = d.live && d.id === selected;
              return (
                <button key={d.id} onClick={() => pick(d)} disabled={!d.live}
                  className={`group relative overflow-hidden rounded-3xl border text-left transition focus-visible:outline-2 focus-visible:outline-cyan-400 ${d.live ? "hover:-translate-y-1 hover:shadow-2xl" : "cursor-not-allowed"} ${isActive ? "border-cyan-400 ring-2 ring-cyan-400/40" : "border-slate-200 dark:border-white/10"} bg-white dark:bg-white/[0.035]`}>
                  <div className={`relative h-40 bg-gradient-to-br ${d.accent}`}>
                    <img src={d.img} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")}
                      className={`absolute inset-0 h-full w-full object-cover ${d.live ? "" : "grayscale"}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-slate-900 shadow">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${d.live ? "bg-emerald-400 text-emerald-950" : "bg-white/85 text-slate-700"}`}>
                      {d.live ? "Live" : <><Clock className="h-3 w-3" /> Coming soon</>}
                    </span>
                    <h3 className="absolute bottom-3 left-4 text-xl font-bold text-white">{d.name}</h3>
                  </div>
                  <div className={`p-5 ${d.live ? "" : "opacity-60"}`}>
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/55">{d.blurb}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {d.topics.map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/8 dark:text-white/60">{t}</span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm font-bold text-cyan-700 dark:text-cyan-300">
                      {d.live ? <>{d.qs.length} questions <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></> : <span className="text-slate-400 dark:text-white/35">Launching soon</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Q&A */}
      <section id="qa" className="scroll-mt-24 border-t border-slate-200 bg-slate-50 py-14 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">{active.kind === "hr" ? "HR interview" : "Technical interview"}</p>
              <h2 className="mt-1 text-3xl font-black">{active.name} questions</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => { setLevel(l); setOpen(0); setShown(PAGE); }} aria-pressed={level === l}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${level === l ? "border-slate-900 bg-slate-900 text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-transparent dark:text-white/60"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {questions.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/15 dark:text-white/45">
                No {level !== "All" ? level.toLowerCase() : ""} questions found here. Try another level or clear the search.
              </p>
            )}
            {questions.slice(0, shown).map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0a1024]">
                  <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 p-5 text-left">
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${levelStyle[item.level]}`}>{item.level}</span>
                    <span className="flex-1 font-semibold">{item.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 dark:border-white/10">
                      <p className="max-w-[70ch] text-[15px] leading-7 text-slate-600 dark:text-white/65">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {questions.length > shown && (
            <button onClick={() => setShown((n) => n + PAGE)}
              className="mx-auto mt-6 block rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold hover:border-cyan-400 dark:border-white/15 dark:bg-transparent">
              Show more ({questions.length - shown} remaining)
            </button>
          )}

          <Link to="/preparation/study-material"
            className="mt-10 flex items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-violet-500/20 dark:ring-1 dark:ring-white/10">
            <div className="flex items-center gap-4">
              <ClipboardCheck className="h-8 w-8 text-cyan-300" />
              <div>
                <p className="font-bold">Need deeper preparation?</p>
                <p className="text-sm text-white/60">Open the study material for full notes and practice plans.</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        </div>
      </section>
    </main>
  );
}