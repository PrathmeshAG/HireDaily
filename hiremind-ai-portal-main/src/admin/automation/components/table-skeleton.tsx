export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }, (_, c) => (
            <div
              key={c}
              className="shimmer-loading h-4 rounded"
              style={{ width: c === 0 ? "28px" : `${60 + ((r + c) % 3) * 20}px`, height: c === 0 ? "28px" : "14px" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
