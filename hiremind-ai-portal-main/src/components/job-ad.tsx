import { Megaphone, ArrowRight } from "lucide-react";

/**
 * JobAd
 *
 * A single, reusable "sponsored" placement designed to sit naturally inside
 * the job listings grid (same width/rounding/shadow language as JobCard).
 *
 * This is a static placeholder today. When you're ready to wire up Google
 * AdSense (or any other ad network), replace the content below the
 * "Google AdSense code goes here" comment — the outer wrapper (sizing,
 * spacing, rounded corners, border, shadow) can stay exactly as-is.
 */
export function JobAd() {
  return (
    <div
      className="glass card-glow group relative col-span-full flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-6 text-center shadow-lg shadow-black/20 animate-fade-up sm:flex-row sm:items-center sm:gap-5 sm:text-left"
      aria-label="Advertisement"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[#7c3aed]/10 blur-3xl transition-opacity group-hover:opacity-100" />

      {/* Google AdSense code goes here */}

      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 ring-1 ring-white/10">
        <Megaphone className="h-5 w-5 text-[#00e5ff]" />
      </div>

      <div className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 ring-1 ring-white/10">
          Sponsored
        </span>
        <h3 className="mt-2 text-lg font-semibold text-white">
          🚀 Promote Your Business Here
        </h3>
        <p className="mt-1 text-sm text-white/60">
          Reach thousands of students, freshers, and professionals searching for jobs every day.
        </p>
      </div>

      <a
        href="mailto:your-email@example.com"
        className="btn-glow flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm whitespace-nowrap"
      >
        Advertise With Us <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
