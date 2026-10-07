import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  art,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Optional SVG artwork shown instead of the icon tile. */
  art?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {art ? (
        <div className="w-40 hd-drift">{art}</div>
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
          <Icon className="h-5 w-5 text-white/40" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">{description}</p>
      </div>
      {action}
    </div>
  );
}
