// Finds post mappings whose job no longer exists, so a deleted job does not
// make the automation fail silently.

export interface MappingForCheck {
  mediaId: string;
  jobId: string;
  jobTitleCache: string | null;
  status: "active" | "archived";
  extraLinks?: ({ type: "job"; jobId: string } | { type: "external"; url: string })[];
}

export interface MissingJobMapping {
  mediaId: string;
  label: string;
  primaryMissing: boolean;
  missingExtraJobIds: string[];
}

export async function findMissingJobMappings(
  mappings: MappingForCheck[],
  jobExists: (jobId: string) => Promise<boolean>,
): Promise<MissingJobMapping[]> {
  const cache = new Map<string, Promise<boolean>>();
  const exists = (id: string) => {
    if (!cache.has(id)) cache.set(id, jobExists(id));
    return cache.get(id)!;
  };

  const results = await Promise.all(
    mappings
      .filter((m) => m.status === "active")
      .map(async (m): Promise<MissingJobMapping | null> => {
        const primaryMissing = m.jobId ? !(await exists(m.jobId)) : false;
        const missingExtra: string[] = [];
        for (const link of m.extraLinks ?? []) {
          if (link.type === "job" && !(await exists(link.jobId))) missingExtra.push(link.jobId);
        }
        if (!primaryMissing && missingExtra.length === 0) return null;
        return {
          mediaId: m.mediaId,
          label: m.jobTitleCache || `Instagram post ${m.mediaId}`,
          primaryMissing,
          missingExtraJobIds: missingExtra,
        };
      }),
  );
  return results.filter((r): r is MissingJobMapping => r !== null);
}
