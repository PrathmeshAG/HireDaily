import { Link } from "@tanstack/react-router";
import { Sparkles, Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/5 bg-[#050816]/60 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed]">
              <Sparkles className="h-5 w-5 text-[#050816]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-base font-bold text-white">Hire Daily</div>
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                By HireMind AI
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Fresh, verified opportunities updated every day. Find your dream job faster with
            AI-powered matching.
          </p>
          <div className="mt-6 flex gap-3">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="btn-ghost-glow flex h-9 w-9 items-center justify-center rounded-lg"
                aria-label="social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Product</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link to="/jobs" className="hover:text-[#00e5ff]">
                Browse Jobs
              </Link>
            </li>
            <li>
              <Link to="/how-we-verify-jobs"  className="hover:text-[#00e5ff]">
                How we verify jobs
              </Link>
            </li>
            <li>
              <Link to="/" hash="faq" className="hover:text-[#00e5ff]">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link to="/contact"  className="hover:text-[#00e5ff]">
            Contact
            </Link> 
            </li>
            <li><Link to="/privacy"  className="hover:text-[#00e5ff]" >Privacy Policy</Link></li>
            <li><Link to="/terms"  className="hover:text-[#00e5ff]" >Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} HireMind AI — Hire Daily. Find Your Dream Job Faster.
      </div>
    </footer>
  );
}