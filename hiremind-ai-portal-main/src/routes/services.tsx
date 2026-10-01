import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  FilePlus2,
  Linkedin,
  Globe2,
  Mail,
  Send,
  ShieldCheck,
  Zap,
  Copy,
  ExternalLink,
  MessageSquareText,
  Rocket,
  ClipboardCheck,
} from "lucide-react";

const SERVICE_EMAIL = "prathmeshbobade33@gmail.com";

const IMG = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

const SERVICES = [
  {
    id: "resume-review",
    title: "Resume Review",
    icon: FileText,
    original: 59,
    price: 29,
    discount: "51% OFF",
    turnaround: "1 day",
    image: IMG("photo-1586281380349-632531db7ed4"),
    description: "Recruiter-style feedback to make your existing resume sharper, clearer and more ATS-ready.",
    points: ["ATS-focused review", "Structure & formatting feedback", "Actionable improvement points"],
    accent: "from-cyan-400 to-blue-500",
  },
  {
    id: "resume-building",
    title: "Resume Building",
    icon: FilePlus2,
    original: 150,
    price: 99,
    discount: "34% OFF",
    turnaround: "1 day",
    image: IMG("photo-1455390582262-044cdead277a"),
    description: "A polished, professional resume tailored around your profile, projects and target role.",
    points: ["90+ ATS-focused structure", "Professional content positioning", "Job-ready final resume"],
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    id: "linkedin",
    title: "LinkedIn Optimization",
    icon: Linkedin,
    original: 200,
    price: 149,
    discount: "26% OFF",
    turnaround: "3 days",
    image: IMG("photo-1611944212129-29977ae1398c"),
    description: "Turn your LinkedIn profile into a stronger professional presence recruiters understand quickly.",
    points: ["Headline & About optimization", "Experience & project positioning", "Recruiter-friendly structure"],
    accent: "from-sky-400 to-blue-600",
  },
  {
    id: "portfolio",
    title: "Premium Portfolio",
    icon: Globe2,
    original: 999,
    price: 699,
    discount: "30% OFF",
    turnaround: "4–5 days",
    image: IMG("photo-1498050108023-c5249f4df085"),
    description: "A premium personal portfolio designed to showcase your projects, skills and professional story.",
    points: ["Premium responsive design", "Project & skills showcase", "Professional personal brand"],
    accent: "from-amber-300 to-orange-500",
  },
] as const;

type ServiceId = (typeof SERVICES)[number]["id"];

const STEPS = [
  { icon: MessageSquareText, title: "Send your request", text: "Choose a service and share your basic details." },
  { icon: ClipboardCheck, title: "We review your profile", text: "Your email opens pre-filled — just press send." },
  { icon: Rocket, title: "Get job-ready output", text: "Receive your work within the stated turnaround." },
];

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Career Services — Resume, LinkedIn & Portfolio | Hire Daily" },
      {
        name: "description",
        content:
          "Professional career services from Hire Daily: resume review, resume building, LinkedIn optimization and premium portfolio creation.",
      },
      { property: "og:title", content: "Hire Daily Career Services" },
      {
        property: "og:description",
        content: "Get job-ready with professional resume, LinkedIn and portfolio services from Hire Daily.",
      },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/services" }],
  }),
  component: ServicesPage,
});

/** Image with graceful fallback so the layout never breaks if a photo fails. */
function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`bg-gradient-to-br from-slate-800 to-slate-950 ${className}`} aria-hidden />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";

function ServicesPage() {
  const [selectedService, setSelectedService] = useState<ServiceId>("resume-review");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", link: "", message: "" });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => SERVICES.find((s) => s.id === selectedService) ?? SERVICES[0],
    [selectedService],
  );

  const subject = `Hire Daily Service Request — ${selected.title} (₹${selected.price})`;
  const body = useMemo(
    () =>
      [
        "Hi Hire Daily team,",
        "",
        "I would like to request the following service:",
        "",
        `Service: ${selected.title}`,
        `Price: ₹${selected.price} (was ₹${selected.original})`,
        `Expected turnaround: ${selected.turnaround}`,
        "",
        "My details:",
        `Name: ${form.name || "-"}`,
        `Email: ${form.email || "-"}`,
        `Phone: ${form.phone || "-"}`,
        `Target role / field: ${form.role || "-"}`,
        `Resume / LinkedIn / Portfolio link: ${form.link || "-"}`,
        "",
        "Additional message:",
        form.message || "-",
        "",
        "Thanks,",
        form.name || "",
      ].join("\n"),
    [selected, form],
  );

  const mailtoUrl = `mailto:${SERVICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SERVICE_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(SERVICE_EMAIL)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (SERVICES.some((s) => s.id === hash)) {
      setSelectedService(hash as ServiceId);
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, []);

  const chooseService = (id: ServiceId) => {
    setSelectedService(id);
    setSent(false);
    window.setTimeout(
      () => document.getElementById("service-request")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  };

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);

    // 1) Try the device's default email app (mailto).
    let appOpened = false;
    const markOpened = () => {
      appOpened = true;
    };
    window.addEventListener("blur", markOpened, { once: true });
    document.addEventListener("visibilitychange", markOpened, { once: true });
    window.location.href = mailtoUrl;

    // 2) If no email app took focus (typical on laptops), open Gmail on the web.
    window.setTimeout(() => {
      window.removeEventListener("blur", markOpened);
      document.removeEventListener("visibilitychange", markOpened);
      if (!appOpened) window.open(gmailUrl, "_blank", "noopener,noreferrer");
    }, 1400);
  };

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${SERVICE_EMAIL}\nSubject: ${subject}\n\n${body}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="relative overflow-hidden pb-24">
      <style>{`
        .hd-orb { animation: hdFloat 11s ease-in-out infinite; }
        .hd-orb-2 { animation-delay: -4s; }
        .hd-card { transition: transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .5s ease; }
        .hd-card:hover { transform: translateY(-8px); box-shadow: 0 30px 70px rgba(0,0,0,.18), 0 0 40px rgba(0,229,255,.07); }
        .hd-card:hover .hd-card-img { transform: scale(1.06); }
        .hd-card-img { transition: transform .8s cubic-bezier(.2,.8,.2,1); }
        .hd-shimmer { background-size: 220% 100%; animation: hdShimmer 6s linear infinite; }
        .hd-pop { animation: hdPop .45s cubic-bezier(.2,.8,.2,1); }
        @keyframes hdFloat { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(28px,-22px,0) scale(1.07); } }
        @keyframes hdShimmer { 0% { background-position: 200% 0; } 100% { background-position: -20% 0; } }
        @keyframes hdPop { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .hd-orb,.hd-card,.hd-card-img,.hd-shimmer,.hd-pop { animation: none !important; transition: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl hd-orb" />
      <div className="pointer-events-none absolute -right-40 top-48 h-[30rem] w-[30rem] rounded-full bg-violet-500/10 blur-3xl hd-orb hd-orb-2" />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-6 pt-10 md:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-semibold text-cyan-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Hire Daily Career Services
            </div>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              Build a profile that is <span className="text-gradient">ready for opportunity.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
              Professional support for your resume, LinkedIn profile and personal portfolio — built to make your next application stronger.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Professional output</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2"><Zap className="h-4 w-4 text-violet-400" /> No payment upfront</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2"><Clock3 className="h-4 w-4 text-amber-400" /> Clear turnaround</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#service-request" className="inline-flex items-center gap-2 rounded-xl bg-foreground px-6 py-3.5 text-sm font-bold text-background transition hover:-translate-y-0.5">
                Request a service <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#resume-review" className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3.5 text-sm font-semibold text-foreground transition hover:-translate-y-0.5">
                View pricing
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-border shadow-2xl">
              <Photo src={IMG("photo-1521737604893-d14cc237f11d", 1200)} alt="Professionals reviewing career documents together" className="h-[22rem] w-full md:h-[28rem]" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            </div>
            <div className="glass absolute -bottom-6 -left-4 rounded-2xl p-4 shadow-xl md:-left-8">
              <div className="text-2xl font-extrabold text-foreground">₹29<span className="text-sm font-semibold text-muted-foreground"> onwards</span></div>
              <div className="text-xs text-muted-foreground">Resume review in 1 day</div>
            </div>
            <div className="glass absolute -right-2 top-6 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-xl md:-right-6">
              <Check className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-foreground">ATS-ready formats</span>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative mx-auto mt-24 grid max-w-7xl gap-5 px-6 md:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          const active = selectedService === service.id;
          return (
            <article
              id={service.id}
              key={service.id}
              className={`hd-card glass gradient-border relative flex flex-col overflow-hidden rounded-3xl ${active ? "ring-1 ring-cyan-400/40" : ""}`}
            >
              <div className="relative h-40 overflow-hidden">
                <Photo src={service.image} alt={service.title} className="hd-card-img h-full w-full" />
                <div className={`absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent`} />
                <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-900">{service.discount}</span>
                <div className={`absolute -bottom-6 left-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${service.accent} text-slate-950 shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6 pt-10">
                <h2 className="text-xl font-bold text-foreground">{service.title}</h2>
                <p className="mt-2 min-h-[72px] text-sm leading-6 text-muted-foreground">{service.description}</p>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-sm text-muted-foreground line-through">₹{service.original}</span>
                  <span className="text-3xl font-extrabold text-foreground">₹{service.price}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5 text-cyan-400" /> Delivery: {service.turnaround}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {service.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" /> {p}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => chooseService(service.id)}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background transition hover:-translate-y-0.5"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto mt-24 max-w-7xl px-6">
        <div className="mb-10 max-w-xl">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">How it works</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Three simple steps from request to a stronger profile.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="glass relative rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-400"><Icon className="h-5 w-5" /></div>
                  <span className="text-4xl font-extrabold text-foreground/10">{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SAMPLES */}
      <section className="relative mx-auto mt-24 max-w-7xl px-6">
        <div className="mb-10 max-w-xl">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Sample work, before you start.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">A visual preview of the output you can expect from each service.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SampleResume />
          <SampleLinkedIn />
          <SamplePortfolio />
        </div>
      </section>

      {/* REQUEST FORM */}
      <section id="service-request" className="relative mx-auto mt-24 max-w-5xl scroll-mt-24 px-6">
        <div className="glass gradient-border overflow-hidden rounded-[2rem]">
          <div className="grid md:grid-cols-[1fr_1.25fr]">
            <div className="relative hidden min-h-full md:block">
              <Photo src={IMG("photo-1573496359142-b8d87734a5a2", 900)} alt="Professional ready for the next opportunity" className="absolute inset-0 h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />
              <div className="absolute bottom-0 p-8 text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <Mail className="h-3.5 w-3.5" /> No payment upfront
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight">Tell us what you need.</h2>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  Your email app (or Gmail on the web) opens with everything pre-filled. Review it and press send.
                </p>
                <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Selected service</div>
                  <div className="mt-1 text-lg font-bold">{selected.title} · ₹{selected.price}</div>
                  <div className="mt-1 text-xs text-white/60">Delivery in {selected.turnaround}</div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10">
              <h2 className="text-2xl font-bold text-foreground md:hidden">Tell us what you need.</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">Name</span>
                    <input required value={form.name} onChange={update("name")} autoComplete="name" placeholder="Your full name" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">Email</span>
                    <input required type="email" value={form.email} onChange={update("email")} autoComplete="email" placeholder="you@example.com" className={inputCls} />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">Phone number</span>
                    <input value={form.phone} onChange={update("phone")} autoComplete="tel" placeholder="Optional" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-foreground">Target role</span>
                    <input value={form.role} onChange={update("role")} placeholder="e.g. Data Analyst" className={inputCls} />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-foreground">Service</span>
                  <select
                    value={selectedService}
                    onChange={(e) => { setSelectedService(e.target.value as ServiceId); setSent(false); }}
                    className={inputCls}
                  >
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>{s.title} — ₹{s.price}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-foreground">Current resume / LinkedIn link</span>
                  <input value={form.link} onChange={update("link")} placeholder="Optional — Drive or profile link" className={inputCls} />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-foreground">Anything we should know?</span>
                  <textarea rows={3} value={form.message} onChange={update("message")} placeholder="Experience, goals, deadline…" className={`${inputCls} resize-none`} />
                </label>

                <button type="submit" className="hd-shimmer flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-cyan-500/10 transition hover:-translate-y-0.5">
                  <Send className="h-4 w-4" /> Send request
                </button>

                {sent && (
                  <div className="hd-pop rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4" role="status">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Check className="h-4 w-4 text-cyan-400" /> Your email draft is ready
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Press <b>Send</b> in the email window that opened. If nothing opened, use one of these:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background">
                        <ExternalLink className="h-3.5 w-3.5" /> Open Gmail
                      </a>
                      <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" /> Open Outlook
                      </a>
                      <a href={mailtoUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground">
                        <Mail className="h-3.5 w-3.5" /> Email app
                      </a>
                      <button type="button" onClick={copyDetails} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground">
                        <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy details"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-center text-[11px] leading-5 text-muted-foreground">
                  No online payment is required right now. We reply within the selected service turnaround.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SampleShell({ icon, label, badge, badgeCls, children }: { icon: React.ReactNode; label: string; badge: string; badgeCls: string; children: React.ReactNode }) {
  return (
    <div className="hd-card glass overflow-hidden rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon} {label}</div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${badgeCls}`}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

function SampleResume() {
  return (
    <SampleShell icon={<FileText className="h-4 w-4 text-cyan-400" />} label="Resume sample" badge="ATS READY" badgeCls="bg-cyan-400/10 text-cyan-400">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="relative h-24 overflow-hidden">
          <Photo src={IMG("photo-1586281380349-632531db7ed4", 700)} alt="Resume workspace" className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white">
            <div className="text-[9px] font-bold text-cyan-300">Sample output</div>
            <div className="mt-1 text-base font-extrabold">Alex Sharma</div>
          </div>
        </div>
        <div className="p-5 text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-[10px] font-bold text-slate-500">Data Analyst, Pune</div>
              <div className="mt-1 text-[9px] text-slate-400">alex.sharma@email.com · +91 98765 43210</div>
            </div>
            <div className="rounded-lg bg-slate-900 px-2 py-1 text-[8px] font-bold text-white">Resume</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-[8px] leading-4">
            <div className="col-span-2">
              <div className="font-bold text-cyan-700">Professional Summary</div>
              <p className="mt-1 text-slate-500">Data Analyst with hands-on experience in SQL, Python, Excel and Power BI, turning business data into actionable insights.</p>
              <div className="mt-4 font-bold text-cyan-700">Experience</div>
              <div className="mt-1 font-bold text-slate-800">Data Analytics Trainee, Cravita Technologies</div>
              <div className="text-slate-500">Built dashboards, cleaned datasets and translated business questions into reporting insights.</div>
            </div>
            <div>
              <div className="font-bold text-cyan-700">Skills</div>
              <div className="mt-1 text-slate-500">SQL, Python, Power BI, Excel, DAX, MySQL</div>
              <div className="mt-4 font-bold text-cyan-700">Education</div>
              <div className="mt-1 text-slate-500">B.Tech, Information Technology</div>
            </div>
          </div>
        </div>
      </div>
    </SampleShell>
  );
}

function SampleLinkedIn() {
  return (
    <SampleShell icon={<Linkedin className="h-4 w-4 text-sky-500" />} label="LinkedIn sample" badge="OPTIMIZED" badgeCls="bg-sky-400/10 text-sky-500">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="relative h-24 overflow-hidden">
          <Photo src={IMG("photo-1611944212129-29977ae1398c", 700)} alt="LinkedIn banner" className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/75 to-sky-500/10" />
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-7 h-14 w-14 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg">
            <Photo src={IMG("photo-1500648767791-00dcc994a43e", 200)} alt="Profile photo" className="h-full w-full" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900">Alex Sharma</div>
          <div className="text-[10px] font-medium text-slate-500">Data Analyst | SQL | Power BI | Python</div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[9px] font-bold text-slate-800">About</div>
            <p className="mt-1 text-[9px] leading-4 text-slate-500">Analytical professional helping teams turn data into clear business decisions through dashboards, SQL and practical automation.</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Skills", "18"], ["Projects", "06"], ["Profile", "Strong"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 p-2"><div className="text-[8px] text-slate-400">{k}</div><div className="mt-1 text-[9px] font-bold text-slate-700">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </SampleShell>
  );
}

function SamplePortfolio() {
  return (
    <SampleShell icon={<Globe2 className="h-4 w-4 text-amber-400" />} label="Portfolio sample" badge="PREMIUM" badgeCls="bg-amber-400/10 text-amber-500">
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="relative h-24 overflow-hidden">
          <Photo src={IMG("photo-1498050108023-c5249f4df085", 700)} alt="Portfolio on laptop" className="h-full w-full opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-indigo-950/50 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white">
            <div className="text-[9px] font-bold text-amber-300">Personal brand</div>
            <div className="mt-1 text-base font-extrabold">Premium Portfolio</div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5 text-white">
          <div className="text-[9px] font-bold text-cyan-300">Alex Sharma</div>
          <div className="mt-2 text-xl font-extrabold leading-tight">Data, products<br />and useful experiences.</div>
          <div className="mt-4 flex gap-2 text-[8px]">
            {["Projects", "Skills", "Contact"].map((t) => <span key={t} className="rounded-full bg-white/10 px-2.5 py-1.5">{t}</span>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <Photo src={IMG("photo-1460925895917-afdab827c52f", 400)} alt="Finance analytics project" className="h-14 w-full" />
              <div className="p-2 text-[10px] font-bold">Finance Analytics</div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-cyan-400/10">
              <Photo src={IMG("photo-1551288049-bebda4e38f71", 400)} alt="Customer insights project" className="h-14 w-full" />
              <div className="p-2 text-[10px] font-bold">Customer Insights</div>
            </div>
          </div>
        </div>
      </div>
    </SampleShell>
  );
}