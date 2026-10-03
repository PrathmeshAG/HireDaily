import { useCallback, useEffect, useRef, useState } from "react";
import { get, ref, set } from "firebase/database";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

/**
 * Coding progress.
 * - Always saved in this browser (works for guests).
 * - When the user is signed in it is also saved in Firebase Realtime Database at userProgress/<uid>
 *   and merged with whatever the user solved earlier on another device.
 * Badges are shown as "collected" only for signed-in users.
 */
export type Solve = { at: number; attempts: number };
export type Progress = Record<string, Solve>;
export type SyncState = "local" | "cloud" | "error";

const LOCAL_KEY = "hd-progress-v2";
const LEGACY_KEY = "hd-code-solved";

function readLocal(): Progress {
  try {
    const out: Progress = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
    // migrate the older list of solved ids
    const legacy: string[] = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
    for (const id of legacy) if (!out[id]) out[id] = { at: Date.now(), attempts: 1 };
    return out;
  } catch {
    return {};
  }
}

function writeLocal(p: Progress) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const out: Progress = { ...a };
  for (const [id, s] of Object.entries(b)) {
    const mine = out[id];
    out[id] = !mine ? s : { at: Math.min(mine.at, s.at), attempts: Math.min(mine.attempts, s.attempts) };
  }
  return out;
}

export function useProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress>({});
  const [sync, setSync] = useState<SyncState>("local");
  const latest = useRef<Progress>({});
  latest.current = progress;

  useEffect(() => {
    setProgress(readLocal());
  }, []);

  // when a user signs in: pull their saved progress, merge it with this device and push back
  useEffect(() => {
    if (!user) {
      setSync("local");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const path = ref(db, `userProgress/${user.uid}`);
        const snap = await get(path);
        const remote = (snap.exists() ? snap.val() : {}) as Progress;
        const merged = mergeProgress(readLocal(), remote);
        if (cancelled) return;
        writeLocal(merged);
        setProgress(merged);
        if (JSON.stringify(merged) !== JSON.stringify(remote)) await set(path, merged);
        if (!cancelled) setSync("cloud");
      } catch {
        // Usually the database rules do not allow userProgress yet. Progress stays on this device.
        if (!cancelled) setSync("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const record = useCallback(
    async (id: string, attempts: number) => {
      if (latest.current[id]) return false; // already solved: keep the first date
      const next = { ...latest.current, [id]: { at: Date.now(), attempts } };
      latest.current = next;
      setProgress(next);
      writeLocal(next);
      if (user) {
        try {
          await set(ref(db, `userProgress/${user.uid}/${id}`), next[id]);
          setSync("cloud");
        } catch {
          setSync("error");
        }
      }
      return true;
    },
    [user],
  );

  return { progress, record, sync, signedIn: !!user };
}
