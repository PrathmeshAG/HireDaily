import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight, Bot, Briefcase, Clock, ExternalLink, GraduationCap, Mic, Search, Sparkles, Wallet, FileText, Zap, X,
} from "lucide-react";

export const Route = createFileRoute("/preparation/tools-resources")({
  component: ToolsResourcesPage,
});

type Tool = { name: string; desc: string; url: string; tag: "Free" | "Freemium" };
type Tab = { title: string; tip: string; tools: Tool[] };
type Collection = {
  id: string; title: string; desc: string; icon: typeof Mic; grad: string; chip: string; tabs: Tab[];
};

const t = (name: string, tag: Tool["tag"], url: string, desc: string): Tool => ({ name, tag, url, desc });

const COLLECTIONS: Collection[] = [
  {
    id: "interview", title: "Interview Resources", icon: Mic, grad: "from-cyan-500 to-sky-600",
    chip: "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300",
    desc: "Practice platforms for coding, SQL, security labs and mock interviews.",
    tabs: [
      { title: "Coding practice", tip: "Solve 2-3 problems a day by topic, and re-solve the ones you failed after a week.", tools: [
        t("LeetCode", "Freemium", "https://leetcode.com", "Coding problems sorted by topic and company tags."),
        t("HackerRank", "Freemium", "https://www.hackerrank.com", "Practice tracks and skill tests similar to recruiter assessments."),
        t("GeeksforGeeks", "Free", "https://www.geeksforgeeks.org", "Concept articles, interview experiences and company-wise questions."),
        t("NeetCode", "Free", "https://neetcode.io", "Curated problem lists with clear video explanations."),
      ] },
      { title: "SQL practice", tip: "Practise window functions and joins the most. They appear in nearly every analyst test.", tools: [
        t("DataLemur", "Freemium", "https://datalemur.com", "SQL interview questions based on real company problems."),
        t("StrataScratch", "Freemium", "https://www.stratascratch.com", "Analytics and data science interview questions with a live editor."),
        t("SQLBolt", "Free", "https://sqlbolt.com", "Short interactive lessons that teach SQL step by step."),
        t("SQLZoo", "Free", "https://sqlzoo.net", "Browser-based SQL exercises from basic to advanced."),
      ] },
      { title: "Security labs", tip: "Write a short report for each lab you finish. Recruiters love public write-ups.", tools: [
        t("TryHackMe", "Freemium", "https://tryhackme.com", "Guided, beginner-friendly security rooms in the browser."),
        t("Hack The Box", "Freemium", "https://www.hackthebox.com", "Realistic machines and challenges for growing skills."),
        t("PortSwigger Web Security Academy", "Free", "https://portswigger.net/web-security", "Free labs for every major web vulnerability."),
        t("OverTheWire", "Free", "https://overthewire.org", "Wargames that teach Linux and security basics."),
      ] },
      { title: "Mock interviews", tip: "Record yourself answering. Watching it once shows more than ten silent practice runs.", tools: [
        t("Interview Warmup by Google", "Free", "https://grow.google/certificates/interview-warmup", "Practise common questions and get feedback on your answers."),
        t("interviewing.io", "Freemium", "https://interviewing.io", "Anonymous mock interviews with experienced engineers."),
        t("Glassdoor", "Free", "https://www.glassdoor.com", "Company reviews and real interview questions."),
      ] },
    ],
  },
  {
    id: "learning", title: "Learning Platforms", icon: GraduationCap, grad: "from-violet-500 to-fuchsia-600",
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
    desc: "Free courses, official docs, roadmaps and datasets to learn properly.",
    tabs: [
      { title: "Courses", tip: "Finish one course fully before starting another, and build something after each.", tools: [
        t("freeCodeCamp", "Free", "https://www.freecodecamp.org", "Full free curriculum with projects and certificates."),
        t("CS50 by Harvard", "Free", "https://cs50.harvard.edu", "Introductory computer science course known for its quality."),
        t("Coursera", "Freemium", "https://www.coursera.org", "University and industry courses, many can be audited."),
        t("Khan Academy", "Free", "https://www.khanacademy.org", "Statistics, probability and maths from basics."),
      ] },
      { title: "Roadmaps and docs", tip: "Official docs are the most reliable source. Get used to reading them early.", tools: [
        t("roadmap.sh", "Free", "https://roadmap.sh", "Visual learning paths for developer, DevOps and security roles."),
        t("Microsoft Learn", "Free", "https://learn.microsoft.com/training", "Free learning paths for Power BI, SQL and Azure."),
        t("MDN Web Docs", "Free", "https://developer.mozilla.org", "The reference for HTML, CSS and JavaScript."),
        t("AWS Skill Builder", "Freemium", "https://skillbuilder.aws", "Cloud learning paths and exam preparation."),
      ] },
      { title: "Datasets and projects", tip: "Pick a dataset you care about. Your curiosity shows in the final project.", tools: [
        t("Kaggle", "Free", "https://www.kaggle.com", "Datasets, notebooks and short courses on data and ML."),
        t("GitHub", "Free", "https://github.com", "Host projects and read other people's code."),
        t("Google Dataset Search", "Free", "https://datasetsearch.research.google.com", "Find public datasets across the web."),
        t("Open Government Data India", "Free", "https://data.gov.in", "Public datasets from Indian government bodies."),
      ] },
    ],
  },
  {
    id: "career", title: "Career and Job Search", icon: Briefcase, grad: "from-emerald-500 to-teal-600",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    desc: "Job portals, resume builders and profile tools to get noticed.",
    tabs: [
      { title: "Job portals", tip: "Apply within the first few days of a posting and tailor the top of your resume for each role.", tools: [
        t("LinkedIn Jobs", "Freemium", "https://www.linkedin.com/jobs", "Large job board with easy apply and recruiter messages."),
        t("Naukri", "Freemium", "https://www.naukri.com", "Popular Indian job portal across all experience levels."),
        t("Indeed", "Free", "https://www.indeed.com", "Search jobs by role, company and location."),
        t("Wellfound", "Free", "https://wellfound.com", "Startup jobs with direct access to founders."),
      ] },
      { title: "Resume tools", tip: "Keep it to one page for under 5 years of experience. Lead each bullet with an action and a result.", tools: [
        t("Canva Resumes", "Freemium", "https://www.canva.com/resumes", "Clean visual templates that are easy to customise."),
        t("Overleaf", "Freemium", "https://www.overleaf.com", "LaTeX templates for crisp, ATS-friendly resumes."),
        t("Jobscan", "Freemium", "https://www.jobscan.co", "Compare your resume with a job description."),
      ] },
      { title: "Profile and visibility", tip: "A complete profile with a clear headline and two pinned projects beats a long profile with no proof.", tools: [
        t("LinkedIn", "Freemium", "https://www.linkedin.com", "Professional profile, networking and recruiter discovery."),
        t("GitHub Profile", "Free", "https://docs.github.com/account-and-profile/setting-up-and-managing-your-github-profile", "Guide to build a profile README and pin projects."),
        t("DEV Community", "Free", "https://dev.to", "Write and share what you learn to build a public record."),
      ] },
    ],
  },
  {
    id: "productivity", title: "Productivity Tools", icon: Zap, grad: "from-amber-500 to-orange-600",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    desc: "Planning, revision and developer tools that make daily preparation easier.",
    tabs: [
      { title: "Planning and notes", tip: "Plan the week on Sunday: 3 study blocks, 2 practice blocks and 1 application block.", tools: [
        t("Notion", "Freemium", "https://www.notion.so", "Notes, trackers and study plans in one workspace."),
        t("Trello", "Freemium", "https://trello.com", "Kanban boards to track job applications."),
        t("Obsidian", "Free", "https://obsidian.md", "Linked notes stored locally on your device."),
        t("Google Calendar", "Free", "https://calendar.google.com", "Time-block study sessions and interview dates."),
      ] },
      { title: "Study and focus", tip: "Use spaced repetition for definitions and a Pomodoro timer for hard topics.", tools: [
        t("Anki", "Free", "https://apps.ankiweb.net", "Spaced-repetition flashcards for long-term memory."),
        t("Pomofocus", "Free", "https://pomofocus.io", "Simple Pomodoro timer with task list."),
        t("Excalidraw", "Free", "https://excalidraw.com", "Quick hand-drawn diagrams for system design practice."),
      ] },
      { title: "Code and portfolio", tip: "Deploy every project. A live link is far stronger than a zip file.", tools: [
        t("Visual Studio Code", "Free", "https://code.visualstudio.com", "Popular code editor with extensions for every language."),
        t("GitHub Pages", "Free", "https://pages.github.com", "Host a portfolio site straight from a repository."),
        t("Vercel", "Freemium", "https://vercel.com", "Deploy web apps in minutes with a free hobby plan."),
        t("Postman", "Freemium", "https://www.postman.com", "Test and document APIs."),
      ] },
    ],
  },
];

const SOON = [
  { title: "Resume and Cover Letter Templates", desc: "ATS-friendly templates for freshers and experienced candidates.", icon: FileText },
  { title: "Salary and Negotiation Guides", desc: "Market ranges, offer comparison and negotiation scripts.", icon: Wallet },
  { title: "AI Tools for Careers", desc: "Practical AI tools for resumes, practice and research.", icon: Bot },
  { title: "Company-wise Prep Kits", desc: "Process, rounds and sample questions for popular employers.", icon: Briefcase },
];

function ToolsResourcesPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const q = query.trim().toLowerCase();
  const list = useMemo(() => COLLECTIONS.filter((c) =>
    (cat === "all" || c.id === cat) &&
    (!q || `${c.title} ${c.desc} ${c.tabs.map((x) => x.title + x.tools.map((y) => y.name + y.desc).join(" ")).join(" ")}`.toLowerCase().includes(q))), [q, cat]);
  const open = COLLECTIONS.find((c) => c.id === openId) ?? null;
  const toolCount = COLLECTIONS.reduce((n, c) => n + c.tabs.reduce((m, x) => m + x.tools.length, 0), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const show = (id: string) => { setOpenId(id); setTab(0); };
  const active = open?.tabs[Math.min(tab, open.tabs.length - 1)];

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-[#050816] dark:text-white">
      <section className="relative overflow-hidden pt-32 pb-12">
        <div className="pointer-events-none absolute left-1/3 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-[#7c3aed]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> Tools & Resources
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Your career toolkit.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-white/55 sm:text-lg">
            Hand-picked platforms for practice, learning, job search and productivity, each with a tip on how to use it well.
          </p>

          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/60 focus-within:ring-2 focus-within:ring-emerald-400 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tools and resources"
              placeholder="Search LeetCode, resume, SQL, Notion…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-white/35 sm:text-base" />
          </div>

          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-4">
            {[[`${toolCount}`, "Curated tools"], [`${COLLECTIONS.length}`, "Live collections"], [`${SOON.length}`, "Coming soon"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <dt className="text-2xl font-black">{v}</dt><dd className="mt-1 text-xs text-slate-500 dark:text-white/45">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-6 flex flex-wrap gap-2">
          {[{ id: "all", title: "All" }, ...COLLECTIONS].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${cat === c.id ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
              {c.title}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-white/15 dark:text-white/45">
            No tools match "{query}". Try SQL, resume, notes or practice.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {list.map((c) => {
              const Icon = c.icon; const count = c.tabs.reduce((n, x) => n + x.tools.length, 0);
              return (
                <article key={c.id} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/[0.035]">
                  <div className={`flex items-center justify-between bg-gradient-to-br ${c.grad} p-6 text-white`}>
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><Icon className="h-6 w-6" /></span>
                      <h2 className="text-xl font-bold">{c.title}</h2>
                    </div>
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-emerald-700">Live</span>
                  </div>
                  <div className="p-6">
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/55">{c.desc}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {c.tabs.map((x) => <span key={x.title} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.chip}`}>{x.title}</span>)}
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-500 dark:text-white/45">{count} tools</span>
                      <button onClick={() => show(c.id)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300">
                        Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {cat === "all" && !q && (
          <>
            <h2 className="mb-5 mt-14 text-2xl font-bold">Coming soon</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SOON.map(({ title, desc, icon: Icon }) => (
                <div key={title} className="rounded-3xl border border-dashed border-slate-300 p-6 opacity-80 dark:border-white/15">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/55"><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/45">{desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-white/45"><Clock className="h-3.5 w-3.5" /> Coming soon</span>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="mt-10 text-xs text-slate-500 dark:text-white/40">Links open third-party websites. Plans and pricing may change, so check each site for the latest details.</p>
      </section>

      {open && active && (
        <div role="dialog" aria-modal="true" aria-label={open.title} onClick={() => setOpenId(null)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6">
          <div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-[#0a1024] sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Collection</p>
                <h2 className="mt-1 text-2xl font-black">{open.title}</h2>
              </div>
              <button onClick={() => setOpenId(null)} aria-label="Close" className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>

            <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {open.tabs.map((x, i) => (
                <button key={x.title} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${tab === i ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400 dark:border-white/10 dark:text-white/60"}`}>
                  {x.title}
                </button>
              ))}
            </div>

            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"><b>How to use:</b> {active.tip}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {active.tools.map((tool) => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer"
                  className="group/tool flex flex-col rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold">{tool.name}</h3>
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition group-hover/tool:text-emerald-500" />
                  </div>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-white/55">{tool.desc}</p>
                  <span className={`mt-4 w-fit rounded-full px-2.5 py-1 text-xs font-bold ${tool.tag === "Free" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60"}`}>{tool.tag}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}