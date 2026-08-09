import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "from-[#00e5ff]/20 to-[#22d3ee]/20",
  index = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  index?: number;
}) {
  return (
    <div
      className={`glass gradient-border rounded-2xl bg-gradient-to-br ${color} p-5 animate-fade-up`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Icon className="h-6 w-6 text-[#00e5ff]" />
      <div className="mt-4 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}
