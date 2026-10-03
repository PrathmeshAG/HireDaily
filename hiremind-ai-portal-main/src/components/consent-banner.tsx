import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";

/**
 * Lightweight cookie notice.
 *
 * - "Accept" keeps Google ads personalised.
 * - "Reject" switches Google ads to non-personalised mode.
 * - The choice is stored in this browser and can be changed from the footer ("Cookie settings").
 *
 * IMPORTANT for EU/EEA/UK visitors: Google requires a Google-certified consent platform (CMP)
 * to serve AdSense ads there. This banner is NOT certified. Turn on Google's free CMP under
 * AdSense > Privacy & messaging > European regulations, and keep this banner only as a
 * global cookie notice. Do not show two banners: if you enable Google's, remove <ConsentBanner />
 * from __root.tsx and keep the Cookie settings link pointing to Google's message.
 */
const KEY = "hd-consent";
export const OPEN_EVENT = "hd-open-consent";

type Choice = "accepted" | "rejected";

function applyToAds(choice: Choice) {
  const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
  w.adsbygoogle = w.adsbygoogle || [];
  w.adsbygoogle.requestNonPersonalizedAds = choice === "rejected" ? 1 : 0;
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Choice | null;
      if (saved === "accepted" || saved === "rejected") applyToAds(saved);
      else setVisible(true);
    } catch {
      setVisible(true);
    }
    const open = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const choose = (choice: Choice) => {
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* storage unavailable */
    }
    applyToAds(choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:left-4 sm:right-auto sm:p-5 dark:border-white/10 dark:bg-[#0b1020]/95"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-[#00e5ff]/10 dark:text-[#00e5ff]">
          <Cookie className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">We value your privacy</p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">
            We use cookies to run the site, measure traffic and show ads through Google AdSense. You can accept
            personalised ads or choose non-personalised ads. Read our{" "}
            <Link to="/privacy" className="font-semibold text-cyan-700 underline dark:text-[#00e5ff]">Privacy Policy</Link>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => choose("accepted")} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-[#00e5ff] dark:text-slate-950 dark:hover:bg-cyan-300">
              Accept
            </button>
            <button onClick={() => choose("rejected")} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5">
              Non-personalised only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
