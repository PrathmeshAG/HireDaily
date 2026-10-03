import { Link } from "@tanstack/react-router";
import { Sparkles, Github, Twitter, Linkedin, Instagram } from "lucide-react";
import { SITE } from "../lib/site";
import { OPEN_EVENT } from "./consent-banner";

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
                Job Discovery Platform
              </div>
            </div>
          </div>

          <p className="mt-4 max-w-sm text-sm text-white/60">
            Fresh job opportunities with structured role details, source information,
            verification details, and application links to help candidates evaluate
            opportunities before applying.
          </p>

          {(() => {
            const socials = [
              { name: "Instagram", Icon: Instagram, href: SITE.social.instagram },
              { name: "LinkedIn", Icon: Linkedin, href: SITE.social.linkedin },
              { name: "X", Icon: Twitter, href: SITE.social.x },
              { name: "GitHub", Icon: Github, href: SITE.social.github },
            ].filter((x) => x.href);
            // Icons are shown only for real profiles, so no link ever points to "#".
            return socials.length ? (
              <div className="mt-6 flex gap-3">
                {socials.map(({ name, Icon, href }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer me" className="btn-ghost-glow flex h-9 w-9 items-center justify-center rounded-lg" aria-label={`Hire Daily on ${name}`}>
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null;
          })()}
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
              <Link to="/blog" className="hover:text-[#00e5ff]">
                Career guides
              </Link>
            </li>
            <li>
              <Link to="/preparation/coding-practice" className="hover:text-[#00e5ff]">
                Coding practice
              </Link>
            </li>
            <li>
              <Link to="/how-we-verify-jobs" className="hover:text-[#00e5ff]">
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
              <Link to="/about" className="hover:text-[#00e5ff]">
                About
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-[#00e5ff]">
                Contact
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-[#00e5ff]">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-[#00e5ff]">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className="hover:text-[#00e5ff]">
                Cookie settings
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}.
      </div>
    </footer>
  );
}
