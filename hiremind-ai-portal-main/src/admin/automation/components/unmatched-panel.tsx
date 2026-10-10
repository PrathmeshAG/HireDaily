import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Inbox, X, Plus, ChevronDown, Trash2 } from "lucide-react";
import { clearUnmatchedComments, dismissUnmatchedComment, getUnmatchedComments } from "../services/automation-service";

const STOP = new Set([
  "the", "and", "for", "you", "your", "are", "this", "that", "with", "have", "has", "was", "can", "please", "pls", "plz",
  "sir", "bro", "bhai", "hai", "hain", "kya", "ke", "ki", "ko", "me", "mein", "se", "ka", "ye", "yeh", "nice", "good",
  "post", "thanks", "thank", "super", "great", "wow", "from", "just", "how", "any", "what", "who", "not", "but", "all",
]);

function words(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !STOP.has(w) && !/^\d+$/.test(w));
}

function ago(ts: number): string {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/**
 * Comments that matched no rule. The most common words are shown as chips;
 * one click starts a new rule with that word as the keyword.
 */
export function UnmatchedPanel({ onCreateRule }: { onCreateRule: (keywords: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { data: items, isLoading } = useQuery({
    queryKey: ["automation", "unmatched"],
    queryFn: () => getUnmatchedComments(150),
    staleTime: 30_000,
  });

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["automation", "unmatched"] }),
    qc.invalidateQueries({ queryKey: ["automation", "health-report"] }),
  ]);

  const dismiss = useMutation({ mutationFn: dismissUnmatchedComment, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  const clear = useMutation({
    mutationFn: clearUnmatchedComments,
    onSuccess: async () => { toast.success("Cleared"); await refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = items ?? [];
  const topWords = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of list) for (const w of new Set(words(c.text))) counts.set(w, (counts.get(w) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [list]);

  if (isLoading) return null;
  const shown = showAll ? list : list.slice(0, 8);

  return (
    <section className="glass mt-6 rounded-2xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00e5ff]/10 ring-1 ring-[#00e5ff]/20"><Inbox className="h-[18px] w-[18px] text-[#67e8f9]" /></span>
          <span>
            <span className="block text-sm font-semibold text-white">Comments that matched no rule {list.length > 0 && <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-normal text-white/70">{list.length}</span>}</span>
            <span className="block text-xs text-white/45">Find new keywords and spelling variations people actually use.</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-white/5 px-5 py-4">
          {list.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/45">Nothing here. Every comment so far matched a rule, or none have arrived yet.</p>
          ) : (
            <>
              {topWords.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs text-white/45">Words that appear in several comments. Tap one to create a rule:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topWords.map(([w, n]) => (
                      <button
                        key={w}
                        onClick={() => onCreateRule(w.toUpperCase())}
                        className="group flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-white/80 ring-1 ring-white/10 transition hover:bg-[#00e5ff]/10 hover:ring-[#00e5ff]/30"
                      >
                        <Plus className="h-3 w-3 text-white/40 group-hover:text-[#67e8f9]" /> {w} <span className="text-white/35">×{n}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ul className="space-y-1.5">
                {shown.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 ring-1 ring-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm text-white/90">{c.text}</p>
                      <p className="mt-0.5 text-[11px] text-white/35">@{c.username ?? "unknown"} · {ago(c.timestamp)}</p>
                    </div>
                    <button onClick={() => onCreateRule(words(c.text)[0]?.toUpperCase() ?? "")} className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-white/50 ring-1 ring-white/10 hover:text-[#67e8f9]" title="Create a rule from this comment">
                      + Rule
                    </button>
                    <button onClick={() => dismiss.mutate(c.id)} className="shrink-0 rounded-lg p-1.5 text-white/35 hover:bg-white/5 hover:text-white" aria-label="Dismiss">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {list.length > 8 ? (
                  <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1 text-xs text-white/50 hover:text-[#00e5ff]">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} /> {showAll ? "Show fewer" : `Show all ${list.length}`}
                  </button>
                ) : <span />}
                <button
                  onClick={() => { if (window.confirm("Remove all listed comments?")) clear.mutate(); }}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear all
                </button>
              </div>
              <p className="mt-2 text-[11px] text-white/30">Comments are kept for 30 days, then removed automatically.</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
