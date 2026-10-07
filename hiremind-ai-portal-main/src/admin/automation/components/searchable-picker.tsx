import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Extra text that is searchable but not shown (ids, locations, keywords). */
  searchText?: string;
  /** Small tag shown on the right, e.g. "New". */
  badge?: string;
  disabled?: boolean;
}

/**
 * Dropdown with the search box at the top of the list. Items are shown in the
 * order given (callers pass newest first), so the latest entries are always
 * the first thing visible when the picker opens.
 */
export function SearchablePicker({
  items,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "Nothing found",
  allowClear = false,
  className = "",
}: {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const terms = q.split(/\s+/);
    return items.filter((i) => {
      const hay = `${i.title} ${i.subtitle ?? ""} ${i.searchText ?? ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-left text-sm text-white ring-1 ring-white/10 transition focus:outline-none focus:ring-[#00e5ff]/50 hover:bg-white/[0.07]"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate">{selected.title}</span>
              {selected.subtitle && <span className="block truncate text-xs text-white/45">{selected.subtitle}</span>}
            </>
          ) : (
            <span className="text-white/40">{placeholder}</span>
          )}
        </span>
        {allowClear && selected ? (
          <span
            role="button"
            aria-label="Clear selection"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="glass-strong animate-scale-in absolute left-0 right-0 z-[120] mt-2 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10">
          <div className="relative border-b border-white/5 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-white/40">{emptyText}</li>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === value;
                return (
                  <li key={item.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => pick(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isSelected ? "bg-[#00e5ff]/10 ring-1 ring-[#00e5ff]/25" : "hover:bg-white/5"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-white/45">{item.subtitle}</span>}
                      </span>
                      {item.badge && (
                        <span className="shrink-0 rounded-full bg-[#7c3aed]/20 px-2 py-0.5 text-[10px] text-[#c4b5fd]">{item.badge}</span>
                      )}
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[#67e8f9]" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
