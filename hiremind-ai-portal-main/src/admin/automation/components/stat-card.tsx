import type { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./animated-number";

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "from-[#00e5ff]/20 to-[#22d3ee]/20",
  index = 0,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  index?: number;
  /** Small supporting line under the label, e.g. "2 need attention". */
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueColor = tone === "bad" ? "text-rose-300" : tone === "good" ? "text-emerald-300" : "text-white";
  return (
    <div
      className={`glass gradient-border card-glow rounded-2xl bg-gradient-to-br ${color} p-5 animate-fade-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Icon className="h-6 w-6 text-[#00e5ff]" />
      <div className={`mt-4 text-3xl font-bold ${valueColor}`}>
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      <div className="mt-1 text-xs tracking-wide text-white/60">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}
