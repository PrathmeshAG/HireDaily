import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  FileText,
  FilePlus2,
  Linkedin,
  Globe2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Chrome,
  ClipboardCheck,
  LibraryBig,
  Wrench,
  ArrowRight,
  Code2,
} from "lucide-react";
import { AuthSheet } from "./auth-sheet";
import { useAuth } from "../lib/auth-context";

type NavLink = { to: string; hash?: string; label: string };

const links: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  { to: "/blog", label: "Guides" },
  { to: "/about", label: "About" },
  { to: "/about", hash: "disclaimer", label: "Disclaimer" },
];

const services = [
  { to: "/services", hash: "resume-review", label: "Resume Review", icon: FileText },
  { to: "/services", hash: "resume-building", label: "Resume Building", icon: FilePlus2 },
  { to: "/services", hash: "linkedin", label: "LinkedIn Optimization", icon: Linkedin },
  { to: "/services", hash: "portfolio", label: "Premium Portfolio", icon: Globe2 },
];

const preparation = [
  {
    to: "/preparation/interview",
    label: "Interview Preparation",
    description: "HR, technical and domain-wise interview preparation.",
    icon: ClipboardCheck,
  },
  {
    to: "/preparation/coding-practice",
    label: "Coding Practice",
    description: "Write code, run tests and learn from every error.",
    icon: Code2,
  },
  {
    to: "/preparation/study-material",
    label: "Study Material",
    description: "Notes, cheat sheets and career roadmaps.",
    icon: LibraryBig,
  },
  {
    to: "/preparation/tools-resources",
    label: "Tools & Resources",
    description: "Useful tools, platforms and career resources.",
    icon: Wrench,
  },
];

type AuthMode = "signin" | "signup" | null;
type Menu = "prep" | "services" | null;

/* ---------- shared class tokens (light + dark) ---------- */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8bd]/60 dark:focus-visible:ring-[#00e5ff]/60";
const navItem = `relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${focusRing}`;
const navIdle = "text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white";
const navActive = "text-slate-900 dark:text-white";
const panel =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-[#090b12]/95 dark:shadow-black/50 animate-scale-in";
const rowHover = "hover:bg-slate-100 dark:hover:bg-white/5";
const iconTile =
  "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/15 text-[#0891a6] dark:text-[#00e5ff]";
const iconBtn = `flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/85 dark:hover:bg-white/10 ${focusRing}`;

/* ---------- small pieces ---------- */

function Accordion({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className={`overflow-hidden transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}>{children}</div>
    </div>
  );
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className={iconBtn}>
      <span className="relative block h-[18px] w-[18px]">
        <Sun className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        <Moon className={`absolute inset-0 h-[18px] w-[18px] transition-all duration-300 ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      </span>
    </button>
  );
}

function AuthField({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  icon: typeof Mail;
  type?: string;
  placeholder: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
        <input
          required
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 ${isPassword ? "pr-12" : "pr-4"} text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0891a6] focus:bg-white focus:ring-4 focus:ring-[#00e5ff]/10 sm:text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/25 dark:focus:border-[#00e5ff]/50 dark:focus:bg-white/[0.06]`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-700 dark:text-white/35 dark:hover:text-white/70"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

/* ---------- navbar ---------- */

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [mSection, setMSection] = useState<Menu>(null);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [comingSoon, setComingSoon] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => String(s.location.hash ?? "").replace("#", "") });

  const isActive = (l: NavLink) => {
    if (l.hash) return pathname === l.to && hash === l.hash;
    if (l.to === "/") return pathname === "/";
    if (l.to === "/about") return pathname.startsWith("/about") && hash !== "disclaimer";
    return pathname.startsWith(l.to);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
    setMSection(null);
  }, [pathname]);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  // Escape closes everything
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAuthMode(null);
      setMenu(null);
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // click outside closes desktop dropdowns
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menu]);

  // lock page scroll while the mobile menu or auth sheet is open
  useEffect(() => {
    document.body.style.overflow = open || authMode ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, authMode]);

  // close the mobile menu when the viewport grows to desktop
  useEffect(() => {
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    const root = document.documentElement;
    root.classList.toggle("dark", nextDark);
    root.classList.toggle("light", !nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";
    try {
      localStorage.setItem("hire-daily-theme", nextDark ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  };

  const openAuth = (mode: Exclude<AuthMode, null>) => {
    setAuthMode(mode);
    setComingSoon(false);
    setOpen(false);
    setMenu(null);
  };

  useEffect(() => {
    const onOpen = (e: Event) => openAuth((e as CustomEvent<"signin" | "signup">).detail || "signin");
    window.addEventListener("hd-open-auth", onOpen);
    return () => window.removeEventListener("hd-open-auth", onOpen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goAccount = () => {
    setOpen(false);
    setMenu(null);
    if (user) void navigate({ to: "/profile" });
    else openAuth("signin");
  };
  const accountLabel = user ? user.displayName?.split(" ")[0] || "Profile" : "Sign in";

  const submitComingSoon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComingSoon(true);
  };

  const hoverProps = (id: Exclude<Menu, null>) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setMenu(id),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setMenu((m) => (m === id ? null : m)),
  });

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-3 sm:py-4"}`}>
        <div className="mx-auto max-w-[1400px] px-3 sm:px-4">
          <div
            className={`flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2.5 backdrop-blur-xl transition-shadow sm:px-4 sm:py-3 dark:border-white/10 dark:bg-[#0b0f1a]/70 ${
              scrolled ? "shadow-[0_8px_30px_-10px_rgba(15,23,42,0.2)] dark:shadow-[0_8px_32px_-8px_rgba(0,229,255,0.25)]" : ""
            }`}
          >
            {/* logo */}
            <Link to="/" className={`group flex items-center gap-2.5 rounded-xl ${focusRing}`}>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-transform group-hover:scale-105">
                <img src="/favicon.ico" alt="" className="h-7 w-7 object-contain" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Hire Daily</span>
                <span className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/50">Jobs &amp; Career Guides</span>
              </div>
            </Link>

            {/* desktop nav */}
            <nav ref={navRef} className="hidden items-center gap-0.5 whitespace-nowrap lg:flex" aria-label="Main">
              {links.map((l) => {
                const active = isActive(l);
                return (
                  <Link key={l.label} to={l.to} hash={l.hash} aria-current={active ? "page" : undefined} className={`${navItem} ${active ? navActive : navIdle}`}>
                    {l.label}
                    {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" />}
                  </Link>
                );
              })}

              {/* preparation */}
              <div className="relative" {...hoverProps("prep")}>
                <button
                  type="button"
                  aria-expanded={menu === "prep"}
                  onClick={() => setMenu((m) => (m === "prep" ? null : "prep"))}
                  className={`${navItem} ${pathname.startsWith("/preparation") ? navActive : navIdle}`}
                >
                  Preparation
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${menu === "prep" ? "rotate-180" : ""}`} />
                </button>
                {menu === "prep" && (
                  <div className="absolute right-0 top-full pt-2">
                    <div className={`w-[340px] max-w-[calc(100vw-2rem)] origin-top-right ${panel}`}>
                      <div className="px-3 pb-2 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0891a6] dark:text-[#00e5ff]">Career Preparation</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/40">Learn smarter. Prepare better. Get hired.</p>
                      </div>
                      {preparation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link key={item.to} to={item.to} className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 ${rowHover}`}>
                            <div className={`h-10 w-10 transition-transform group-hover:scale-105 ${iconTile}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</div>
                              <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-white/40">{item.description}</div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-white/25" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* services */}
              <div className="relative" {...hoverProps("services")}>
                <button
                  type="button"
                  aria-expanded={menu === "services"}
                  onClick={() => setMenu((m) => (m === "services" ? null : "services"))}
                  className={`${navItem} ${pathname.startsWith("/services") ? navActive : navIdle}`}
                >
                  Services
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${menu === "services" ? "rotate-180" : ""}`} />
                </button>
                {menu === "services" && (
                  <div className="absolute right-0 top-full pt-2">
                    <div className={`w-72 max-w-[calc(100vw-2rem)] origin-top-right ${panel}`}>
                      {services.map((s) => {
                        const Icon = s.icon;
                        return (
                          <Link key={s.hash} to={s.to} hash={s.hash} onClick={() => setMenu(null)} className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${rowHover}`}>
                            <div className={`h-9 w-9 transition-transform group-hover:scale-105 ${iconTile}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{s.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={goAccount}
                className={`group ml-1 flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0891a6]/40 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/90 dark:hover:border-[#00e5ff]/30 dark:hover:bg-white/10 ${focusRing}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/15 text-[#0891a6] transition-transform group-hover:scale-105 dark:text-[#00e5ff]">
                  <User className="h-3.5 w-3.5" />
                </span>
                {accountLabel}
              </button>

              <div className="ml-1">
                <ThemeToggle dark={darkMode} onToggle={toggleTheme} />
              </div>

              <Link to="/jobs" className="btn-glow ml-1 shrink-0 rounded-xl px-4 py-2.5 text-sm">
                Browse Jobs
              </Link>
            </nav>

            {/* mobile controls */}
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle dark={darkMode} onToggle={toggleTheme} />
              <button
                type="button"
                className={iconBtn}
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="mobile-menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* mobile menu */}
          {open && (
            <div
              id="mobile-menu"
              className="mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#090b12]/95 dark:shadow-black/50 animate-scale-in"
            >
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {links.map((l) => {
                  const active = isActive(l);
                  return (
                    <Link
                      key={l.label}
                      to={l.to}
                      hash={l.hash}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-[15px] font-medium transition ${
                        active ? "bg-gradient-to-r from-[#00e5ff]/15 to-[#7c3aed]/15 text-slate-900 dark:text-white" : `text-slate-700 dark:text-white/80 ${rowHover}`
                      }`}
                    >
                      {l.label}
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-[#0891a6] dark:bg-[#00e5ff]" />}
                    </Link>
                  );
                })}

                {/* preparation accordion */}
                <button
                  type="button"
                  onClick={() => setMSection((s) => (s === "prep" ? null : "prep"))}
                  aria-expanded={mSection === "prep"}
                  className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-[15px] font-medium text-slate-700 transition dark:text-white/80 ${rowHover}`}
                >
                  Preparation
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mSection === "prep" ? "rotate-180" : ""}`} />
                </button>
                <Accordion open={mSection === "prep"}>
                  <div className="ml-4 space-y-1 border-l border-slate-200 py-1 pl-2 dark:border-white/10">
                    {preparation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${rowHover}`}>
                          <div className={`h-9 w-9 ${iconTile}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</div>
                            <div className="text-xs leading-4 text-slate-500 dark:text-white/40">{item.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </Accordion>

                {/* services accordion */}
                <button
                  type="button"
                  onClick={() => setMSection((s) => (s === "services" ? null : "services"))}
                  aria-expanded={mSection === "services"}
                  className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-[15px] font-medium text-slate-700 transition dark:text-white/80 ${rowHover}`}
                >
                  Services
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mSection === "services" ? "rotate-180" : ""}`} />
                </button>
                <Accordion open={mSection === "services"}>
                  <div className="ml-4 space-y-1 border-l border-slate-200 py-1 pl-2 dark:border-white/10">
                    {services.map((s) => {
                      const Icon = s.icon;
                      return (
                        <Link key={s.hash} to={s.to} hash={s.hash} onClick={() => setOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 transition ${rowHover}`}>
                          <div className={`h-8 w-8 ${iconTile}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-white/85">{s.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </Accordion>
              </nav>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={goAccount}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-white/90"
                >
                  <User className="h-4 w-4 text-[#0891a6] dark:text-[#00e5ff]" />
                  {accountLabel}
                </button>
                <Link to="/jobs" onClick={() => setOpen(false)} className="btn-glow flex min-h-12 items-center justify-center rounded-xl text-sm">
                  Browse Jobs
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <AuthSheet mode={authMode} onClose={() => setAuthMode(null)} onSwitch={(m) => setAuthMode(m)} />
    </>
  );
}