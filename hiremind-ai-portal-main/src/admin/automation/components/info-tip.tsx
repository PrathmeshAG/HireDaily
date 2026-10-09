import { useEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * Small "i" button that opens a short explanation: what the visual shows,
 * how the number is calculated and what to do about it.
 */
export function InfoTip({
  title,
  children,
  align = "left",
}: {
  title: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`About: ${title}`}
        className={`flex h-5 w-5 items-center justify-center rounded-full text-white/40 ring-1 transition hover:text-[#67e8f9] hover:ring-[#00e5ff]/40 ${open ? "text-[#67e8f9] ring-[#00e5ff]/40" : "ring-white/15"}`}
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <span
          role="dialog"
          className={`glass-strong hd-pop absolute top-full z-40 mt-2 block w-72 rounded-xl p-3.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-white/75 shadow-2xl ring-1 ring-white/10 ${align === "right" ? "right-0" : "left-0"}`}
        >
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#67e8f9]">{title}</span>
          {children}
        </span>
      )}
    </span>
  );
}
