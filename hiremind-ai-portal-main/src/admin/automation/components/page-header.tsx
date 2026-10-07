import type { ReactNode } from "react";

/**
 * Shared page header for the automation admin: title, one-line purpose,
 * optional actions and an optional SVG illustration (hidden on small screens).
 */
export function PageHeader({
  title,
  subtitle,
  art,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  art?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="glass relative overflow-hidden rounded-2xl p-5 md:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#7c3aed]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#00e5ff]/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: "'Space Grotesk'" }}>{title}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/55">{subtitle}</p>
          {children && <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>}
          {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
        </div>
        {art && <div className="hidden w-44 shrink-0 sm:block md:w-56">{art}</div>}
      </div>
    </header>
  );
}
