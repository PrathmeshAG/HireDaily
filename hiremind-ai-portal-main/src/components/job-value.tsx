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
  const clean = (value?: string | null) => {
    const text = value?.trim();
    if (!text || /^n\/?a$/i.test(text)) return "";
    return text.replace(/\s+/g, " ");
  };

  const roleText = clean(role);
  const companyText = clean(company);
  const locationText = clean(location);
  const experienceText = clean(experience);
  const listedSkills = skills.filter(Boolean).slice(0, 4);

  if (!roleText && !companyText && !locationText && !experienceText && !listedSkills.length) return null;

  const summaryParts = [
    roleText && companyText ? `This ${roleText} opportunity at ${companyText}` : roleText || companyText,
    locationText ? `is listed for ${locationText}` : "",
    experienceText ? `and the available listing states ${experienceText} experience` : "",
  ].filter(Boolean);

  const skillSentence = listedSkills.length
    ? ` The listed skills include ${listedSkills.join(", ")}.`
    : "";

  const sourceDescription = clean(description);
  const candidateSummary = sourceDescription
    ? `${summaryParts.join(" ")}.${skillSentence} Review the requirements and verification information below before applying.`
    : `${summaryParts.join(" ")}.${skillSentence} Review the available requirements and verification information below before applying.`;

  return (
    <section className="relative mt-8 rounded-2xl bg-white/[0.02] p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Why this job may be relevant</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/80">{candidateSummary}</p>
    </section>
  );
}
