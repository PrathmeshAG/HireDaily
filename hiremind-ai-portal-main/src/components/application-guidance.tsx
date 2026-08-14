export function ApplicationGuidance({ applyLink }: { applyLink?: string }) {
  if (!applyLink) return null;
  return (
    <section className="relative mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Application Guidance</h2>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-white/80">
        <li>• Review the listed job requirements before applying.</li>
        <li>• Keep your resume aligned with the skills shown on this job.</li>
        <li>• Apply through the official application link below.</li>
      </ul>
    </section>
  );
}