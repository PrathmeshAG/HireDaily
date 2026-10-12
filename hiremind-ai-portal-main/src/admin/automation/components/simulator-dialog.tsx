import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Play, Loader2, CheckCircle2, XCircle, MinusCircle, AlertTriangle, FlaskConical } from "lucide-react";
import { simulateComment } from "../services/automation-service";
import type { SimulationResult } from "../types";
import { ModalPortal } from "./modal-portal";
import { SearchablePicker } from "./searchable-picker";
import { DmPreview } from "./dm-preview";

interface MappingItem {
  id: string;
  jobTitle: string;
  companyName: string;
  createdAt?: number;
  status?: string;
}

function Step({ state, title, children }: { state: "ok" | "bad" | "skip"; title: string; children?: React.ReactNode }) {
  const Icon = state === "ok" ? CheckCircle2 : state === "bad" ? XCircle : MinusCircle;
  const color = state === "ok" ? "text-emerald-400" : state === "bad" ? "text-rose-400" : "text-white/30";
  return (
    <li className="flex gap-3">
      <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        {children && <div className="mt-1 text-xs leading-relaxed text-white/60">{children}</div>}
      </div>
    </li>
  );
}

/**
 * "Test a comment": runs the real matching and rendering for a pretend
 * comment and shows exactly what would be sent. Nothing is sent or saved.
 */
export function SimulatorDialog({
  mappings,
  keywordHints,
  onClose,
}: {
  mappings: MappingItem[];
  keywordHints: string[];
  onClose: () => void;
}) {
  const [mediaId, setMediaId] = useState("");
  const [text, setText] = useState("");
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  const items = useMemo(
    () =>
      [...mappings]
        .filter((m) => m.status !== "archived")
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .map((m, i) => ({
          id: m.id,
          title: `${m.jobTitle || "Untitled"}${m.companyName ? ` — ${m.companyName}` : ""}`,
          searchText: m.id,
          badge: i < 3 ? "Latest" : undefined,
        })),
    [mappings],
  );

  const run = useMutation({
    mutationFn: () => simulateComment({ mediaId, commentText: text, username: username.trim() || undefined }),
    onSuccess: setResult,
    onError: (e: Error) => toast.error(e.message),
  });

  const input = "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";
  const label = "mb-1.5 block text-xs text-white/50";
  const canRun = !!mediaId && text.trim().length > 0 && !run.isPending;

  const linkNames = result?.mapping.links.map((l) => l.label) ?? [];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
        <div className="glass-strong mx-auto my-2 w-full max-w-3xl rounded-2xl p-5 shadow-2xl animate-scale-in sm:my-8 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><FlaskConical className="h-5 w-5 text-[#67e8f9]" /> Test a comment</h2>
              <p className="mt-1 text-xs text-white/45">See which rule fires and exactly what would be sent. Nothing is posted or saved.</p>
            </div>
            <button onClick={onClose} className="btn-ghost-glow rounded-lg p-1.5" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className={label}>Instagram post</label>
              <SearchablePicker
                items={items}
                value={mediaId}
                onChange={setMediaId}
                placeholder="Select a mapped post"
                searchPlaceholder="Search job, company or media ID…"
                emptyText="No mapped post. Create one in Post Mapping first."
              />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_0.5fr]">
              <div>
                <label className={label}>Comment text</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder="e.g. Please send the JOB link" className={input} />
              </div>
              <div>
                <label className={label}>Username (optional)</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="instagram_user" className={input} />
              </div>
            </div>
            {keywordHints.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-white/40">Try:</span>
                {keywordHints.slice(0, 6).map((k) => (
                  <button key={k} type="button" onClick={() => setText(k)} className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/65 ring-1 ring-white/10 transition hover:text-white">
                    {k}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => run.mutate()} disabled={!canRun} className="btn-glow flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">
              {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run test
            </button>
          </div>

          {result && (
            <div className="mt-6 space-y-5 border-t border-white/10 pt-5">
              <ol className="space-y-3.5">
                <Step state={result.matched ? "ok" : "bad"} title={result.matched ? "A rule matched" : "No rule matched"}>
                  {result.matched && result.rule ? (
                    <>
                      Keywords <span className="text-white/85">{result.rule.keywords.join(", ") || "any comment"}</span>
                      {result.matchedKeyword && <> · matched <span className="text-[#67e8f9]">&ldquo;{result.matchedKeyword}&rdquo;</span></>}
                      {" · "}{result.rule.replyMode.replace(/_/g, " ")}
                    </>
                  ) : (
                    <>{result.reason.replace(/_/g, " ")}</>
                  )}
                </Step>
                <Step state={result.mapping.mapped ? "ok" : "bad"} title={result.mapping.mapped ? `Post is mapped (${result.mapping.links.length} link${result.mapping.links.length === 1 ? "" : "s"})` : "Post is not mapped"}>
                  {result.mapping.mapped ? result.mapping.links.map((l) => l.label).join(" · ") : result.mapping.reason.replace(/_/g, " ")}
                </Step>
                <Step state={!result.matched || !result.mapping.mapped ? "skip" : result.willPostComment ? "ok" : "skip"} title={result.willPostComment ? "Public reply would be posted" : "No public reply"}>
                  {result.matched && !result.willPostComment && "This rule is set to DM only."}
                </Step>
                <Step state={!result.matched || !result.mapping.mapped ? "skip" : result.willSendDm ? "ok" : "skip"} title={result.willSendDm ? "DM would be sent" : "No DM"}>
                  {result.matched && !result.willSendDm && "This rule is set to comment only."}
                </Step>
              </ol>

              {result.comment.variants.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">Public reply{result.comment.variants.length > 1 ? ` (random one of ${result.comment.variants.length})` : ""}</p>
                  <div className="space-y-2">
                    {result.comment.variants.map((v) => (
                      <div key={v.id} className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-white/90 ring-1 ring-white/10">
                        {v.text !== null ? <p className="whitespace-pre-wrap break-words">{v.text}</p> : <p className="text-rose-300">Cannot be rendered: {v.error}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.dm && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/45">DM</p>
                  <DmPreview
                    text={result.dm.text}
                    labels={result.dm.kind === "text" || result.dm.kind === "button" ? ["Job"] : linkNames}
                    singleButtonLabel={result.dm.kind === "button" ? result.dm.buttons[0] : null}
                    cards={result.dm.kind === "carousel" ? result.dm.cards : undefined}
                  />
                </div>
              )}

              {result.warnings.length > 0 && (
                <ul className="space-y-1.5">
                  {result.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-200">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              )}

              {result.otherRules.length > 0 && (
                <details className="rounded-xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
                  <summary className="cursor-pointer text-xs text-white/55">How every rule was evaluated ({result.otherRules.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {result.otherRules.map((r) => (
                      <li key={r.ruleId} className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                        <span className={`h-1.5 w-1.5 rounded-full ${r.matched ? "bg-emerald-400" : "bg-white/20"}`} />
                        <span className="text-white/80">{r.keywords.join(", ") || "any comment"}</span>
                        <span className="text-white/35">{!r.active ? "inactive or outside its dates" : !r.scopeMatched ? "different post" : r.matched ? "matched" : "no keyword match"}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
