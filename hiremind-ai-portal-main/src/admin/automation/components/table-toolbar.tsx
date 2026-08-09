import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function TableToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  filters,
  action,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/5 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
          />
        </div>
        {filters}
      </div>
      {action}
    </div>
  );
}
