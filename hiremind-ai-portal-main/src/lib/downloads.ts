// src/lib/downloads.ts
// PDF downloads: Google Drive link -> preview / download / share links, aur Firebase (node: "downloads") me save.
// Backend (Instagram automation wala) se koi lena-dena nahi. Jobs ki tarah seedha frontend se Firebase.
import { ref, push, set, update, remove, get } from "firebase/database";
import { db } from "./firebase";
import { slugify } from "./job-url";

export type Download = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  driveUrl: string; // jo link admin ne paste ki
  fileId: string; // uss link se nikli Drive file ID
  createdAt: number;
  updatedAt: number;
};

export type DownloadInput = Pick<Download, "title" | "description" | "category" | "driveUrl" | "fileId">;

/* ---------- Drive link helpers ---------- */

const ID_RE = /^[A-Za-z0-9_-]{20,}$/;

export function parseDriveLink(input: string): { id: string } | { error: string } {
  const raw = input.trim();
  if (!raw) return { error: "Drive link khaali hai." };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "Ye link sahi nahi hai (https://drive.google.com/… hona chahiye)." };
  }
  if (url.hostname !== "drive.google.com" && url.hostname !== "docs.google.com") {
    return { error: "Sirf Google Drive ki link chalegi." };
  }
  if (/\/folders\//.test(url.pathname) || /\/drive\/folders/.test(url.pathname)) {
    return { error: "Ye folder ki link hai. Har PDF ki alag share link chahiye (PDF par right click, Share, Copy link)." };
  }
  const m = /\/(?:file\/)?d\/([A-Za-z0-9_-]+)/.exec(url.pathname);
  const id = m?.[1] ?? url.searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) return { error: "Link se file ID nahi mil payi. File ki share link copy karke paste karo." };
  return { id };
}

export const drivePreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;
export const driveDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
export const driveViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;
// Public file ka pehla page thumbnail (best-effort: private file ho to load nahi hota)
export const driveThumbUrl = (id: string, width = 800) => `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

export const downloadPath = (d: Pick<Download, "slug">) => `/downloads/${d.slug}`;

/* ---------- Firebase CRUD ---------- */

export async function fetchDownloads(): Promise<Download[]> {
  const snap = await get(ref(db, "downloads"));
  if (!snap.exists()) return [];
  const raw = snap.val() as Record<string, Omit<Download, "id">>;
  return Object.entries(raw)
    .map(([id, v]) => ({ ...v, id }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function fetchDownloadBySlug(slug: string): Promise<{ item: Download | null; all: Download[] }> {
  const all = await fetchDownloads();
  return { item: all.find((d) => d.slug === slug) ?? null, all };
}

// `taken` do to bulk add me pass karo (naye slugs usme judte jaate hain), warna function khud list padh leta hai.
export async function createDownload(data: DownloadInput, taken?: Set<string>): Promise<string> {
  const used = taken ?? new Set((await fetchDownloads()).map((d) => d.slug));
  const base = slugify(data.title) || "pdf";
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);

  const now = Date.now();
  const newRef = push(ref(db, "downloads"));
  await set(newRef, { ...data, slug, createdAt: now, updatedAt: now });
  return newRef.key!;
}

// Slug nahi badalta, taaki jo link kahin share/automation me gayi hai wo na tute.
export async function updateDownload(id: string, data: Partial<DownloadInput>) {
  await update(ref(db, `downloads/${id}`), { ...data, updatedAt: Date.now() });
}

export async function deleteDownload(id: string) {
  await remove(ref(db, `downloads/${id}`));
}
