import { ref, push, set, update, remove, get, onValue, off } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, type Job } from "../lib/firebase";

function parseDeadline(value?: string | null): number | null {
  if (!value?.trim()) return null;
  const parsed = new Date(`${value.trim()}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function isValidApplyUrl(value?: string | null): boolean {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isExpiredJob(job: Pick<Job, "lastDate">, now = Date.now()): boolean {
  const deadline = parseDeadline(job.lastDate);
  return deadline !== null && deadline < now;
}

export async function fetchJobs(): Promise<Job[]> {
  const snap = await get(ref(db, "jobs"));
  if (!snap.exists()) return [];

  const raw = snap.val() as Record<string, Omit<Job, "id">>;

  // The public jobs listing should contain only currently active jobs.
  // Individual job pages still use fetchJob(), so expired URLs remain accessible.
  return Object.entries(raw)
    .map(([id, v]) => ({ ...v, id }))
    .filter((job) => !isExpiredJob(job))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function fetchJob(id: string): Promise<Job | null> {
  const snap = await get(ref(db, `jobs/${id}`));
  if (!snap.exists()) return null;
  return { ...(snap.val() as Omit<Job, "id">), id };
}

export function subscribeJobs(cb: (jobs: Job[]) => void) {
  const r = ref(db, "jobs");

  const handler = (snap: Parameters<typeof onValue>[1] extends (x: infer X) => void ? X : never) => {
    if (!snap.exists()) return cb([]);

    const raw = snap.val() as Record<string, Omit<Job, "id">>;

    cb(
      Object.entries(raw)
        .map(([id, v]) => ({ ...v, id }))
        .filter((job) => !isExpiredJob(job))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    );
  };

  // Keep the existing Firebase realtime API contract.
  const unsubscribe = onValue(r, handler);
  return () => {
    off(r, "value", handler);
    unsubscribe();
  };
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

  const parsedDeadline = parseDeadline(deadline);
  if (parsedDeadline === null) {
    throw new Error("Application deadline is invalid");
  }

  if (data.applyLink && !isValidApplyUrl(data.applyLink)) {
    throw new Error("Apply URL must be a valid http:// or https:// URL");
  }

  const now = Date.now();
  const listRef = ref(db, "jobs");
  const newRef = push(listRef);

  await set(newRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return newRef.key!;
}

export async function updateJob(
  id: string,
  data: Partial<Omit<Job, "id" | "createdAt">>,
) {
  if (data.lastDate !== undefined) {
    if (!data.lastDate?.trim() || parseDeadline(data.lastDate) === null) {
      throw new Error("Application deadline is invalid");
    }
  }

  if (data.applyLink !== undefined && !isValidApplyUrl(data.applyLink)) {
    throw new Error("Apply URL must be a valid http:// or https:// URL");
  }

  await update(ref(db, `jobs/${id}`), {
    ...data,
    updatedAt: Date.now(),
  });
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
