export function SourceVerification({
  sourceName,
  sourceUrl,
  sourceType,
  verificationStatus,
  verifiedAt,
  applyLink,
}: {
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  verificationStatus?: "verified" | "not_specified";
  verifiedAt?: string;
  applyLink?: string;
}) {
  const verified = verificationStatus === "verified";
  const source = sourceName?.trim() || null;
  const sourceHref = sourceUrl?.trim() || null;

  return (
    <section className="relative mt-8 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Source & Verification</h2>
      <div className="mt-3 space-y-2 text-sm text-white/75">
        <p><span className="text-white/40">Source:</span>{" "}
          {sourceHref ? <a href={sourceHref} target="_blank" rel="noreferrer" className="text-[#00e5ff] hover:underline">{source ?? sourceHref}</a> : (source ?? "Not specified")}
        </p>
        <p><span className="text-white/40">Source type:</span> {sourceType?.trim() || "Not specified"}</p>
        <p><span className="text-white/40">Verification:</span> {verified ? "Verified" : "Not specified"}</p>
        {verifiedAt && verified && <p><span className="text-white/40">Last verified:</span> {verifiedAt}</p>}
        {applyLink && (
          <p><span className="text-white/40">Application:</span>{" "}
            <a href={applyLink} target="_blank" rel="noreferrer" className="text-[#00e5ff] hover:underline">Official employer application page ↗</a>
          </p>
        )}
      </div>
    </section>
  );
}