// src/lib/job-parse.ts
// Pure helpers: job ka raw text padh ke form fields guess karta hai.
// Koi API / backend nahi. Sab guesses editable rehte hain.

export const CATEGORIES = ["Software Development", "Data Analytics", "Data Science", "Cybersecurity", "Cloud & DevOps", "AI / ML", "Business Analyst", "QA / Testing", "UI / UX", "Data Engineer", "IT Support", "Other"];
export const LOCATIONS = ["Pune", "Bengaluru", "Hyderabad", "Chennai", "Mumbai", "Navi Mumbai", "Noida", "Gurugram", "Kolkata", "Ahmedabad", "Remote", "PAN India"];
export const EXPERIENCES = ["Fresher", "Entry Level", "Experienced", "Internship / Student", "1-2 Years", "2-5 Years", "5+ Years"];
export const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract", "Remote", "Hybrid"];

export type ParsedJob = Partial<{
  companyName: string;
  role: string;
  salary: string;
  category: string;
  location: string;
  experience: string;
  skills: string;
  jobType: string;
  applyLink: string;
  lastDate: string;
}>;

/* ---------- skills ---------- */

// [canonical name, regex source]. Single-letter skills (C, R) jaan-boojh ke nahi hain.
const SKILLS: [string, string][] = [
  ["SQL", "\\bsql\\b|\\bmysql\\b|\\bpostgres(?:ql)?\\b|\\bt-sql\\b"],
  ["Python", "\\bpython\\b"],
  ["Excel", "\\b(?:ms|microsoft|advanced)\\s+excel\\b|\\bexcel\\b(?=\\s*(?:[,/|;)]|$))|\\bvlookup\\b|\\bpivot tables?\\b"],
  ["Power BI", "\\bpower\\s?bi\\b"],
  ["Tableau", "\\btableau\\b"],
  ["Looker Studio", "\\blooker(?: studio)?\\b"],
  ["Pandas", "\\bpandas\\b"],
  ["NumPy", "\\bnumpy\\b"],
  ["Statistics", "\\bstatistic(?:s|al)\\b"],
  ["ETL", "\\betl\\b"],
  ["Data Visualization", "\\bdata visuali[sz]ation\\b"],
  ["Machine Learning", "\\bmachine learning\\b|\\bml\\b"],
  ["Deep Learning", "\\bdeep learning\\b"],
  ["NLP", "\\bnlp\\b"],
  ["Generative AI", "\\bgen(?:erative)? ?ai\\b|\\bllm\\b"],
  ["TensorFlow", "\\btensorflow\\b"],
  ["PyTorch", "\\bpytorch\\b"],
  ["Spark", "\\bpyspark\\b|\\bapache spark\\b|\\bspark\\b(?=\\s*(?:[,/|;)]|$))"],
  ["Hadoop", "\\bhadoop\\b"],
  ["Airflow", "\\bairflow\\b"],
  ["Flutter", "\\bflutter\\b"],
  ["Dart", "\\bdart\\b"],
  ["Firebase", "\\bfirebase\\b"],
  ["Android", "\\bandroid\\b"],
  ["iOS", "\\bios\\b"],
  ["Kotlin", "\\bkotlin\\b"],
  ["Java", "\\bjava\\b(?!\\s?script)"],
  ["JavaScript", "\\bjavascript\\b|\\bjs\\b"],
  ["TypeScript", "\\btypescript\\b"],
  ["React", "\\breact(?:\\.?js|\\s+native)\\b|\\breact\\b(?=\\s*(?:[,/|;)]|$))"],
  ["Node.js", "\\bnode(?:\\.?js)?\\b"],
  ["Angular", "\\bangular\\b"],
  ["HTML", "\\bhtml5?\\b"],
  ["CSS", "\\bcss3?\\b"],
  ["C++", "c\\+\\+"],
  ["C#", "c#"],
  [".NET", "\\.net\\b"],
  ["Spring Boot", "\\bspring ?boot\\b"],
  ["Django", "\\bdjango\\b"],
  ["REST API", "\\brest(?:ful)?\\s+apis?\\b|\\brestful\\b"],
  ["Git", "\\bgit(?:hub)?\\b"],
  ["Docker", "\\bdocker\\b"],
  ["Kubernetes", "\\bkubernetes\\b|\\bk8s\\b"],
  ["AWS", "\\baws\\b"],
  ["Azure", "\\bazure\\b"],
  ["GCP", "\\bgcp\\b|\\bgoogle cloud\\b"],
  ["Linux", "\\blinux\\b"],
  ["CI/CD", "\\bci\\/cd\\b"],
  ["Selenium", "\\bselenium\\b"],
  ["Manual Testing", "\\bmanual testing\\b"],
  ["Automation Testing", "\\bautomation testing\\b"],
  ["JIRA", "\\bjira\\b"],
  ["Figma", "\\bfigma\\b"],
  ["Networking", "\\bnetworking\\b"],
  ["SIEM", "\\bsiem\\b"],
  ["Communication", "\\bcommunication skills?\\b"],
  ["Problem Solving", "\\bproblem[- ]solving\\b"],
];

export function extractSkills(text: string, max = 10): string {
  const t = text.toLowerCase();
  const hits: { name: string; at: number }[] = [];
  for (const [name, src] of SKILLS) {
    const m = new RegExp(src, "im").exec(t);
    if (m) hits.push({ name, at: m.index });
  }
  // "Skills: a, b, c" jaisi line ho to usse bhi lo
  const line = /(?:key\s+)?skills?(?:\s+required)?\s*[:\-–]\s*([^\n]{3,200})/i.exec(text);
  const fromLine = line
    ? line[1].split(/[,;|/•]/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 28)
    : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...hits.sort((a, b) => a.at - b.at).map((h) => h.name), ...fromLine]) {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out.slice(0, max).join(", ");
}

/* ---------- category ---------- */

const CAT_RULES: [string, RegExp][] = [
  ["Cybersecurity", /cyber|security analyst|soc analyst|infosec|penetration|vapt/i],
  ["Data Engineer", /data engineer|etl developer|big data/i],
  ["Data Science", /data scien/i],
  ["AI / ML", /\bai\b|\bml\b|machine learning|deep learning|nlp|generative|llm/i],
  ["Data Analytics", /data analy|business intelligence|\bbi\b|power ?bi|tableau|reporting analyst|mis executive/i],
  ["Business Analyst", /business analyst|product analyst|\bba\b/i],
  ["Cloud & DevOps", /devops|cloud|sre\b|site reliability|aws|azure|kubernetes/i],
  ["QA / Testing", /\bqa\b|tester|testing|sdet/i],
  ["UI / UX", /ui\/?ux|ux designer|ui designer|product designer|figma/i],
  ["IT Support", /it support|help ?desk|service desk|system admin|technical support/i],
  ["Software Development", /developer|engineer|flutter|android|ios|full ?stack|front ?end|back ?end|programmer|sde\b|software/i],
];

export function guessCategory(roleText: string, bodyText = ""): string {
  // Pehle sirf role se (zyada reliable), na mile to poore text se
  for (const src of [roleText, `${roleText} ${bodyText}`]) {
    for (const [cat, re] of CAT_RULES) if (re.test(src)) return cat;
  }
  return "Other";
}

/* ---------- experience / salary / location / type ---------- */

export function extractExperience(text: string): string {
  const t = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "Internship / Student";
  const range = /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)/.exec(t);
  if (range) {
    const min = +range[1];
    const max = +range[2];
    if (min === 0 && max <= 1) return "Fresher";
    if (min === 0) return "Entry Level";
    if (min === 1 && max <= 2) return "1-2 Years";
    if (min >= 5) return "5+ Years";
    if (min >= 2 && max <= 5) return "2-5 Years";
    return "Experienced";
  }
  const single = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/.exec(t);
  if (single) {
    const n = +single[1];
    if (n === 0) return "Fresher";
    if (n === 1) return "1-2 Years";
    if (n >= 5) return "5+ Years";
    return "2-5 Years";
  }
  if (/\bfreshers?\b|\b0\s*years?\b|\brecent graduates?\b/.test(t)) return "Fresher";
  if (/entry[- ]level|\bjunior\b/.test(t)) return "Entry Level";
  return "";
}

export function extractSalary(text: string): string {
  const unit = "(?:lpa|lakhs?|lacs?|l\\b|k\\b|per annum|p\\.a\\.|per month|\\/\\s?month|pm\\b)";
  const range = new RegExp(`(?:₹|rs\\.?\\s?|inr\\s?)?\\s*\\d+(?:\\.\\d+)?\\s*(?:-|–|to)\\s*(?:₹|rs\\.?\\s?)?\\d+(?:\\.\\d+)?\\s*${unit}`, "i").exec(text);
  if (range) return range[0].trim().replace(/\s+/g, " ");
  const single = new RegExp(`(?:ctc|salary|stipend|package)\\s*[:\\-–]?\\s*(?:₹|rs\\.?\\s?|inr\\s?)?\\s*\\d+(?:\\.\\d+)?\\s*${unit}`, "i").exec(text);
  return single ? single[0].trim().replace(/\s+/g, " ") : "";
}

const LOC_ALIASES: [string, RegExp][] = [
  ["Navi Mumbai", /navi mumbai/i],
  ["Bengaluru", /bengaluru|bangalore/i],
  ["Gurugram", /gurugram|gurgaon/i],
  ["Pune", /\bpune\b/i],
  ["Hyderabad", /hyderabad/i],
  ["Chennai", /chennai/i],
  ["Mumbai", /\bmumbai\b/i],
  ["Noida", /\bnoida\b/i],
  ["Kolkata", /kolkata/i],
  ["Ahmedabad", /ahmedabad/i],
  ["PAN India", /pan[- ]india|across india/i],
  ["Remote", /\bremote\b|work from home|\bwfh\b/i],
];

export function extractLocation(text: string): string {
  let best: { name: string; at: number } | null = null;
  for (const [name, re] of LOC_ALIASES) {
    const m = re.exec(text);
    if (!m) continue;
    if (!best || m.index < best.at) best = { name, at: m.index };
  }
  return best?.name ?? "";
}

export function extractJobType(text: string): string {
  const t = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "Internship";
  if (/\bcontract(ual)?\b|\bc2h\b/.test(t)) return "Contract";
  if (/part[- ]time/.test(t)) return "Part-time";
  if (/\bhybrid\b/.test(t)) return "Hybrid";
  return "Full-time";
}

/* ---------- link / deadline / company+role ---------- */

export function extractLink(text: string): string {
  const m = /https?:\/\/[^\s<>"')]+/i.exec(text);
  return m ? m[0].replace(/[.,;]+$/, "") : "";
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function extractDeadline(text: string, today = new Date()): string {
  const ctx = /(?:last date|deadline|apply (?:by|before)|closing date|closes on)[^\n]{0,20}?[:\-–]?\s*([^\n]{4,30})/i.exec(text);
  const src = ctx ? ctx[1] : "";
  if (!src) return "";
  let y = 0, mo = 0, d = 0;
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(src);
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(src))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else if ((m = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*,?\s+(\d{4})/i.exec(src))) {
    d = +m[1]; mo = MONTHS.indexOf(m[2].toLowerCase()) + 1; y = +m[3];
  }
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const iso = `${y}-${pad(mo)}-${pad(d)}`;
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  return iso >= todayIso ? iso : "";
}

export function extractCompanyRole(text: string): { companyName?: string; role?: string } {
  const out: { companyName?: string; role?: string } = {};
  const co = /(?:^|\n)\s*(?:company(?: name)?|organi[sz]ation)\s*[:\-–]\s*([^\n]{2,60})/i.exec(text);
  const ro = /(?:^|\n)\s*(?:role|position|job title|designation|post)\s*[:\-–]\s*([^\n]{2,70})/i.exec(text);
  if (co) out.companyName = co[1].trim();
  if (ro) out.role = ro[1].trim();
  if (!out.companyName || !out.role) {
    // "X is hiring Y" / "X hiring Y"
    const h = /(?:^|\n)\s*([A-Z][\w&.' -]{1,40}?)\s+is\s+hiring\s+(?:for\s+)?(?:an?\s+)?([^\n(|–-]{3,60})/i.exec(text);
    if (h) {
      out.companyName ||= h[1].trim();
      out.role ||= h[2].trim();
    }
  }
  return out;
}

/* ---------- one-shot ---------- */

// Sirf wahi keys return hoti hain jo text mein mil gayin.
export function parseJobText(text: string): ParsedJob {
  const out: ParsedJob = {};
  const cr = extractCompanyRole(text);
  if (cr.companyName) out.companyName = cr.companyName;
  if (cr.role) out.role = cr.role;
  const salary = extractSalary(text);
  if (salary) out.salary = salary;
  const location = extractLocation(text);
  if (location) out.location = location;
  const experience = extractExperience(text);
  if (experience) out.experience = experience;
  const skills = extractSkills(text);
  if (skills) out.skills = skills;
  const link = extractLink(text);
  if (link) out.applyLink = link;
  const dl = extractDeadline(text);
  if (dl) out.lastDate = dl;
  out.jobType = extractJobType(text);
  out.category = guessCategory(cr.role ?? "", text);
  return out;
}

/* ---------- "Company | Role | Salary | Link | Location | Exp" lines ---------- */

export type QuickRow = {
  companyName: string;
  role: string;
  salary: string;
  applyLink: string;
  location: string;
  experience: string;
};

// Excel/Sheets se paste (tab) ya "|" se alag ki hui lines.
export function parseQuickRows(text: string): QuickRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const p = (l.includes("\t") ? l.split("\t") : l.split("|")).map((s) => s.trim());
      return {
        companyName: p[0] ?? "",
        role: p[1] ?? "",
        salary: p[2] ?? "",
        applyLink: p[3] ?? "",
        location: p[4] ?? "",
        experience: p[5] ?? "",
      };
    });
}
