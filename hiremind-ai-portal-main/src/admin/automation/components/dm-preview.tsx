import { ExternalLink, Link2 } from "lucide-react";

/** Mirrors backend limits (backend/src/services/job-links.ts). */
export const BUTTON_TITLE_MAX = 20;
export const MAX_BUTTON_TEMPLATE_LINKS = 3;

function clip(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/** "1. Frontend Develo…" — same numbering the backend puts on the button. */
export function buttonTitle(index: number, label: string): string {
  const prefix = `${index + 1}. `;
  return `${prefix}${clip(label, BUTTON_TITLE_MAX - prefix.length)}`;
}

/** Names-only numbered list used in the text above the buttons. */
export function namesBlock(labels: string[]): string {
  return labels.map((l, i) => `${i + 1}. ${clip(l, 60)}`).join("\n");
}

export interface DmPreviewProps {
  /** Message text already rendered with sample/real values. */
  text: string;
  /** Names of the links, in order. One entry = single link. */
  labels: string[];
  /** Label of the single native button (1 link only). Null = no button. */
  singleButtonLabel?: string | null;
  className?: string;
}

/**
 * How the DM looks in Instagram:
 *  - 1 link   → text + one native button
 *  - 2-3 link → text + one button per link
 *  - 4-5 link → swipeable cards, one per link, each with its own button
 */
export function DmPreview({ text, labels, singleButtonLabel, className = "" }: DmPreviewProps) {
  const count = labels.length;

  return (
    <div className={`rounded-2xl bg-[#0b1220]/70 p-3 ring-1 ring-white/10 ${className}`}>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#00e5ff] to-[#7c3aed]" />
        <span className="text-xs font-medium text-white/80">hire_daily</span>
        <span className="text-[10px] text-white/30">now</span>
      </div>

      {count >= 4 ? (
        <>
          <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2">
            {labels.map((label, i) => (
              <div key={`${label}-${i}`} className="hd-pop w-44 shrink-0 snap-start overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex h-16 items-center justify-center bg-gradient-to-br from-[#00e5ff]/25 to-[#7c3aed]/30 text-2xl">💼</div>
                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{clip(label, 80)}</p>
                  <p className="mt-1 text-[10px] text-white/45">Option {i + 1} of {count}</p>
                </div>
                <div className="border-t border-white/10 px-3 py-2 text-center text-xs font-semibold text-[#67e8f9]">View &amp; Apply</div>
              </div>
            ))}
          </div>
          <p className="px-1 text-[10px] text-white/35">Swipe sideways to see all {count} jobs.</p>
        </>
      ) : (
        <div className="max-w-[88%] overflow-hidden rounded-2xl rounded-tl-md bg-white/[0.08] ring-1 ring-white/10">
          <p className="whitespace-pre-wrap break-words px-3.5 py-3 text-[13px] leading-relaxed text-white/90">{text || "Your message appears here…"}</p>
          {count === 1 && singleButtonLabel ? (
            <div className="border-t border-white/10">
              <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold text-[#67e8f9]">
                <Link2 className="h-3.5 w-3.5" /> {clip(singleButtonLabel, BUTTON_TITLE_MAX)}
              </div>
            </div>
          ) : null}
          {count >= 2 &&
            labels.map((label, i) => (
              <div key={`${label}-${i}`} className="hd-pop border-t border-white/10" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold text-[#67e8f9]">
                  <ExternalLink className="h-3.5 w-3.5" /> {buttonTitle(i, label)}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
