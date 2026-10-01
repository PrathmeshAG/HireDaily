import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  BookOpen,
  ClipboardCheck,
  LibraryBig,
  Wrench,
} from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  { to: "/about", label: "About" },
  { to: "/about", label: "Disclaimer" },
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

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [preparationOpen, setPreparationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setServicesOpen(false);
    setPreparationOpen(false);
  }, [pathname]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthMode(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.classList.toggle("light", !nextDark);
    localStorage.setItem("hire-daily-theme", nextDark ? "dark" : "light");
  };

  const openAuth = (mode: Exclude<AuthMode, null>) => {
    setAuthMode(mode);
    setComingSoon(false);
    setOpen(false);
  };

  const submitComingSoon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setComingSoon(true);
  };

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "py-2" : "py-4"}`}>
        <div className="mx-auto max-w-[1400px] px-4">
          <div className={`glass flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${scrolled ? "shadow-[0_8px_32px_-8px_rgba(0,229,255,0.25)]" : ""}`}>
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] shadow-[0_0_20px_rgba(0,229,255,0.4)] group-hover:animate-glow">
                <img src="/favicon.ico" alt="Hire Daily Logo" className="w-10 h-10" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Hire Daily</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/50">HireMind AI</span>
              </div>
            </Link>

            <nav className="hidden items-center gap-0 whitespace-nowrap md:flex">
              {links.map((l) => {
                const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
                return (
                  <Link key={l.label} to={l.to} className={`relative rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white/70 hover:text-slate-900 dark:text-white"}`}>
                    {l.label}
                    {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" />}
                  </Link>
                );
              })}

              <div
                className="relative"
                onMouseEnter={() => setPreparationOpen(true)}
                onMouseLeave={() => setPreparationOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setPreparationOpen((value) => !value)}
                  className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    pathname.startsWith("/preparation")
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-900 dark:text-white/70 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Preparation
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${preparationOpen ? "rotate-180" : ""}`} />
                </button>

                {preparationOpen && (
                  <div className="absolute right-0 top-full pt-2">
                    <div className="glass w-[340px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#090b12]/95 animate-scale-in">
                      <div className="px-3 pb-2 pt-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#00a8bd] dark:text-[#00e5ff]">
                          Career Preparation
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/40">
                          Learn smarter. Prepare better. Get hired.
                        </p>
                      </div>
                      {preparation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-white/5"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/10 to-[#7c3aed]/10 text-[#00a8bd] transition-transform group-hover:scale-105 dark:text-[#00e5ff]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {item.label}
                              </div>
                              <div className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-white/40">
                                {item.description}
                              </div>
                            </div>
                            <span className="text-slate-400 transition-transform group-hover:translate-x-0.5 dark:text-white/25">→</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
                <button type="button" onClick={() => setServicesOpen((value) => !value)} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname.startsWith("/services") ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-white/70 hover:text-slate-900 dark:text-white"}`}>
                  Services
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
                </button>

                {servicesOpen && (
                  <div className="absolute right-0 top-full pt-2">
                    <div className="glass w-72 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#090b12]/95 animate-scale-in">
                      {services.map((service) => {
                        const Icon = service.icon;
                        return (
                          <Link key={service.hash} to={service.to} hash={service.hash} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-white/5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e5ff]/10 to-[#7c3aed]/10 text-[#00a8bd] transition group-hover:scale-105 dark:text-[#00e5ff]">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <div className="text-sm font-medium text-slate-900 dark:text-white">{service.label}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => openAuth("signin")}
                className="group ml-1 flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-900 dark:text-white/85 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00a8bd]/30 hover:bg-slate-50 hover:text-slate-950 dark:hover:border-[#00e5ff]/25 dark:hover:bg-white/[0.08] dark:hover:text-slate-900 dark:text-white"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/15 text-[#00e5ff] transition-transform group-hover:scale-105">
                  <User className="h-3.5 w-3.5" />
                </span>
                Account
              </button>

              <button type="button" onClick={toggleTheme} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Light mode" : "Dark mode"} className="btn-ghost-glow ml-1 rounded-xl p-2 transition-transform hover:scale-105">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <Link to="/jobs" className="btn-glow ml-1 shrink-0 rounded-xl px-3 py-2 text-sm">Browse Jobs</Link>
            </nav>

            <button className="btn-ghost-glow rounded-lg p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {open && (
            <div className="glass mt-2 rounded-2xl p-3 md:hidden animate-scale-in">
              <div className="flex flex-col">
                {links.map((l) => (
                  <Link key={l.label} to={l.to} className="rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white/80 hover:bg-white/5 hover:text-slate-900 dark:text-white">{l.label}</Link>
                ))}

                <button type="button" onClick={() => setServicesOpen((value) => !value)} className="flex items-center justify-between rounded-lg px-4 py-3 text-sm text-slate-900 dark:text-white/80 hover:bg-white/5 hover:text-slate-900 dark:text-white">
                  <span>Services</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} />
                </button>

                {servicesOpen && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-2">
                    {services.map((service) => {
                      const Icon = service.icon;
                      return (
                        <Link key={service.hash} to={service.to} hash={service.hash} className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white/70 hover:bg-white/5 hover:text-slate-900 dark:text-white">
                          <Icon className="h-4 w-4 text-[#00e5ff]" />
                          <span className="flex-1">{service.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-900 dark:text-white/85 transition hover:bg-slate-50 hover:text-slate-950 dark:hover:bg-white/[0.08] dark:hover:text-slate-900 dark:text-white"
                >
                  <User className="h-4 w-4 text-[#00e5ff]" />
                  Account
                </button>

                <button type="button" onClick={toggleTheme} className="btn-ghost-glow mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </button>

                <Link to="/jobs" className="btn-glow mt-2 rounded-xl px-4 py-3 text-center text-sm">Browse Jobs</Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {authMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-8 backdrop-blur-md dark:bg-black/70" onMouseDown={() => setAuthMode(null)}>
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#090b12] dark:shadow-[0_30px_100px_rgba(0,0,0,0.55)] animate-scale-in" onMouseDown={(event) => event.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#00e5ff] via-[#7c3aed] to-[#00e5ff]" />

            <button type="button" onClick={() => setAuthMode(null)} className="absolute right-4 top-4 z-10 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-500 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-slate-900 dark:text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 pb-7 pt-8 sm:px-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff]/15 to-[#7c3aed]/20 text-[#00e5ff] shadow-[0_0_35px_rgba(0,229,255,0.12)]">
                <User className="h-6 w-6" />
              </div>

              <div className="text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#00e5ff]">Your Hire Daily Account</p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {authMode === "signin" ? "Welcome Back" : "Create Your Account"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/50">
                  {authMode === "signin" ? "Sign in to manage your Hire Daily experience." : "Create your profile now and unlock account features when authentication launches."}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-[#00e5ff]/10 bg-gradient-to-r from-[#00e5ff]/5 to-[#7c3aed]/5 px-4 py-3 text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#00e5ff]">Coming Soon</span>
                <p className="mt-1 text-xs text-slate-900 dark:text-slate-500 dark:text-white/45">Authentication is currently under development.</p>
              </div>

              <form onSubmit={submitComingSoon} className="mt-6 space-y-3">
                {authMode === "signup" && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">Full Name</span>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                      <input required type="text" placeholder="Your name" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-900 dark:text-white/25 focus:border-[#00a8bd]/50 dark:focus:border-[#00e5ff]/40" />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">Email Address</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                    <input required type="email" placeholder="you@example.com" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] pl-10 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-900 dark:text-white/25 focus:border-[#00a8bd]/50 dark:focus:border-[#00e5ff]/40" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">Password</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                    <input required type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] pl-10 pr-11 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-900 dark:text-white/25 focus:border-[#00a8bd]/50 dark:focus:border-[#00e5ff]/40" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35 hover:text-slate-900 dark:text-white/70" aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {authMode === "signup" && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">Re-enter Password</span>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                      <input required type={showRePassword ? "text" : "password"} placeholder="••••••••" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] pl-10 pr-11 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-900 dark:text-white/25 focus:border-[#00a8bd]/50 dark:focus:border-[#00e5ff]/40" />
                      <button type="button" onClick={() => setShowRePassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35 hover:text-slate-900 dark:text-white/70" aria-label="Toggle password visibility">
                        {showRePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
                )}

                <button type="button" onClick={() => setComingSoon(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-slate-900 dark:text-white transition hover:-translate-y-0.5 hover:bg-white/[0.09]">
                  <Chrome className="h-4 w-4" />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-900 dark:text-white/30">or</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/10" />
                </div>

                <button type="submit" className="btn-glow flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold">
                  {authMode === "signin" ? "Sign In" : "Create Account"}
                </button>

                {comingSoon && (
                  <div className="rounded-xl border border-[#00a8bd]/20 dark:border-[#00e5ff]/15 bg-[#00a8bd]/5 dark:bg-[#00e5ff]/5 px-4 py-3 text-center text-xs font-medium text-[#007f91] dark:text-[#8eefff]">
                    Coming Soon — account authentication will be available in a future update.
                  </div>
                )}
              </form>

              <p className="mt-5 text-center text-sm text-slate-900 dark:text-slate-500 dark:text-white/45">
                {authMode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => { setAuthMode(authMode === "signin" ? "signup" : "signin"); setComingSoon(false); }} className="font-semibold text-[#00e5ff] hover:underline">
                  {authMode === "signin" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
