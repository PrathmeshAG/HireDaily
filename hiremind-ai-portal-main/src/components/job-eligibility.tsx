export function JobEligibility({
  role,
  location,
  experience,
  skills,
}: {
  role: string;
  location?: string;
  experience?: string;
  skills: string[];
}) {
  const checks: string[] = [];
  const exp = experience?.trim().toLowerCase() ?? "";
  const loc = location?.trim();

  if (exp) {
    if (exp.includes("fresher") || /0\s*[-–]\s*1/.test(exp)) {
      checks.push("Fresher / entry-level experience listed");
    } else {
      checks.push(`${experience?.trim()} experience listed`);
    }
  }

  if (loc) checks.push(`Location: ${loc}`);
  for (const skill of skills.filter(Boolean).slice(0, 4)) checks.push(`Skill mentioned: ${skill}`);
  if (role.trim()) checks.push(`Role: ${role.trim()}`);

  if (!checks.length) return null;

  return (
    <section className="relative mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Quick Eligibility Check</h2>
      <p className="mt-2 text-xs leading-relaxed text-white/45">
        These points summarize information available on this listing. Always review the full requirements before applying.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {checks.map((item) => (
          <span
            key={item}
            className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 ring-1 ring-emerald-400/20"
          >
            ✓ {item}
          </span>
        ))}
      </div>
    </section>
  );
}
