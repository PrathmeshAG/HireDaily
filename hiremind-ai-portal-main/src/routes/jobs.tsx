import { ref, push, set, update, remove, get, onValue, off } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, type Job } from "../lib/firebase";

export async function fetchJobs(): Promise<Job[]> {
  const snap = await get(ref(db, "jobs"));
  if (!snap.exists()) return [];
  const raw = snap.val() as Record<string, Omit<Job, "id">>;
  return Object.entries(raw)
    .map(([id, v]) => ({ ...v, id }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function fetchJob(id: string): Promise<Job | null> {
  const snap = await get(ref(db, `jobs/${id}`));
  if (!snap.exists()) return null;
  return { ...(snap.val() as Omit<Job, "id">), id };
}

export function subscribeJobs(cb: (jobs: Job[]) => void) {
  const r = ref(db, "jobs");
  const handler = onValue(r, (snap) => {
    if (!snap.exists()) return cb([]);
    const raw = snap.val() as Record<string, Omit<Job, "id">>;
    cb(
      Object.entries(raw)
        .map(([id, v]) => ({ ...v, id }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    );
  });
  return () => off(r, "value", handler);
}

export async function uploadLogo(file: File): Promise<string> {
  const key = `logos/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
  const r = sRef(storage, key);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

export async function createJob(data: Omit<Job, "id" | "createdAt" | "updatedAt">) {
  const deadline = data.lastDate?.trim();
  if (!deadline) throw new Error("Application deadline is required");
  const parsedDeadline = new Date(`${deadline}T23:59:59.999`);
  if (Number.isNaN(parsedDeadline.getTime())) throw new Error("Application deadline is invalid");

  const now = Date.now();
  const listRef = ref(db, "jobs");
  const newRef = push(listRef);
  await set(newRef, { ...data, createdAt: now, updatedAt: now });
  return newRef.key!;
}

export async function updateJob(id: string, data: Partial<Omit<Job, "id" | "createdAt">>) {
  await update(ref(db, `jobs/${id}`), { ...data, updatedAt: Date.now() });
}

export async function deleteJob(id: string, logoUrl?: string) {
  await remove(ref(db, `jobs/${id}`));
  if (logoUrl && logoUrl.includes("firebasestorage")) {
    try {
      const path = decodeURIComponent(logoUrl.split("/o/")[1].split("?")[0]);
      await deleteObject(sRef(storage, path));
    } catch {
      /* ignore */
    }
  }
}