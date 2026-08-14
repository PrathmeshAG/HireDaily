export function JobValue({
  role,
  company,
  location,
  experience,
  skills,
  description,
}: {
  role: string;
  company: string;
  location?: string;
  experience?: string;
  skills: string[];
  description?: string | null;
}) {
  const parts = [role, company, location, experience, ...skills].filter(Boolean);
  const summary = description?.trim() && !/^n\/?a$/i.test(description.trim())
    ? description.trim().replace(/\s+/g, " ").slice(0, 220)
    : `${role} at ${company}${location ? ` in ${location}` : ""}${experience ? ` for ${experience}` : ""}${skills.length ? `, with skills including ${skills.slice(0, 3).join(", ")}` : ""}.`;

  if (!parts.length) return null;

  return (
    <section className="relative mt-8 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Why this job may be relevant</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{summary}</p>
    </section>
  );
}