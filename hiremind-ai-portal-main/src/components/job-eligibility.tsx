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
  const exp = experience?.toLowerCase() ?? "";
  if (exp.includes("fresher") || /0\s*-\s*1/.test(exp)) checks.push("Fresher / entry-level experience listed");
  if (location?.trim()) checks.push(location.trim());
  for (const skill of skills.slice(0, 3)) checks.push(`${skill} mentioned`);
  if (role.trim()) checks.push(`${role.trim()} role`);
  if (!checks.length) return null;

  return (
    <section className="relative mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Quick Eligibility Check</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {checks.map((item) => (
          <span key={item} className="rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-200 ring-1 ring-emerald-400/20">✓ {item}</span>
        ))}
      </div>
    </section>
  );
}