// Multi-link support for post mappings (additive, backward compatible).
//
// A post mapping always keeps its primary `jobId` exactly as before. Optional
// `extraLinks` add up to MAX_TOTAL_LINKS - 1 more links to the SAME DM:
//   - type "job"      → another Hire Daily job (resolved from jobs/{jobId})
//   - type "external" → any pasted http(s) URL, with a custom label
// Mappings without `extraLinks` behave exactly as they did before.

export const MAX_TOTAL_LINKS = 5;
export const MAX_EXTRA_LINKS = MAX_TOTAL_LINKS - 1;
/** Instagram text messages are limited to 1000 bytes; keep a safety margin. */
export const DM_LINKS_MAX_CHARS = 900;

export type MappingExtraLink =
  | { type: "job"; jobId: string; label: string | null }
  | { type: "external"; url: string; label: string };

export interface ResolvedLink {
  /** Full name, e.g. "Data Analyst - Barclays". Used in text, buttons and previews. */
  label: string;
  url: string;
  /** Card title for 4-5 links: the job role (or the external link's name). */
  title?: string;
  /** Card subtitle for 4-5 links: "Company · Location" (or the external site's host). */
  subtitle?: string;
}

/** "Company · Location" for a card subtitle. Empty parts are skipped. */
export function cardSubtitle(company: string | null | undefined, location: string | null | undefined): string {
  return [company, location].filter((p): p is string => !!p && p.trim().length > 0).join(" · ");
}

/** Host of a URL without "www.", for the subtitle of an external link card. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Accepts only http(s) URLs without embedded credentials. */
export function normalizeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 500 || /\s/.test(value)) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Validates and normalizes untrusted `extraLinks` input. Invalid entries are
 * dropped, duplicates removed, and the list capped at MAX_EXTRA_LINKS.
 * `primaryJobId` is excluded so the primary job is never duplicated.
 */
export function sanitizeExtraLinks(raw: unknown, primaryJobId?: string | null): MappingExtraLink[] {
  if (!Array.isArray(raw)) return [];
  const out: MappingExtraLink[] = [];
  const seen = new Set<string>();
  if (primaryJobId) seen.add(`job:${primaryJobId}`);

  for (const item of raw) {
    if (out.length >= MAX_EXTRA_LINKS) break;
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const label = typeof entry.label === "string" ? entry.label.trim().slice(0, 60) : "";

    if (entry.type === "job") {
      const jobId = typeof entry.jobId === "string" ? entry.jobId.trim() : "";
      if (!jobId) continue;
      const key = `job:${jobId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: "job", jobId, label: label || null });
    } else if (entry.type === "external") {
      const url = normalizeExternalUrl(entry.url);
      if (!url || !label) continue;
      const key = `url:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type: "external", url, label });
    }
  }
  return out;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

/**
 * Builds the multi-link block: one link per entry, each preceded by its name,
 * one below another. Labels are shortened if needed so the whole block fits
 * in a single Instagram text message.
 */
export function buildLinksBlock(links: ResolvedLink[], maxChars = DM_LINKS_MAX_CHARS): string {
  const render = (labelMax: number) =>
    links
      .map((l, i) => `${i + 1}. ${truncate(l.label, labelMax)}\n${l.url}`)
      .join("\n\n");

  for (const labelMax of [60, 40, 28, 18, 10]) {
    const block = render(labelMax);
    if (block.length <= maxChars) return block;
  }
  return render(10);
}

/** Cuts text to `max` characters without splitting emoji / surrogate pairs. */
export function clipText(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, Math.max(1, max - 1)).join("").trimEnd()}…`;
}

/** Instagram button titles are limited to 20 characters. */
export const BUTTON_TITLE_MAX = 20;
/** Button-template text is limited to 640 characters. */
export const BUTTON_TEXT_MAX = 640;
/** Native buttons: up to 3 buttons in one button template. Beyond that use a carousel. */
export const MAX_BUTTON_TEMPLATE_LINKS = 3;

/** "1. Frontend Develo…" — numbered so it matches the numbered names in the text. */
export function buttonTitle(index: number, label: string): string {
  const prefix = `${index + 1}. `;
  return `${prefix}${clipText(label, BUTTON_TITLE_MAX - prefix.length)}`;
}

/**
 * Names-only list (no URLs) for the text above the buttons, one per line.
 * Shortens labels if needed so the text fits the button-template limit.
 */
export function buildNamesBlock(links: ResolvedLink[], maxChars = 480): string {
  const render = (labelMax: number) =>
    links.map((l, i) => `${i + 1}. ${clipText(l.label, labelMax)}`).join("\n");
  for (const labelMax of [60, 40, 28, 18]) {
    const block = render(labelMax);
    if (block.length <= maxChars) return block;
  }
  return render(18);
}
