import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BookOpen, Clock, FileText, FlaskConical, Map, Search, Sparkles, X,
} from "lucide-react";
import { DEEP } from "../routes/study-deep"
import { DETAILED, EXTRA_LIVE, type Content, type Kind, type Page, type Resource } from "../routes/study-content";

export const Route = createFileRoute("/preparation/study-material")({
  component: StudyMaterialPage,
});

const TYPES: { id: Kind; label: string; icon: typeof FileText; chip: string; bar: string; blurb: string }[] = [
  { id: "notes", label: "Notes", icon: FileText, blurb: "Concept notes in simple language", chip: "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300", bar: "from-cyan-400 to-sky-500" },
  { id: "cheat", label: "Cheat Sheets", icon: BookOpen, blurb: "One-page revision before interviews", chip: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300", bar: "from-violet-400 to-fuchsia-500" },
  { id: "roadmap", label: "Roadmaps", icon: Map, blurb: "Step-by-step plans from zero to job-ready", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300", bar: "from-emerald-400 to-teal-500" },
  { id: "project", label: "Project Ideas", icon: FlaskConical, blurb: "Portfolio projects recruiters like to see", chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300", bar: "from-amber-400 to-orange-500" },
];

const DOMAINS = ["All", "Software Development", "Data Analyst", "Data Science", "Cyber Security", "Cloud", "DevOps", "QA & Testing", "Business Analyst", "HR & Career"];

const BASE_LIVE: Resource[] = [
  {
    id: "rm-analyst", type: "roadmap", domain: "Data Analyst", title: "Data Analyst Roadmap", level: "Beginner", time: "4-5 months",
    desc: "From Excel and SQL to dashboards and a job-ready portfolio.",
    content: { kind: "steps", items: [
      ["Excel and statistics basics", "Formulas, pivot tables, charts, mean, median, standard deviation.", "2-3 weeks"],
      ["SQL", "SELECT, joins, GROUP BY, subqueries, CTEs and window functions.", "4 weeks"],
      ["Python with pandas", "Cleaning, filtering, merging and exploring datasets.", "3-4 weeks"],
      ["Visualisation", "Build dashboards in Power BI or Tableau and learn to tell a story with data.", "3 weeks"],
      ["Portfolio projects", "Complete 3 projects with real datasets and publish them on GitHub.", "4 weeks"],
      ["Interview preparation", "Practise SQL problems, case studies and HR questions.", "2 weeks"],
    ] },
  },
  {
    id: "rm-software", type: "roadmap", domain: "Software Development", title: "Software Developer Roadmap", level: "Beginner", time: "6-8 months",
    desc: "Fundamentals, DSA, backend or frontend, and system design basics.",
    content: { kind: "steps", items: [
      ["Pick one language", "Learn Python, Java or JavaScript properly: syntax, functions, error handling.", "4 weeks"],
      ["Data structures and algorithms", "Arrays, strings, hash maps, stacks, queues, trees, sorting and searching.", "8 weeks"],
      ["OOP and Git", "Four pillars of OOP, SOLID basics, branching and pull requests.", "2 weeks"],
      ["Databases", "SQL, normalisation, indexes and one NoSQL database.", "3 weeks"],
      ["Build with a framework", "REST APIs with Node, Spring or Django, or a frontend with React.", "6 weeks"],
      ["System design and projects", "Caching, load balancing, queues. Deploy two full projects.", "4 weeks"],
    ] },
  },
  {
    id: "rm-cyber", type: "roadmap", domain: "Cyber Security", title: "Cyber Security Roadmap", level: "Beginner", time: "6-8 months",
    desc: "Networking, Linux, web security, tools, labs and certifications.",
    content: { kind: "steps", items: [
      ["Networking and Linux", "TCP/IP, DNS, HTTP, ports, plus the Linux command line.", "4 weeks"],
      ["Security fundamentals", "CIA triad, cryptography, authentication and common attack types.", "3 weeks"],
      ["Web application security", "OWASP Top 10: injection, XSS, CSRF, broken access control.", "4 weeks"],
      ["Core tools", "Nmap, Wireshark, Burp Suite and a SIEM such as Splunk.", "4 weeks"],
      ["Hands-on labs", "Practise on TryHackMe, Hack The Box and beginner CTFs.", "8 weeks"],
      ["Certification", "Prepare for Security+ first, then CEH or an analyst-level certificate.", "6 weeks"],
    ] },
  },
  {
    id: "cs-sql", type: "cheat", domain: "Data Analyst", title: "SQL Cheat Sheet", level: "Beginner", time: "5 min read",
    desc: "The queries asked most often in analyst interviews.",
    content: { kind: "table", head: ["Task", "Syntax"], rows: [
      ["Filter rows", "SELECT * FROM t WHERE amount > 100;"],
      ["Aggregate by group", "SELECT city, COUNT(*) FROM t GROUP BY city;"],
      ["Filter groups", "... GROUP BY city HAVING COUNT(*) > 5;"],
      ["Inner join", "FROM a JOIN b ON a.id = b.a_id"],
      ["Left join", "FROM a LEFT JOIN b ON a.id = b.a_id"],
      ["Top N rows", "ORDER BY sales DESC LIMIT 5;"],
      ["Rank within group", "RANK() OVER (PARTITION BY dept ORDER BY pay DESC)"],
      ["Running total", "SUM(x) OVER (ORDER BY date)"],
      ["Handle nulls", "COALESCE(col, 0)"],
      ["Reusable subquery", "WITH s AS (SELECT ...) SELECT * FROM s;"],
    ] },
  },
  {
    id: "cs-git", type: "cheat", domain: "Software Development", title: "Git Cheat Sheet", level: "Beginner", time: "4 min read",
    desc: "Everyday Git commands every developer should know.",
    content: { kind: "table", head: ["Task", "Command"], rows: [
      ["Start a repository", "git init"],
      ["Copy a repository", "git clone <url>"],
      ["See changes", "git status"],
      ["Stage all changes", "git add ."],
      ["Save a snapshot", "git commit -m \"message\""],
      ["Create and switch branch", "git switch -c feature-name"],
      ["Merge a branch", "git merge feature-name"],
      ["Get and send updates", "git pull / git push"],
      ["Compact history", "git log --oneline"],
      ["Park work temporarily", "git stash / git stash pop"],
    ] },
  },
  {
    id: "nt-oop", type: "notes", domain: "Software Development", title: "OOP Concepts Notes", level: "Beginner", time: "8 min read",
    desc: "Classes, objects and the four pillars with interview-ready examples.",
    content: { kind: "points", items: [
      "A class is a blueprint; an object is an instance created from it.",
      "Encapsulation: keep data private and expose it through methods.",
      "Abstraction: show what an object does, hide how it does it.",
      "Inheritance: a child class reuses and extends a parent class.",
      "Polymorphism: the same method call behaves differently per object type (overloading and overriding).",
      "Prefer composition over inheritance when classes do not have a clear 'is-a' relation.",
      "Interview tip: always explain each pillar with a real-life example such as Vehicle, Car and Bike.",
    ] },
  },
  {
    id: "nt-network", type: "notes", domain: "Cyber Security", title: "Networking Basics Notes", level: "Beginner", time: "10 min read",
    desc: "OSI model, TCP vs UDP, DNS and HTTPS in plain language.",
    content: { kind: "points", items: [
      "OSI has 7 layers: Physical, Data link, Network, Transport, Session, Presentation, Application.",
      "TCP is reliable and ordered (web, email). UDP is faster but unreliable (video calls, gaming).",
      "An IP address identifies a device; a port identifies a service on that device (HTTP 80, HTTPS 443, SSH 22).",
      "DNS converts domain names such as example.com into IP addresses.",
      "HTTPS is HTTP protected by TLS, which provides encryption and server identity.",
      "A firewall allows or blocks traffic using rules; a VPN encrypts traffic across untrusted networks.",
    ] },
  },
  {
    id: "pj-analyst", type: "project", domain: "Data Analyst", title: "5 Data Analyst Portfolio Projects", level: "Intermediate", time: "Project ideas",
    desc: "Real-world projects to show on your resume and GitHub.",
    content: { kind: "points", items: [
      "Sales dashboard in Power BI: revenue, profit and region trends with filters.",
      "Customer churn analysis: find why users leave, using SQL and Python.",
      "E-commerce funnel analysis: view to cart to purchase drop-off by channel.",
      "HR attrition analysis: which factors predict employees leaving.",
      "Exploratory analysis of a public dataset (Netflix, IPL or Airbnb) with a written story of insights.",
    ] },
  },
];

const withSections = (r: Resource): Resource =>
  r.sections ? r : { ...r, sections: r.content ? [{ title: "Overview", content: r.content }] : undefined };
const LIVE: Resource[] = [...BASE_LIVE.map((r) => ({ ...r, ...(DETAILED[r.id] ?? {}) })), ...EXTRA_LIVE]
  .map((r) => ({ ...r, ...(DEEP[r.id] ?? {}) }))
  .map(withSections);

const soon = (type: Kind, domain: string, title: string, desc: string): Resource =>
  ({ id: `${type}-${title}`, type, domain, title, desc, level: "Beginner", time: "Coming soon" });

const SOON: Resource[] = [
  soon("roadmap", "Data Science", "Data Science Roadmap", "Maths, Python, machine learning and deployment."),
  soon("roadmap", "Cloud", "Cloud Engineer Roadmap", "AWS, Azure and GCP from fundamentals to certification."),
  soon("roadmap", "DevOps", "DevOps Roadmap", "Linux, CI/CD, Docker, Kubernetes and Terraform."),
  soon("roadmap", "QA & Testing", "QA Engineer Roadmap", "Manual testing, Selenium and API automation."),
  soon("roadmap", "Business Analyst", "Business Analyst Roadmap", "Requirements, Agile, UML and stakeholder skills."),
  soon("cheat", "Data Science", "Python and pandas Cheat Sheet", "Most used pandas operations on one page."),
  soon("cheat", "DevOps", "Docker and Kubernetes Cheat Sheet", "Everyday commands and concepts."),
  soon("cheat", "Cloud", "AWS Services Cheat Sheet", "Core services explained in one line each."),
  soon("cheat", "Cyber Security", "Linux and Nmap Cheat Sheet", "Commands for security beginners."),
  soon("notes", "Data Science", "Machine Learning Notes", "Algorithms and evaluation metrics simplified."),
  soon("notes", "Data Analyst", "Statistics for Analysts", "Probability, hypothesis testing and A/B tests."),
  soon("notes", "Cloud", "Cloud Computing Notes", "IaaS, PaaS, SaaS, networking and security."),
  soon("notes", "QA & Testing", "Software Testing Notes", "Test design, bug life cycle and automation basics."),
  soon("project", "Software Development", "Full-stack Project Ideas", "Apps to build for your developer portfolio."),
  soon("project", "Cyber Security", "Home Lab Project Ideas", "Set up a safe lab and document your findings."),
  soon("notes", "HR & Career", "Resume and LinkedIn Guide", "ATS-friendly resume and profile tips."),
  soon("cheat", "HR & Career", "HR Answers Cheat Sheet", "Ready structures for common HR questions."),
];

const ALL = [...LIVE, ...SOON];
const typeOf = (k: Kind) => TYPES.find((t) => t.id === k)!;

function StudyMaterialPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | Kind>("all");
  const [domain, setDomain] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => ALL.filter((r) =>
      (type === "all" || r.type === type) && (domain === "All" || r.domain === domain) &&
      (!q || `${r.title} ${r.desc} ${r.domain}`.toLowerCase().includes(q))),
    [q, type, domain],
  );
  const open = LIVE.find((r) => r.id === openId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="pointer-events-none absolute left-10 top-32 h-72 w-72 rounded-full bg-[#00e5ff]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> Study Material
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Learn. Revise. Move faster.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55 sm:text-lg">
            Notes, cheat sheets, roadmaps and project ideas for every domain. New material is added every week.
          </p>

          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/60 focus-within:ring-2 focus-within:ring-violet-400 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search study material"
              placeholder="Search SQL, Git, roadmap, cloud…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-white/35 sm:text-base" />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const live = LIVE.filter((r) => r.type === t.id).length;
              const total = ALL.filter((r) => r.type === t.id).length;
              const on = type === t.id;
              return (
                <button key={t.id} onClick={() => setType(on ? "all" : t.id)} aria-pressed={on}
                  className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${on ? "border-violet-400 ring-2 ring-violet-400/30" : "border-slate-200 dark:border-white/10"} bg-white dark:bg-white/[0.035]`}>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${t.chip}`}><Icon className="h-5 w-5" /></span>
                  <p className="mt-3 font-bold">{t.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{t.blurb}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-white/60">{live} live of {total}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-6 flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <button key={d} onClick={() => setDomain(d)} aria-pressed={domain === d}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${domain === d ? "border-slate-900 bg-slate-900 text-white dark:border-violet-400 dark:bg-violet-400 dark:text-slate-950" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
              {d}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-white/15 dark:text-white/45">
            Nothing found for this filter yet. Try another domain or clear the search.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const t = typeOf(r.type); const Icon = t.icon; const live = !!r.sections;
              return (
                <article key={r.id} className={`flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035] ${live ? "transition hover:-translate-y-1 hover:shadow-2xl" : ""}`}>
                  <div className={`h-1.5 bg-gradient-to-r ${t.bar} ${live ? "" : "opacity-40"}`} />
                  <div className={`flex flex-1 flex-col p-6 ${live ? "" : "opacity-70"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${t.chip}`}><Icon className="h-3.5 w-3.5" />{t.label.replace(/s$/, "")}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${live ? "bg-emerald-400 text-emerald-950" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50"}`}>{live ? "Live" : "Coming soon"}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{r.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-white/45">{r.desc}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-slate-500 dark:text-white/45">
                      <span>{r.domain}</span>
                      {live && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.time}</span>}
                    </div>
                    <button type="button" disabled={!live} onClick={() => { setOpenId(r.id); setTab(0); }}
                      className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${live ? "bg-slate-900 text-white hover:bg-slate-700 dark:bg-violet-400 dark:text-slate-950 dark:hover:bg-violet-300" : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/35"}`}>
                      {live ? <>Open <ArrowRight className="h-4 w-4" /></> : "Notify me later"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Link to="/preparation/interview" className="mt-12 flex items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-violet-500/20 dark:ring-1 dark:ring-white/10">
          <div>
            <p className="font-bold">Ready to practise?</p>
            <p className="text-sm text-white/60">Try interview questions with answers, sorted by domain and level.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0" />
        </Link>
      </section>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#0a1024] sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{typeOf(open.type).label} · {open.domain}</p>
                <h2 className="mt-1 text-2xl font-black">{open.title}</h2>
              </div>
              <button onClick={() => setOpenId(null)} aria-label="Close" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            {open.sections && open.sections.length > 1 && (
              <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto pb-1">
                {open.sections.map((s, i) => (
                  <button key={s.title} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                    className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === i ? "border-violet-500 bg-violet-500 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-6">{open.sections && <Body key={`${open.id}-${tab}`} c={open.sections[Math.min(tab, open.sections.length - 1)].content} />}</div>
          </div>
        </div>
      )}
    </main>
  );
}

const chip = "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-white/65";

function Body({ c }: { c: Content }) {
  if (c.kind === "steps")
    return (
      <ol className="space-y-5 border-l-2 border-slate-200 pl-6 dark:border-white/10">
        {c.items.map(([title, detail, dur], i) => (
          <li key={title} className="relative">
            <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">{i + 1}</span>
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-bold">{title}</h3><span className="text-xs font-semibold text-slate-500 dark:text-white/45">{dur}</span></div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/60">{detail}</p>
          </li>
        ))}
      </ol>
    );
  if (c.kind === "table")
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-white/5"><tr>{c.head.map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr></thead>
          <tbody>{c.rows.map(([a, b]) => (
            <tr key={a} className="border-t border-slate-100 dark:border-white/10">
              <td className="px-4 py-3 font-medium">{a}</td>
              <td className="px-4 py-3 font-mono text-xs text-violet-700 dark:text-violet-300">{b}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  if (c.kind === "points")
    return (
      <ul className="space-y-3">
        {c.items.map((p) => (
          <li key={p} className="flex gap-3 text-[15px] leading-7 text-slate-600 dark:text-white/65">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{p}
          </li>
        ))}
      </ul>
    );
  if (c.kind === "pages") return <Pages items={c.items} />;
  if (c.kind === "roadmap")
    return (
      <ol className="space-y-6 border-l-2 border-slate-200 pl-7 dark:border-white/10">
        {c.items.map((ph, i) => (
          <li key={ph.title} className="relative">
            <span className="absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">{i + 1}</span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{ph.title}</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{ph.time}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{ph.topics.map((t) => <span key={t} className={chip}>{t}</span>)}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60"><b className="text-slate-900 dark:text-white">Practice:</b> {ph.practice}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-white/60"><b className="text-slate-900 dark:text-white">Goal:</b> {ph.goal}</p>
          </li>
        ))}
      </ol>
    );
  return (
    <div className="space-y-5">
      {c.items.map((p) => (
        <div key={p.name} className="rounded-2xl border border-slate-200 p-5 dark:border-white/10">
          <h3 className="text-lg font-bold">{p.name}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-white/60">{p.about}</p>
          <p className="mt-4 text-xs font-bold text-slate-500 dark:text-white/45">Tools used</p>
          <div className="mt-2 flex flex-wrap gap-2">{p.tools.map((t) => <span key={t} className={chip}>{t}</span>)}</div>
          <p className="mt-4 text-xs font-bold text-slate-500 dark:text-white/45">How to build</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-slate-600 dark:text-white/65">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="mt-4 text-sm font-semibold text-violet-700 dark:text-violet-300">{p.outcome}</p>
        </div>
      ))}
    </div>
  );
}

function Pages({ items }: { items: Page[] }) {
  const [i, setI] = useState(0);
  const page = items[i];
  const go = (n: number) => setI(Math.max(0, Math.min(items.length - 1, n)));
  return (
    <div className="grid gap-6 sm:grid-cols-[190px_1fr]">
      <nav aria-label="Pages" className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {items.map((it, n) => (
          <button key={it.title} onClick={() => setI(n)} aria-current={n === i}
            className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${n === i ? "bg-violet-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10"}`}>
            {it.title}
          </button>
        ))}
      </nav>
      <div className="min-w-0">
        <h3 className="text-xl font-black">{page.title.replace(/^\d+\.\s*/, "")}</h3>
        <div className="mt-4 space-y-4">
          {page.blocks.map((b, k) => {
            if (b.t === "p") return <p key={k} className="text-[15px] leading-7 text-slate-600 dark:text-white/65">{b.text}</p>;
            if (b.t === "h") return <h4 key={k} className="pt-2 text-sm font-bold">{b.text}</h4>;
            if (b.t === "code") return <pre key={k} className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-6 text-cyan-100 dark:bg-black/40"><code>{b.text}</code></pre>;
            if (b.t === "tip") return <p key={k} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"><b>Tip:</b> {b.text}</p>;
            return (
              <ul key={k} className="space-y-2">
                {b.items.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-7 text-slate-600 dark:text-white/65">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{x}
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-white dark:hover:bg-white/10">Previous</button>
          <span className="text-xs text-slate-500 dark:text-white/45">{i + 1} of {items.length}</span>
          <button onClick={() => go(i + 1)} disabled={i === items.length - 1} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-30 dark:bg-violet-400 dark:text-slate-950">Next</button>
        </div>
      </div>
    </div>
  );
}