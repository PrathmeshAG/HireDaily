import { ArrowUpDown } from "lucide-react";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

/** Compact "Sort by" dropdown used in list toolbars. */
export function SortSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort by</span>
      <ArrowUpDown className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/45" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded-xl bg-white/5 py-2 pl-9 pr-8 text-xs text-white/80 ring-1 ring-white/10 transition hover:bg-white/[0.07] focus:outline-none focus:ring-[#00e5ff]/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#111827]">
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-[10px] text-white/40">▾</span>
    </label>
  );
}
