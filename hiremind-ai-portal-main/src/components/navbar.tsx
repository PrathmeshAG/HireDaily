import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  {to: "/about", label: "About" },
  {to: "/about", label: "Disclaimer" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div
          className={`glass flex items-center justify-between rounded-2xl px-4 py-3 transition-all ${
            scrolled ? "shadow-[0_8px_32px_-8px_rgba(0,229,255,0.25)]" : ""
          }`}
        >
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] shadow-[0_0_20px_rgba(0,229,255,0.4)] group-hover:animate-glow">
              {/* <Sparkles className="h-5 w-5 text-[#050816]" strokeWidth={2.5} /> */}
              <img
  src="/favicon.ico"
  alt="Hire Daily Logo"
  className="w-10 h-10"
/>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-bold tracking-tight text-white">Hire Daily</span>
              <span className="text-[10px] uppercase tracking-widest text-white/50">
                HireMind AI
              </span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`relative rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" />
                  )}
                </Link>
              );
            })}
            <Link
              to="/jobs"
              className="btn-glow ml-2 rounded-xl px-4 py-2 text-sm"
            >
              Browse Jobs
            </Link>
             
          </nav>

          <button
            className="btn-ghost-glow rounded-lg p-2 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="glass mt-2 rounded-2xl p-3 md:hidden animate-scale-in">
            <div className="flex flex-col">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="rounded-lg px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/jobs" className="btn-glow mt-2 rounded-xl px-4 py-3 text-center text-sm">
                Browse Jobs
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}