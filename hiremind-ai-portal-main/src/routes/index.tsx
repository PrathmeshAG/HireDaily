import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactNode } from "react";
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
  Rocket,
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
      { property: "og:title", content: "Hire Daily — Jobs, Internships & Career Opportunities" },
      {
        property: "og:description",
        content: "Explore current job opportunities, internships, fresher roles, remote jobs and practical career resources.",
      },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/" }],
  }),
});

/* ---------- helpers ---------- */

const IMG = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

function Photo({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div aria-hidden className={`bg-gradient-to-br from-slate-800 to-slate-950 ${className}`} />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/* ---------- animation primitives ---------- */

const cv = (o: Record<string, string | number>) => o as CSSProperties;
const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reactive media query (false on the server, correct after mount). */
function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || prefersReduced()) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Scroll-triggered entrance: up | left | right | zoom | flip */
function Reveal({ children, v = "up", delay = 0, className = "" }: { children: ReactNode; v?: "up" | "left" | "right" | "zoom" | "flip"; delay?: number; className?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-v={v} style={cv({ "--d": `${delay}ms` })} className={`hd-rv ${seen ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** 3D tilt + moving glare that follows the cursor */
function Tilt({ children, className = "", max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: RPE<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`hd-tilt ${className}`}>
      <div className="hd-tilt-in">{children}</div>
      <span className="hd-glare" aria-hidden />
    </div>
  );
}

/** Button that gets pulled toward the cursor */
function Magnetic({ children, className = "", strength = 0.35 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: RPE<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transition = "transform .15s linear";
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .7s cubic-bezier(.2,1.7,.4,1)";
    el.style.transform = "translate3d(0,0,0)";
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`inline-block ${className}`}>
      {children}
    </div>
  );
}

/** Headline where each word slides up out of a mask */
function Words({ text, delay = 0, gradient = false }: { text: string; delay?: number; gradient?: boolean }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="hd-word-mask">
          <span className={`hd-word ${gradient ? "text-gradient hd-gradient-anim" : ""}`} style={{ animationDelay: `${delay + i * 110}ms` }}>
            {w}
          </span>
        </span>
      ))}
    </>
  );
}

/* ---------- big-motion components ---------- */

/** Real 3D card flip. Hover on desktop, tap / Enter on touch + keyboard. */
function FlipCard({ front, back, className = "" }: { front: ReactNode; back: ReactNode; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  const canHover = () => window.matchMedia("(hover: hover)").matches;
  return (
    <div
      className={`hd-flip ${flipped ? "is-flipped" : ""} ${className}`}
      tabIndex={0}
      onClick={() => {
        if (!canHover()) setFlipped((f) => !f);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
    >
      <div className="hd-flip-in">
        <div className="hd-face">{front}</div>
        <div className="hd-face hd-back">{back}</div>
      </div>
    </div>
  );
}

type StackStep = { icon: typeof Search; title: string; body: string; image: string; hue: number };

/** Sticky cards that pile on top of each other; earlier cards shrink and dim as the next one lands. */
function StackSteps({ steps }: { steps: StackStep[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el || prefersReduced()) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-stack]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const off = cards.length > 1 ? parseFloat(getComputedStyle(cards[1]).top) - parseFloat(getComputedStyle(cards[0]).top) || 16 : 16;
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        let o = 0;
        if (next) {
          const gap = next.getBoundingClientRect().top - c.getBoundingClientRect().top - off;
          o = Math.min(1, Math.max(0, 1 - gap / c.offsetHeight));
        }
        c.style.setProperty("--o", o.toFixed(3));
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrap} className="relative pb-24">
      {steps.map((st, i) => {
        const Icon = st.icon;
        return (
          <div key={st.title} data-stack className="hd-stack sticky mb-8 md:mb-10" style={cv({ "--i": i })}>
            <div
              className="hd-stack-in grid overflow-hidden rounded-3xl border border-white/10 shadow-2xl md:min-h-[22rem] md:grid-cols-[1.05fr_1fr]"
              style={{ background: `linear-gradient(135deg, hsl(${st.hue} 60% 15%), #0a0f1f 65%)` }}
            >
              <div className="relative flex flex-col justify-center p-6 sm:p-8 md:p-12">
                <span className="pointer-events-none absolute right-6 top-2 select-none text-[5rem] font-extrabold leading-none sm:text-[7rem] md:text-[9rem]" style={{ color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,.14)" }}>
                  {i + 1}
                </span>
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00e5ff] text-slate-950 shadow-lg shadow-cyan-500/20">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="relative mt-3 text-xs font-medium text-white/40">
                  Step {i + 1} of {steps.length}
                </div>
                <h3 className="relative mt-2 text-2xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                  {st.title}
                </h3>
                <p className="relative mt-3 max-w-md text-sm leading-7 text-white/60 md:text-base">{st.body}</p>
              </div>
              <div className="relative min-h-[11rem] overflow-hidden sm:min-h-[14rem]">
                <Photo src={st.image} alt={st.title} className="hd-ken absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1f] via-[#0a0f1f]/20 to-transparent md:bg-gradient-to-r md:via-[#0a0f1f]/30" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Desktop: pinned section where vertical scroll drives a horizontal rail. Touch / small screens: native swipe rail with snap. */
function HRail({ items, head }: { items: typeof BROWSE_ITEMS; head: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const wide = useMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
  const calm = useMedia("(prefers-reduced-motion: reduce)");
  const pinned = wide && !calm;

  useEffect(() => {
    const o = outer.current;
    const t = track.current;
    if (!o || !t) return;
    if (!pinned) {
      o.style.height = "";
      t.style.transform = "";
      return;
    }
    const vh = () => document.documentElement.clientHeight || window.innerHeight;
    let raf = 0;
    let dist = 0;
    const update = () => {
      raf = 0;
      const total = Math.max(1, o.offsetHeight - vh());
      const pr = Math.min(1, Math.max(0, -o.getBoundingClientRect().top / total));
      t.style.transform = `translate3d(${-pr * dist}px,0,0)`;
      o.style.setProperty("--hp", pr.toFixed(4));
    };
    const measure = () => {
      dist = Math.max(0, t.scrollWidth - (t.parentElement as HTMLElement).clientWidth);
      o.style.height = `${dist + vh()}px`;
      update();
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pinned]);

  return (
    <div ref={outer} className="relative">
      <div className={pinned ? "sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-20" : ""}>
        {head}
        <div
          className={
            pinned
              ? "overflow-hidden"
              : "-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }
        >
          <div ref={track} className={`flex items-start will-change-transform ${pinned ? "gap-5" : "gap-3 sm:gap-4"}`}>
            {items.map(([label, body, Icon], i) => (
              <a
                key={label}
                href={`/jobs?browse=${encodeURIComponent(label)}`}
                className={`hd-rail-card group relative flex shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-6 ${
                  pinned ? "h-[21rem] w-[18.5rem]" : "h-[16.5rem] w-[72vw] max-w-[17rem] snap-start sm:h-[18rem] sm:w-[16rem]"
                }`}
                style={{ background: `linear-gradient(160deg, hsl(${(i * 47 + 185) % 360} 65% 17%), #0a0f1f 72%)`, marginTop: pinned && i % 2 ? "2.5rem" : 0 }}
              >
                <Icon className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/[0.04]" />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur sm:h-16 sm:w-16"
                  style={
                    pinned
                      ? { transform: `translate3d(calc((0.5 - var(--hp, 0)) * ${((i % 3) - 1) * 70}px), 0, 0) rotate(calc((var(--hp, 0) - 0.5) * ${i % 2 ? 24 : -24}deg))` }
                      : undefined
                  }
                >
                  <Icon className="h-6 w-6 text-[#00e5ff] sm:h-7 sm:w-7" />
                </div>
                <div className="relative">
                  <div className="text-lg font-bold text-white sm:text-xl">{label}</div>
                  <div className="mt-1 text-sm leading-6 text-white/55">{body}</div>
                  <div className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-[#00e5ff] group-hover:text-slate-950 sm:mt-4">
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
        {pinned ? (
          <div className="mt-8 flex items-center gap-4">
            <span className="text-xs text-white/40">Keep scrolling</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full origin-left rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ transform: "scaleX(var(--hp, 0))" }} />
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
            Swipe to explore <ArrowRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Pinned statement: words light up one by one as you scroll. */
function ScrubText({ text }: { text: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const o = outer.current;
    if (!o) return;
    if (prefersReduced()) {
      setReduced(true);
      o.style.setProperty("--p", "1");
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const total = Math.max(1, o.offsetHeight - (document.documentElement.clientHeight || window.innerHeight));
      o.style.setProperty("--p", Math.min(1, Math.max(0, -o.getBoundingClientRect().top / total)).toFixed(4));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  const words = text.split(" ");
  return (
    <div ref={outer} className={reduced ? "py-10" : "h-[170svh] md:h-[210vh]"}>
      <div className={reduced ? "" : "sticky top-0 flex h-[100svh] items-center"}>
        <p className="mx-auto max-w-5xl text-center text-[1.75rem] font-bold leading-[1.18] text-white sm:text-4xl md:text-6xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          {words.map((w, i) => (
            <span key={i} className="hd-scrub" style={cv({ "--i": i, "--n": words.length })}>
              {w}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/** Two logo rows moving in opposite directions. */
function MarqueeRow({ items, reverse = false }: { items: [string, number][]; reverse?: boolean }) {
  return (
    <div className="company-marquee-shell">
      <div className={`company-marquee ${reverse ? "rev" : ""}`}>
        {[...items, ...items].map(([company, count], i) => (
          <a
            key={`${company}-${i}`}
            href={`/jobs?q=${encodeURIComponent(company)}`}
            aria-label={`View ${company} jobs`}
            className="company-marquee-card glass card-glow group/card"
          >
            <CompanyLogo company={company} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{company}</div>
              <div className="mt-0.5 text-xs text-white/40">
                {count} {count === 1 ? "listing" : "listings"}
              </div>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/20 transition duration-300 group-hover/card:translate-x-1 group-hover/card:text-[#00e5ff]" />
          </a>
        ))}
      </div>
    </div>
  );
}

function RotatingBadge() {
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 200 200" className="hd-spin h-full w-full" aria-hidden>
        <defs>
          <path id="hdBadgePath" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <text fill="#00e5ff" fontSize="15" fontWeight="700">
          <textPath href="#hdBadgePath" textLength="492" lengthAdjust="spacing">RESUME • LINKEDIN • PORTFOLIO • </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#00e5ff] text-slate-950 shadow-lg shadow-cyan-500/30">
        <Rocket className="h-7 w-7" />
      </div>
    </div>
  );
}

function useCounter(target: number, duration = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.floor(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function Stat({ value, label, icon: Icon, delay = 0 }: { value: number; label: string; icon: typeof Search; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const n = useCounter(seen ? value : 0);
  return (
    <Reveal v="zoom" delay={delay} className="h-full">
    <Tilt className="h-full rounded-2xl" max={12}>
    <div ref={ref} className="glass gradient-border hd-glow-card hd-shimmer h-full rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="hd-icon-bounce flex h-11 w-11 items-center justify-center rounded-xl bg-[#00e5ff]/10">
          <Icon className="h-5 w-5 text-[#00e5ff]" />
        </div>
        <span className="text-4xl font-bold text-gradient">{n.toLocaleString()}+</span>
      </div>
      <div className="mt-3 text-sm text-white/55">{label}</div>
    </div>
    </Tilt>
    </Reveal>
  );
}

function SectionHead({
  icon: Icon,
  eyebrow,
  title,
  text,
  to,
  linkLabel = "View all",
  center = false,
}: {
  icon: typeof Search;
  eyebrow: string;
  title: string;
  text?: string;
  to?: string;
  linkLabel?: string;
  center?: boolean;
}) {
  return (
    <Reveal v="up">
    <div className={`mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 md:mb-9 ${center ? "justify-center text-center" : ""}`}>
      <div>
        <div className={`mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#00e5ff]`}>
          <Icon className="h-4 w-4" /> {eyebrow}
        </div>
        <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
          {title}
        </h2>
        {text && <p className={`mt-3 max-w-2xl text-sm leading-6 text-white/55 ${center ? "mx-auto" : ""}`}>{text}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm text-[#00e5ff] hover:text-white">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
    </Reveal>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  step,
  delay,
  back,
  cta,
}: {
  icon: typeof Search;
  title: string;
  body: string;
  step?: number;
  delay?: number;
  back: string;
  cta?: { label: string; to: string };
}) {
  return (
    <Reveal v="flip" delay={delay ?? ((step ?? 1) - 1) * 130} className="h-full">
      <FlipCard
        className="h-[19rem] rounded-2xl sm:h-[15rem] md:h-[19rem] lg:h-[16rem]"
        front={
          <div className="glass card-glow flex h-full flex-col rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00e5ff]/10">
                <Icon className="h-6 w-6 text-[#00e5ff]" />
              </div>
              {step !== undefined && <span className="text-5xl font-extrabold text-white/[0.07]">{step}</span>}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
            <div className="mt-auto pt-3 text-xs text-[#00e5ff]/70">Hover or tap to flip</div>
          </div>
        }
        back={
          <div className="flex h-full flex-col justify-between rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg,#0891b2 0%,#4f46e5 55%,#7c3aed 100%)" }}>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" /> {title}
              </div>
              <p className="mt-3 text-sm leading-6 text-white/90">{back}</p>
            </div>
            {cta && (
              <Link to={cta.to} className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">
                {cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        }
      />
    </Reveal>
  );
}

/* ---------- data ---------- */

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
    image: IMG("photo-1586281380349-632531db7ed4", 700),
    title: "Resume Checklist for Freshers",
    tips: ["Keep it to one clear page", "Quantify what your projects achieved", "Match skills to the role you apply for"],
    text: "A practical checklist for improving structure, clarity, skills and project presentation before applying.",
  },
  {
    icon: UserCheck,
    image: IMG("photo-1454165804606-c3d57bc86b40", 700),
    title: "How to Read a Job Description",
    tips: ["Separate must-have from nice-to-have skills", "Check experience range and location", "Note how and where to apply"],
    text: "Understand experience requirements, must-have skills, responsibilities and application details before you apply.",
  },
  {
    icon: ShieldCheck,
    image: IMG("photo-1563986768609-322da13575f3", 700),
    title: "How to Spot a Suspicious Job",
    tips: ["Be wary of any fee asked from candidates", "Verify the official company website", "Check where the application link leads"],
    text: "Simple checks candidates can use to evaluate application links, recruiter requests and unusual job offers.",
  },
  {
    icon: BookOpen,
    image: IMG("photo-1573497019940-1c28c88b4f3e", 700),
    title: "Interview Preparation Basics",
    tips: ["Prepare two or three project stories", "Revise your core fundamentals", "Prepare questions to ask the interviewer"],
    text: "A practical starting point for preparing examples, technical fundamentals and questions for an interview.",
  },
];

const STACK_STEPS: StackStep[] = [
  { icon: Instagram, title: "Discover", body: "Find a relevant opportunity through Hire Daily's Instagram content.", image: IMG("photo-1611162617213-7d7a39e9b1d7", 900), hue: 190 },
  { icon: MessageCircle, title: "Get the link", body: "Our automated workflow can route an interaction to the relevant job page.", image: IMG("photo-1577563908411-5077b6dc7624", 900), hue: 255 },
  { icon: FileText, title: "Review", body: "Check role, company, eligibility, source and verification information available.", image: IMG("photo-1450101499163-c8848c66ca85", 900), hue: 160 },
  { icon: ExternalLink, title: "Apply", body: "Continue to the application destination when you decide the role is suitable.", image: IMG("photo-1521737711867-e3b97375f902", 900), hue: 320 },
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

const DOMAINS: Record<string, string> = {
  accenture: "accenture.com", amazon: "amazon.com", microsoft: "microsoft.com", google: "google.com",
  meta: "meta.com", apple: "apple.com", infosys: "infosys.com", tcs: "tcs.com",
  tataconsultancyservices: "tcs.com", wipro: "wipro.com", cognizant: "cognizant.com",
  deloitte: "deloitte.com", capgemini: "capgemini.com", ibm: "ibm.com", oracle: "oracle.com",
  adobe: "adobe.com", salesforce: "salesforce.com", hcl: "hcltech.com", hcltech: "hcltech.com",
  flipkart: "flipkart.com", walmart: "walmart.com", uber: "uber.com", airbnb: "airbnb.com",
  linkedin: "linkedin.com", zoho: "zoho.com", freshworks: "freshworks.com", phonepe: "phonepe.com",
  swiggy: "swiggy.com", zomato: "zomato.com", razorpay: "razorpay.com", cred: "cred.club", paytm: "paytm.com",
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");

function companyDomain(company: string) {
  const key = company
    .toLowerCase()
    .replace(/\b(inc|ltd|limited|llp|plc|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return DOMAINS[key] ?? null;
}

function CompanyLogo({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const domain = companyDomain(company);
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.06]">
      {!failed && domain ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={`${company} logo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-7 w-7 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xs font-bold tracking-tight text-white">{initials(company)}</span>
      )}
    </div>
  );
}

function topCounts<T>(items: T[], pick: (item: T) => string | undefined | null, limit = 8): [string, number][] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const v = pick(item)?.trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

/* ---------- page ---------- */

function Home() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  const allJobs = jobs ?? [];
  const latest = allJobs.slice(0, 6);
  const companyStats = useMemo(() => topCounts(allJobs, (j) => j.companyName), [allJobs]);
  const categoryStats = useMemo(() => topCounts(allJobs, (j) => j.category), [allJobs]);
  const locationStats = useMemo(() => topCounts(allJobs, (j) => j.location), [allJobs]);
  const verifiedCount = allJobs.filter((j) => j.verificationStatus === "verified").length;

  const isNarrow = useMedia("(max-width: 767px)");
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReduced()) return;
    let raf = 0;
    let last = window.scrollY;
    let vel = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      vel = vel * 0.86 + (y - last) * 0.14;
      last = y;
      el.style.setProperty("--sy", String(y));
      el.style.setProperty("--sp", String(max > 0 ? y / max : 0));
      el.style.setProperty("--vel", String(Math.max(-9, Math.min(9, vel * 0.6))));
      if (Math.abs(vel) > 0.05) raf = requestAnimationFrame(update);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const onHeroMove = (e: RPE<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    el.style.setProperty("--px", String(x / r.width - 0.5));
    el.style.setProperty("--py", String(y / r.height - 0.5));
  };

  const tile = (i: number, speed: number, span: string, src: string, alt: string, extra = "") => (
    <div className={`hd-par ${span}`} style={cv({ "--ps": speed })}>
      <div className="hd-tile h-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={cv({ "--i": i })}>
        <Photo src={src} alt={alt} className={`h-full w-full ${extra}`} />
      </div>
    </div>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Hire Daily",
            alternateName: "HireMind AI",
            url: "https://hire-daily.vercel.app/",
          }),
        }}
      />

      <style>{`
        .hd-reveal { animation: hdReveal .8s cubic-bezier(.2,.8,.2,1) both; }
        .hd-reveal-delay-1 { animation-delay: 80ms; }
        .hd-reveal-delay-2 { animation-delay: 160ms; }
        .hd-float { animation: hdFloat 6s ease-in-out infinite; }
        .hd-float-2 { animation-delay: -3s; }
        .hd-pulse-orb { animation: hdPulseOrb 5s ease-in-out infinite; }
        .hd-shimmer { position: relative; overflow: hidden; }
        .hd-shimmer::after { content: ""; position: absolute; inset: 0; transform: translateX(-120%); background: linear-gradient(100deg, transparent 25%, rgba(255,255,255,.08) 48%, transparent 70%); animation: hdShimmer 4.5s ease-in-out infinite; pointer-events: none; }
        .hd-glow-card { transition: transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s ease, border-color .35s ease; }
        .hd-glow-card:hover { transform: translateY(-6px); border-color: rgba(0,229,255,.22); box-shadow: 0 22px 55px rgba(0,0,0,.26), 0 0 35px rgba(0,229,255,.07); }
        .hd-icon-bounce { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
        .hd-glow-card:hover .hd-icon-bounce { transform: translateY(-2px) scale(1.08) rotate(-3deg); }
        .hd-img { transition: transform .8s cubic-bezier(.2,.8,.2,1); }
        .hd-glow-card:hover .hd-img { transform: scale(1.07); }
        .hd-magnetic { transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease; }
        .hd-magnetic:hover { transform: translateY(-3px); box-shadow: 0 14px 35px rgba(0,229,255,.12); }
        .hd-search:focus-within { border-color: rgba(0,229,255,.45); box-shadow: 0 0 0 4px rgba(0,229,255,.08), 0 20px 60px rgba(0,229,255,.1); }
        .company-marquee-shell { position: relative; overflow: hidden; padding: 10px 0 18px; mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 7%, black 93%, transparent); }
        .company-marquee { display: flex; width: max-content; gap: 14px; animation: hdMarquee 34s linear infinite; will-change: transform; }
        .company-marquee:hover { animation-play-state: paused; }
        .company-marquee-card { display: flex; width: 285px; min-height: 82px; align-items: center; gap: 13px; border-radius: 18px; padding: 14px; transition: transform 300ms ease, border-color 300ms ease, box-shadow 300ms ease, background 300ms ease; }
        .company-marquee-card:hover { transform: translateY(-4px) scale(1.015); border-color: rgba(0,229,255,.24); background: rgba(255,255,255,.055); box-shadow: 0 18px 45px rgba(0,0,0,.25), 0 0 30px rgba(0,229,255,.08); }
        .company-marquee-card img { filter: grayscale(.55) brightness(.9); opacity: .78; transition: filter .3s, opacity .3s; }
        .company-marquee-card:hover img { filter: none; opacity: 1; }
        @keyframes hdReveal { from { opacity: 0; transform: translateY(22px); filter: blur(5px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes hdFloat { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-9px) rotate(1.2deg); } }
        @keyframes hdPulseOrb { 0%,100% { transform: scale(1); opacity: .45; } 50% { transform: scale(1.12); opacity: .7; } }
        @keyframes hdShimmer { 0%,58%,100% { transform: translateX(-120%); } 72% { transform: translateX(120%); } }
        @keyframes hdMarquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
        @media (max-width: 640px) { .company-marquee { animation-duration: 42s; } .company-marquee-card { width: 250px; } }
        @media (prefers-reduced-motion: reduce) {
          .hd-reveal, .hd-float, .hd-pulse-orb, .hd-shimmer::after { animation: none !important; }
          .hd-glow-card, .hd-magnetic, .hd-icon-bounce, .hd-img { transition: none !important; }
          .company-marquee { animation: none; transform: none; flex-wrap: wrap; width: auto; }
          .company-marquee-shell { mask-image: none; -webkit-mask-image: none; }
        }
        .hd-progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; transform-origin: 0 50%; transform: scaleX(var(--sp, 0)); background: linear-gradient(90deg,#00e5ff,#7c3aed,#ff4ecd); box-shadow: 0 0 14px rgba(0,229,255,.6); pointer-events: none; }
        .hd-rv { opacity: 0; will-change: transform, opacity, filter; transition: opacity 1s cubic-bezier(.2,.8,.2,1) var(--d,0ms), transform 1.1s cubic-bezier(.16,1,.3,1) var(--d,0ms), filter .9s ease var(--d,0ms); }
        .hd-rv[data-v="up"] { transform: translate3d(0,80px,0) scale(.97); filter: blur(10px); }
        .hd-rv[data-v="left"] { transform: translate3d(-110px,0,0) rotate(-3deg); filter: blur(8px); }
        .hd-rv[data-v="right"] { transform: translate3d(110px,0,0) rotate(3deg); filter: blur(8px); }
        .hd-rv[data-v="zoom"] { transform: scale(.72); filter: blur(10px); }
        .hd-rv[data-v="flip"] { transform: perspective(1000px) rotateX(28deg) translate3d(0,70px,0); transform-origin: 50% 100%; filter: blur(8px); }
        .hd-rv.is-in { opacity: 1; transform: none; filter: none; }
        .hd-tilt { position: relative; perspective: 1000px; }
        .hd-tilt-in { height: 100%; transform: rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition: transform .6s cubic-bezier(.16,1,.3,1); transform-style: preserve-3d; will-change: transform; }
        .hd-tilt:hover .hd-tilt-in { transition: transform .12s linear; }
        .hd-glare { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .35s; background: radial-gradient(420px circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.14), transparent 45%); }
        .hd-tilt:hover .hd-glare { opacity: 1; }
        .hd-spot { background: radial-gradient(520px circle at var(--mx,50%) var(--my,30%), rgba(0,229,255,.15), transparent 45%); }
        .hd-orb { position: absolute; border-radius: 9999px; filter: blur(70px); pointer-events: none; animation: hdDrift 14s ease-in-out infinite; }
        .hd-rise { animation: hdRise 1s cubic-bezier(.16,1,.3,1) both; animation-delay: var(--d,0ms); }
        .hd-word-mask { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: .14em; margin-bottom: -.14em; margin-right: .26em; }
        .hd-word { display: inline-block; transform: translateY(115%) rotate(6deg); animation: hdWord 1.1s cubic-bezier(.16,1,.3,1) forwards; }
        .hd-gradient-anim { background-size: 220% auto !important; animation: hdWord 1.1s cubic-bezier(.16,1,.3,1) forwards, hdGrad 4s ease-in-out infinite alternate; }
        .hd-tile { animation: hdTile 1.2s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(var(--i,0) * 150ms + 350ms); }
        .hd-stage { transform: perspective(1200px) rotateY(calc(var(--px,0) * 9deg)) rotateX(calc(var(--py,0) * -7deg)); transition: transform .5s cubic-bezier(.16,1,.3,1); transform-style: preserve-3d; }
        .hd-pop { animation: hdPopIn .9s cubic-bezier(.34,1.56,.64,1) both; animation-delay: var(--d,1.2s); }
        .hd-shine { position: relative; overflow: hidden; }
        .hd-shine::before { content: ""; position: absolute; top: 0; left: -70%; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-20deg); animation: hdShine 3.4s ease-in-out infinite; pointer-events: none; }
        .hd-ken { animation: hdKen 22s ease-in-out infinite alternate; transform-origin: 60% 40%; }
        .hd-cta { box-shadow: 0 0 0 1px rgba(0,229,255,.12), 0 30px 120px rgba(0,229,255,.1); }
        @keyframes hdRise { from { opacity: 0; transform: translate3d(0,34px,0); filter: blur(8px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes hdWord { to { transform: translateY(0) rotate(0); } }
        @keyframes hdGrad { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }
        @keyframes hdTile { from { opacity: 0; transform: translate3d(0,90px,0) scale(.55) rotate(-10deg); filter: blur(12px); } to { opacity: 1; transform: none; filter: blur(0); } }
        @keyframes hdPopIn { from { opacity: 0; transform: scale(.3) translateY(30px); } to { opacity: 1; transform: none; } }
        @keyframes hdDrift { 0%,100% { transform: translate3d(0,0,0) scale(1); } 33% { transform: translate3d(60px,-40px,0) scale(1.15); } 66% { transform: translate3d(-40px,50px,0) scale(.92); } }
        @keyframes hdShine { 0%,55% { left: -70%; } 100% { left: 130%; } }
        @keyframes hdKen { from { transform: scale(1.02) translate3d(0,0,0); } to { transform: scale(1.18) translate3d(-2%,-2%,0); } }
        @media (prefers-reduced-motion: reduce) {
          .hd-rv { opacity: 1 !important; transform: none !important; filter: none !important; transition: none !important; }
          .hd-rise, .hd-word, .hd-tile, .hd-pop, .hd-orb, .hd-ken, .hd-shine::before, .hd-gradient-anim { animation: none !important; }
          .hd-word, .hd-tile, .hd-pop, .hd-rise { opacity: 1; transform: none; }
          .hd-stage, .hd-tilt-in { transform: none !important; }
          .hd-progress { display: none; }
        }
        .hd-flip { perspective: 1400px; outline: none; cursor: pointer; }
        .hd-flip:focus-visible { box-shadow: 0 0 0 2px #00e5ff; }
        .hd-flip-in { position: relative; width: 100%; height: 100%; border-radius: inherit; transform-style: preserve-3d; transition: transform 1s cubic-bezier(.2,.9,.2,1); }
        .hd-face { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .hd-back { transform: rotateY(180deg); }
        .hd-flip.is-flipped .hd-flip-in, .hd-flip:focus-visible .hd-flip-in { transform: rotateY(180deg); }
        @media (hover: hover) { .hd-flip:hover .hd-flip-in { transform: rotateY(180deg); } }
        .hd-stack-in { transform-origin: 50% 0; transform: scale(calc(1 - var(--o, 0) * 0.075)) translate3d(0, calc(var(--o, 0) * -14px), 0); filter: brightness(calc(1 - var(--o, 0) * 0.5)); will-change: transform, filter; }
        .hd-rail-card { transition: transform .5s cubic-bezier(.16,1,.3,1), border-color .3s, box-shadow .4s; }
        .hd-rail-card:hover { transform: translateY(-12px) rotate(-1.5deg); border-color: rgba(0,229,255,.35); box-shadow: 0 30px 70px rgba(0,0,0,.4), 0 0 50px rgba(0,229,255,.12); }
        .hd-scrub { display: inline-block; margin-right: .28em; opacity: clamp(.12, calc(var(--p, 0) * var(--n) * 1.2 - var(--i) + .12), 1); transform: translate3d(0, calc((1 - clamp(0, calc(var(--p, 0) * var(--n) * 1.2 - var(--i)), 1)) * 16px), 0); }
        .hd-spin { animation: hdSpin 18s linear infinite; }
        .company-marquee-shell { transform: skewX(calc(var(--vel, 0) * -1deg)); }
        .company-marquee.rev { animation-direction: reverse; animation-duration: 40s; }
        @keyframes hdSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .hd-spin { animation: none !important; }
          .hd-stack-in { transform: none !important; filter: none !important; }
          .hd-scrub { opacity: 1 !important; transform: none !important; }
          .company-marquee-shell { transform: none !important; }
          .hd-flip-in { transition-duration: .01s; }
        }
        .hd-stack { top: calc(84px + var(--i, 0) * 16px); }
        .hd-par { transform: none; }
        .hd-rv.is-in { will-change: auto; }
        @media (min-width: 768px) {
          .hd-stack { top: calc(96px + var(--i, 0) * 26px); }
          .hd-stack:nth-child(odd) { transform: rotate(-.7deg); }
          .hd-stack:nth-child(even) { transform: rotate(.7deg); }
        }
        @media (min-width: 1024px) {
          .hd-par { transform: translate3d(0, calc(var(--sy, 0) * var(--ps, 0) * 1px), 0); }
          .hd-hero-copy { opacity: calc(1 - var(--sy, 0) / 900); transform: translate3d(0, calc(var(--sy, 0) * .1px), 0); }
        }
        @media (max-width: 767px) {
          .hd-rv[data-v]:not(.is-in) { filter: none; }
          .hd-rv[data-v="up"]:not(.is-in) { transform: translate3d(0,36px,0); }
          .hd-rv[data-v="left"]:not(.is-in) { transform: translate3d(-32px,0,0); }
          .hd-rv[data-v="right"]:not(.is-in) { transform: translate3d(32px,0,0); }
          .hd-rv[data-v="zoom"]:not(.is-in) { transform: scale(.92); }
          .hd-rv[data-v="flip"]:not(.is-in) { transform: translate3d(0,40px,0); }
          .hd-orb { filter: blur(48px); animation-duration: 22s; }
          .hd-stage { transform: none; }
          .hd-flip-in { transition-duration: .7s; }
        }
        @media (hover: none) {
          .hd-glow-card:hover, .hd-rail-card:hover, .company-marquee-card:hover, .hd-magnetic:hover { transform: none; box-shadow: none; }
          .hd-glow-card:hover .hd-icon-bounce, .hd-glow-card:hover .hd-img { transform: none; }
          .hd-glare { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hd-hero-copy, .hd-par, .hd-stack { transform: none !important; }
        }
      `}</style>

      <div ref={rootRef} className="relative mx-auto max-w-7xl overflow-x-clip px-4 sm:px-6">
        <div className="hd-progress" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] hd-grid" />
        <div className="pointer-events-none absolute left-[6%] top-[180px] -z-10 h-44 w-44 rounded-full bg-[#00e5ff]/10 blur-3xl hd-pulse-orb" />
        <div className="pointer-events-none absolute right-[6%] top-[360px] -z-10 h-56 w-56 rounded-full bg-[#7c3aed]/10 blur-3xl hd-pulse-orb" />

        {/* HERO */}
        <section onPointerMove={onHeroMove} className="relative overflow-hidden py-8 md:py-20">
          <Particles count={isNarrow ? 14 : 34} />
          <div className="hd-spot pointer-events-none absolute inset-0" aria-hidden />
          <div className="hd-orb -left-20 top-10 h-72 w-72 bg-[#00e5ff]/15" />
          <div className="hd-orb right-0 top-1/3 h-80 w-80 bg-[#7c3aed]/20" style={{ animationDelay: "-5s" }} />
          <div className="hd-orb bottom-0 left-1/3 h-64 w-64 bg-[#ff4ecd]/10" style={{ animationDelay: "-9s" }} />

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="hd-hero-copy">
              <div className="hd-rise inline-flex items-center gap-2 rounded-full border border-[#00e5ff]/20 bg-[#00e5ff]/5 px-4 py-1.5 text-xs text-white/75 backdrop-blur" style={cv({ "--d": "0ms" })}>
                <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
                Jobs, internships, fresher roles and remote opportunities
              </div>

              <h1
                className="mt-5 text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:mt-6 md:text-7xl"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                <Words text="Find your next" delay={250} />
                <Words text="career opportunity" delay={650} gradient />
              </h1>

              <p className="hd-rise mt-6 max-w-xl text-base leading-7 text-white/62 md:text-lg" style={cv({ "--d": "1000ms" })}>
                Explore current openings with structured role details, company information, location, experience, source and application information, all in one place.
              </p>

              <form
                action="/jobs"
                method="get"
                role="search"
                className="hd-rise hd-search glass mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 p-2 transition"
                style={cv({ "--d": "1150ms" })}
              >
                <Search className="ml-3 h-5 w-5 shrink-0 text-[#00e5ff]" />
                <input
                  name="q"
                  type="search"
                  aria-label="Search jobs"
                  placeholder="Role, company, skill or location"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base text-white outline-none placeholder:text-white/35 sm:text-sm"
                />
                <Magnetic className="shrink-0">
                  <button type="submit" className="btn-glow hd-shine flex items-center gap-2 rounded-xl px-5 py-3 text-sm">
                    Search <ArrowRight className="h-4 w-4" />
                  </button>
                </Magnetic>
              </form>

              <div className="hd-rise mt-5 flex flex-wrap items-center gap-2 text-xs text-white/50" style={cv({ "--d": "1300ms" })}>
                <span className="text-white/35">Popular:</span>
                {["Fresher Jobs", "Internship", "Remote", "Data Analyst"].map((t) => (
                  <a
                    key={t}
                    href={`/jobs?browse=${encodeURIComponent(t)}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 transition hover:-translate-y-0.5 hover:border-[#00e5ff]/30 hover:text-white"
                  >
                    {t}
                  </a>
                ))}
              </div>
            </div>

            {/* collage */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="hd-stage">
                <div className="grid grid-cols-5 grid-rows-6 gap-3">
                  {tile(0, -0.05, "col-span-3 row-span-4", IMG("photo-1522071820081-009f0129c71c", 900), "Team collaborating in a modern office", "min-h-[16rem]")}
                  {tile(1, 0.04, "col-span-2 row-span-3", IMG("photo-1573496359142-b8d87734a5a2", 600), "Confident professional")}
                  {tile(2, -0.03, "col-span-2 row-span-3", IMG("photo-1521737604893-d14cc237f11d", 600), "Colleagues reviewing work together")}
                  {tile(3, 0.07, "col-span-3 row-span-2", IMG("photo-1498050108023-c5249f4df085", 700), "Developer working on a laptop")}
                </div>
              </div>

              <div className="hd-pop absolute left-0 top-4 sm:-left-4 sm:top-10 md:-left-10" style={cv({ "--d": "1500ms" })}>
                <div className="glass hd-float flex items-center gap-3 rounded-2xl p-3 shadow-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/15"><Building2 className="h-5 w-5 text-[#00e5ff]" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">{companyStats.length || "Many"} companies</div>
                    <div className="text-[11px] text-white/45">in current listings</div>
                  </div>
                </div>
              </div>
              <div className="hd-pop absolute right-0 bottom-6 sm:-right-3 sm:bottom-12 md:-right-8" style={cv({ "--d": "1750ms" })}>
                <div className="glass hd-float hd-float-2 flex items-center gap-3 rounded-2xl p-3 shadow-xl">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7c3aed]/20"><BadgeCheck className="h-5 w-5 text-[#a78bfa]" /></div>
                  <div>
                    <div className="text-sm font-bold text-white">Source-aware</div>
                    <div className="text-[11px] text-white/45">verification details</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-3">
          <Stat value={allJobs.length} label="Current job listings" icon={BriefcaseBusiness} delay={0} />
          <Stat value={companyStats.length} label="Companies in this view" icon={Building2} delay={150} />
          <Stat value={verifiedCount} label="Listings marked verified" icon={BadgeCheck} delay={300} />
        </section>
        <p className="mx-auto max-w-3xl text-center text-xs leading-5 text-white/35">
          Counts are generated from the current Hire Daily listing data and can change as jobs are added, updated or removed.
        </p>

        {/* BROWSE */}
        <section className="py-4 md:py-8">
          <HRail
            items={BROWSE_ITEMS}
            head={
              <SectionHead
                icon={Search}
                eyebrow="Explore"
                title="Browse jobs"
                text="Start with the type of opportunity or location you are looking for, then refine the results on the jobs directory."
                to="/jobs"
                linkLabel="View all jobs"
              />
            }
          />
          <p className="mt-4 text-xs leading-5 text-white/35">
            Browse categories are connected to the live jobs directory. If a category has no matching listing, the directory shows a no-results state rather than inventing opportunities.
          </p>
        </section>

        {/* LATEST JOBS */}
        <section className="py-10 md:py-14">
          <SectionHead
            icon={Clock3}
            eyebrow="Current listings"
            title="Latest jobs"
            text="A live selection from the current Hire Daily job directory."
            to="/jobs"
          />
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : latest.length === 0 ? (
            <div className="glass rounded-3xl p-14 text-center">
              <Search className="mx-auto h-7 w-7 text-[#00e5ff]" />
              <h3 className="mt-5 text-lg font-semibold text-white">No active listings yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">New opportunities will appear here as they become available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {latest.map((job, i) => (
                <Reveal key={job.id} v="up" delay={(i % 3) * 130} className="h-full">
                  <JobCard job={job} index={i} />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* STATEMENT */}
        <section aria-label="Our approach">
          <ScrubText text="Every listing shows where it came from. Every job page shows what to check. You decide when to apply." />
        </section>

        {/* COMPANIES */}
        {companyStats.length > 0 && (
          <section className="relative overflow-hidden py-10 md:py-16">
            <SectionHead
              icon={Building2}
              eyebrow="Employer directory"
              title="Companies featured in job listings"
              text="Employer names are derived automatically from current Hire Daily listings. They are shown for identification and discovery, not as a claim of partnership or endorsement."
            />
            <MarqueeRow items={companyStats} />
            <MarqueeRow items={[...companyStats].reverse()} reverse />
            <div className="mt-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-5 text-white/35">
              Company names, trademarks and logos belong to their respective owners. Hire Daily does not represent these employers as partners unless a partnership is explicitly disclosed.
            </div>
          </section>
        )}

        {/* CATEGORY + LOCATION */}
        <section className="grid grid-cols-1 gap-6 py-10 md:py-16 lg:grid-cols-2">
          <Reveal v="left" className="h-full">
          <DirectoryPanel
            icon={BriefcaseBusiness}
            eyebrow="Job categories"
            title="Explore by category"
            description="Use the categories represented in the current listing data to narrow your search."
            items={categoryStats}
          />
          </Reveal>
          <Reveal v="right" className="h-full">
          <DirectoryPanel
            icon={MapPin}
            eyebrow="Locations"
            title="Explore by location"
            description="Find opportunities based on the locations currently represented in the directory."
            items={locationStats}
          />
          </Reveal>
        </section>

        {/* CANDIDATE GUIDE */}
        <section className="py-10 md:py-16">
          <SectionHead
            center
            icon={BookOpen}
            eyebrow="Candidate guide"
            title="More than a job list"
            text="A useful job search should help you understand an opportunity, not just send you somewhere else. Hire Daily organizes listing information and offers practical guidance so you can decide with confidence."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <FeatureCard step={1} icon={Search} title="Discover" body="Search opportunities by role, company, location, experience, job type and skills." back="Try the search bar or a category. Filters narrow results by role, company, location and skills." cta={{ label: "Browse jobs", to: "/jobs" }} />
            <FeatureCard step={2} icon={ShieldCheck} title="Review" body="Read the available role information, source details, eligibility and application context before continuing." back="Open a job page and check the source, eligibility, verification note and deadline before you continue." />
            <FeatureCard step={3} icon={ExternalLink} title="Apply" body="When you are ready, use the application destination provided on the individual listing." back="Use the application link on the listing, and be cautious about any request for payment." />
          </div>
        </section>

        {/* LISTING TRANSPARENCY */}
        <section className="py-10 md:py-16">
          <div className="glass-strong overflow-hidden rounded-3xl">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr]">
              <div className="relative min-h-[18rem]">
                <Photo src={IMG("photo-1454165804606-c3d57bc86b40", 1000)} alt="Reviewing a job description at a desk" className="hd-ken absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-0 p-7 text-white">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#00e5ff]">
                    <BadgeCheck className="h-4 w-4" /> Listing transparency
                  </div>
                  <h2 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                    Know what you are applying for
                  </h2>
                  <Link to="/jobs" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#00e5ff] hover:text-white">
                    Browse the job directory <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="p-6 md:p-9">
                <p className="mb-5 text-sm leading-7 text-white/55">
                  Individual job pages bring the important information together before a candidate leaves Hire Daily. The exact fields depend on what is available in the source listing.
                </p>
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
                  ].map(([title, text], i) => (
                    <Reveal key={title} v="up" delay={(i % 3) * 90 + Math.floor(i / 3) * 80} className="h-full">
                      <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:-translate-y-1 hover:border-[#00e5ff]/20">
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 text-xs leading-5 text-white/40">{text}</div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAREER RESOURCES */}
        <section className="py-10 md:py-16">
          <SectionHead
            icon={BookOpen}
            eyebrow="Career resources"
            title="Practical guidance for job seekers"
            text="Useful, candidate-focused guidance to complement the job directory."
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {CAREER_RESOURCES.map((r, i) => (
              <Reveal key={r.title} v={i % 2 ? "right" : "left"} delay={(i >> 1) * 150} className="h-full">
                <FlipCard
                  className="h-[27rem] rounded-2xl sm:h-[25rem] md:h-[27rem] lg:h-[25rem]"
                  front={
                    <article className="glass card-glow h-full overflow-hidden rounded-2xl border border-white/10">
                      <div className="relative h-48 overflow-hidden">
                        <Photo src={r.image} alt={r.title} className="hd-ken h-full w-full" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                        <div className="absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#00e5ff] text-slate-950 shadow-lg">
                          <r.icon className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-white">{r.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/55">{r.text}</p>
                        <div className="mt-4 text-xs text-[#00e5ff]/70">Hover or tap for quick tips</div>
                      </div>
                    </article>
                  }
                  back={
                    <div className="flex h-full flex-col justify-between rounded-2xl p-7 text-white" style={{ background: "linear-gradient(145deg,#0e7490 0%,#4338ca 55%,#6d28d9 100%)" }}>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <r.icon className="h-4 w-4" /> {r.title}
                        </div>
                        <ul className="mt-5 space-y-4">
                          {r.tips.map((t) => (
                            <li key={t} className="flex items-start gap-3 text-sm leading-6 text-white/95">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#a5f3fc]" /> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-xs text-white/60">Tap again to flip back</div>
                    </div>
                  }
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* CAREER SERVICES CTA */}
        <section className="py-10">
          <Reveal v="zoom">
          <div className="hd-cta relative overflow-hidden rounded-[2rem] border border-white/10">
            <Photo src={IMG("photo-1552664730-d307ca884978", 1600)} alt="Team in a career planning meeting" className="hd-ken absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/80 to-slate-950/95 md:bg-gradient-to-r md:from-slate-950 md:via-slate-950/85 md:to-slate-950/30" />
            <div className="pointer-events-none absolute right-14 top-1/2 z-10 hidden -translate-y-1/2 md:block">
              <RotatingBadge />
            </div>
            <div className="relative z-10 max-w-2xl p-6 sm:p-8 md:p-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#00e5ff] backdrop-blur">
                <Rocket className="h-3.5 w-3.5" /> Career services
              </div>
              <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
                Make your profile ready before you apply
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">
                Resume review from ₹29, resume building, LinkedIn optimization and premium portfolios. No payment upfront.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Magnetic className="w-full sm:w-auto">
                  <Link to="/services" className="btn-glow hd-shine group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm sm:w-auto">
                    View career services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Magnetic>
                <Link to="/jobs" className="btn-ghost-glow inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm sm:w-auto">
                  <GraduationCap className="h-4 w-4 text-[#00e5ff]" /> Explore fresher jobs
                </Link>
              </div>
            </div>
          </div>
          </Reveal>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-10 md:py-16">
          <SectionHead
            center
            icon={Instagram}
            eyebrow="Discovery flow"
            title="How Hire Daily works"
            text="Hire Daily connects social discovery with a structured web directory so candidates can move from a job post to the underlying opportunity page."
          />
          <StackSteps steps={STACK_STEPS} />
        </section>

        {/* WHY */}
        <section className="grid grid-cols-1 gap-5 py-10 md:py-16 md:grid-cols-3">
          <FeatureCard icon={Zap} title="Fresh opportunity discovery" body="The directory is built around current job listings and searchable filters rather than a static list of links." back="Counts, categories and locations are generated from live directory data, so they change as jobs do." />
          <FeatureCard icon={ShieldCheck} title="Source-aware listings" body="Job pages expose source and verification information when available so candidates can make their own checks." back="Where the source provides it, you can see where a job came from and its verification status and date." />
          <FeatureCard icon={CheckCircle2} title="Candidate-first experience" body="The goal is to help a candidate understand a role before sending them to an external application destination." back="Role details come first. The external application link comes after you have had a chance to review them." />
        </section>

        {/* FAQ */}
        <section id="faq" className="py-10 md:py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHead center icon={MessageCircle} eyebrow="Help" title="Frequently asked questions" />
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.q} v={i % 2 ? "right" : "left"} delay={i * 70}>
                <details className="glass hd-magnetic group rounded-2xl p-5 open:ring-1 open:ring-[#00e5ff]/25">
                  <summary className="flex cursor-pointer items-center justify-between gap-5 text-sm font-medium text-white">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/45 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{faq.a}</p>
                </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TRANSPARENCY NOTE */}
        <section className="pb-20 pt-8">
          <Reveal v="flip">
          <div className="rounded-3xl border border-[#00e5ff]/10 bg-gradient-to-br from-[#00e5ff]/5 via-transparent to-[#7c3aed]/5 p-7 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                <Globe2 className="h-5 w-5 text-[#00e5ff]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">A transparent way to explore job opportunities</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-white/55">
                  Hire Daily is a discovery and information layer for candidates. We organize job information into searchable pages and provide context around the available source, verification and application details. Employer names shown on this site identify companies referenced by listings; they should not be interpreted as endorsements, partnerships or guarantees of hiring unless explicitly stated.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to="/about" className="btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
                    About Hire Daily <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/how-we-verify-jobs" className="btn-ghost-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm">
                    How we verify jobs <ShieldCheck className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}

function DirectoryPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
}: {
  icon: typeof Search;
  eyebrow: string;
  title: string;
  description: string;
  items: [string, number][];
}): ReactNode {
  return (
    <div className="glass h-full rounded-3xl p-6 md:p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5ff]">
        <Icon className="h-4 w-4" /> {eyebrow}
      </div>
      <h2 className="mt-3 text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/50">{description}</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {items.map(([item, count]) => (
          <a
            key={item}
            href={`/jobs?q=${encodeURIComponent(item)}`}
            className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 transition hover:border-[#00e5ff]/20 hover:bg-white/[0.05]"
          >
            <span className="truncate text-xs font-medium text-white/80">{item}</span>
            <span className="ml-2 shrink-0 text-[10px] text-white/30 group-hover:text-[#00e5ff]">{count}</span>
          </a>
        ))}
      </div>
    </div>
  );
}