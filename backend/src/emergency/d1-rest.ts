// Cloudflare D1 ko REST API se chalata hai (Vercel par Worker binding nahi hoti).
// Engine jo 3 cheezein use karta hai wahi deta hai: prepare().bind().run() / all() / first().

type D1Result = { results?: Record<string, unknown>[]; meta?: { changes?: number } };

export interface D1Like {
  prepare(sql: string): {
    bind(...params: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>;
      all(): Promise<{ results: Record<string, unknown>[] }>;
      first(): Promise<Record<string, unknown> | null>;
    };
  };
}

export function d1RestConfigured(e: NodeJS.ProcessEnv = process.env): boolean {
  return !!(e.CLOUDFLARE_ACCOUNT_ID?.trim() && e.CLOUDFLARE_D1_DATABASE_ID?.trim() && e.CLOUDFLARE_D1_API_TOKEN?.trim());
}

export function makeD1Rest(e: NodeJS.ProcessEnv = process.env): D1Like {
  async function query(sql: string, params: unknown[]): Promise<D1Result> {
    const url =
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent((e.CLOUDFLARE_ACCOUNT_ID ?? "").trim())}` +
      `/d1/database/${encodeURIComponent((e.CLOUDFLARE_D1_DATABASE_ID ?? "").trim())}/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${(e.CLOUDFLARE_D1_API_TOKEN ?? "").trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean; result?: D1Result[]; errors?: { message?: string }[] } | null;
    if (!res.ok || !json?.success) {
      // token kabhi error message mein nahi jata
      throw new Error(`D1 query failed (${res.status}): ${String(json?.errors?.[0]?.message ?? "unknown").slice(0, 120)}`);
    }
    return json.result?.[0] ?? {};
  }

  return {
    prepare(sql: string) {
      return {
        bind(...p: unknown[]) {
          const params = p.map((v) => (v === undefined ? null : v));
          return {
            run: async () => ({ meta: { changes: (await query(sql, params)).meta?.changes ?? 0 } }),
            all: async () => ({ results: (await query(sql, params)).results ?? [] }),
            first: async () => (await query(sql, params)).results?.[0] ?? null,
          };
        },
      };
    },
  };
}
