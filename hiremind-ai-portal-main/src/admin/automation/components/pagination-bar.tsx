export function PaginationBar({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);
  return (
    <div className="flex items-center justify-between border-t border-white/5 px-4 py-3.5">
      <span className="text-xs text-white/50">
        {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-ghost-glow rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-xs text-white/60">
          Page {page} / {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-ghost-glow rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
