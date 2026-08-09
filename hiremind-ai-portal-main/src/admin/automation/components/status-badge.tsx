type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  neutral: "bg-white/5 text-white/60 ring-1 ring-white/10",
  info: "bg-[#00e5ff]/15 text-[#7DF9FF] ring-1 ring-[#00e5ff]/30",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
