function sourceLabel(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function SourceVerification({ applyLink }: { applyLink?: string }) {
  const source = sourceLabel(applyLink);
  return (
    <section className="relative mt-8 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Source & Verification</h2>
      <div className="mt-3 space-y-2 text-sm text-white/75">
        <p><span className="text-white/40">Source:</span> {source ?? "Not specified"}</p>
        <p><span className="text-white/40">Source type:</span> {source ? "Application source linked on this job record" : "Not specified"}</p>
        <p><span className="text-white/40">Verification:</span> Not specified</p>
        {applyLink && (
          <p>
            <span className="text-white/40">Application:</span>{" "}
            <a href={applyLink} target="_blank" rel="noreferrer" className="text-[#00e5ff] hover:underline">Official application page ↗</a>
          </p>
        )}
      </div>
    </section>
  );
}