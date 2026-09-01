export function ApplicationGuidance({ applyLink }: { applyLink?: string }) {
  return (
    <section className="relative mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Application Guidance</h2>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-white/80">
        <li>• Review the listed role, requirements and eligibility information before applying.</li>
        <li>• Make sure your resume reflects the skills and experience relevant to this opportunity.</li>
        <li>
          • {applyLink
            ? "Use the application link on this page and confirm the destination before submitting your information."
            : "An application link is not currently available on this listing."}
        </li>
      </ul>
    </section>
  );
}
