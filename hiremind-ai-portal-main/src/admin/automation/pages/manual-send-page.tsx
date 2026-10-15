import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Loader2, Send, Reply, CheckCircle2, XCircle, MinusCircle, AlertTriangle, History, Info,
} from "lucide-react";
import { getPostMappings, getRules, lookupManual, manualSend } from "../services/automation-service";
import { fetchJobs } from "../../../lib/jobs";
import type { ManualComment, ManualSendBody, TimelineEntry } from "../types";
import { PageHeader } from "../components/page-header";
import { InfoTip } from "../components/info-tip";
import { SearchablePicker } from "../components/searchable-picker";
import { EmptyState } from "../components/empty-state";
import { SettingsArt, EmptyArt } from "../components/illustrations";

function ago(ts: number): string {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function friendlyError(error: string | null | undefined): string {
  if (!error) return "Unknown error";
  if (/access token|session has expired|_401|meta_http_401/i.test(error)) return "Access token expired. Replace META_ACCESS_TOKEN.";
  if (error === "no_matching_rule") return "No rule matches this comment. Pick a rule below.";
  if (error === "could_not_find_user") return "Instagram did not return the commenter. The comment may be deleted.";
  if (error === "hourly_cap_reached") return "Hourly safety limit reached.";
  if (/unknown error/i.test(error)) return "Instagram returned a temporary \"unknown error\". Try again in a minute.";
  if (/allowed window|outside of allowed|already.*private|10903|2018108/i.test(error)) return "Instagram refused: private replies are allowed once per comment, within about 7 days.";
  return error.length > 120 ? `${error.slice(0, 120)}…` : error;
}

const TYPE_LABEL: Record<string, string> = {
  comment_received: "Comment received",
  keyword_matched: "Rule matched",
  comment_sent: "Public reply",
  dm_sent: "DM",
  error: "Error / no match",
  retry: "Retry",
};

function StatusChip({ label, value }: { label: string; value: "success" | "failed" | "none" }) {
  const Icon = value === "success" ? CheckCircle2 : value === "failed" ? XCircle : MinusCircle;
  const color = value === "success" ? "text-emerald-300 bg-emerald-500/10 ring-emerald-500/25" : value === "failed" ? "text-rose-300 bg-rose-500/10 ring-rose-500/25" : "text-white/45 bg-white/5 ring-white/10";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ring-1 ${color}`}>
      <Icon className="h-3 w-3" /> {label}: {value === "none" ? "nothing sent" : value}
    </span>
  );
}

/** Plain-language reason why a comment may have received nothing. */
function diagnose(c: ManualComment, timeline: TimelineEntry[]): string | null {
  const skipped = timeline.find((t) => t.detail && /SKIPPED/i.test(t.detail));
  if (c.status.reply === "success" && c.status.dm === "success") return null;
  if (c.status.lastError) return friendlyError(c.status.lastError);
  if (skipped?.detail) return skipped.detail.slice(skipped.detail.indexOf("SKIPPED"));
  if (c.status.reply === "none" && c.status.dm === "none") {
    return timeline.length === 0
      ? "No record at all. The automation never saw this comment (Instagram did not deliver it, or it was rejected)."
      : "The automation saw this person but did not reply to this comment. Check the history below.";
  }
  return null;
}

export function ManualSendPage() {
  const qc = useQueryClient();
  const { data: mappings } = useQuery({ queryKey: ["automation", "mappings"], queryFn: getPostMappings });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const { data: rules } = useQuery({ queryKey: ["automation", "rules"], queryFn: getRules });

  const [mediaId, setMediaId] = useState("");
  const [username, setUsername] = useState("");
  const [searched, setSearched] = useState<{ mediaId: string; username: string } | null>(null);
  const [composer, setComposer] = useState<{ commentId: string; kind: "custom_dm" | "custom_reply"; text: string } | null>(null);
  const [needRule, setNeedRule] = useState<{ comment: ManualComment; parts: ("comment" | "dm")[] } | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({});

  const items = useMemo(
    () =>
      [...(mappings ?? [])]
        .filter((m) => m.status !== "archived")
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((m, i) => {
          const job = jobs?.find((j) => j.id === m.jobId);
          const title = `${job?.role ?? m.jobTitle ?? "Untitled"}${job?.companyName ?? m.companyName ? ` — ${job?.companyName ?? m.companyName}` : ""}`;
          return { id: m.id, title, searchText: m.id, badge: i < 3 ? "Latest" : undefined };
        }),
    [mappings, jobs],
  );

  const lookup = useQuery({
    queryKey: ["automation", "manual", searched?.mediaId, searched?.username],
    queryFn: () => lookupManual(searched!.mediaId, searched!.username),
    enabled: !!searched,
    staleTime: 0,
    retry: false,
  });

  const send = useMutation({
    mutationFn: (body: ManualSendBody) => manualSend(body),
  });

  const run = async (comment: ManualComment, body: ManualSendBody, label: string) => {
    const res = await send.mutateAsync(body);
    const failed = !res.ok;
    let text = failed ? friendlyError(res.error) : `${label} done${res.dryRun ? " (dry-run: nothing was really sent)" : ""}.`;
    if (!failed && res.outcome) {
      const parts = [res.outcome.comment && `reply: ${res.outcome.comment}`, res.outcome.dm && `DM: ${res.outcome.dm}`].filter(Boolean);
      if (parts.length) text = `${label}: ${parts.join(", ")}`;
      if (res.outcome.error) text += ` (${friendlyError(res.outcome.error)})`;
    }
    if (res.error === "no_matching_rule") {
      setNeedRule({ comment, parts: body.parts ?? ["comment", "dm"] });
      return;
    }
    setResults((r) => ({ ...r, [comment.commentId]: { ok: !failed, text } }));
    if (failed) toast.error(text);
    else toast.success(text);
    setComposer(null);
    setNeedRule(null);
    await Promise.all([lookup.refetch(), qc.invalidateQueries({ queryKey: ["automation", "logs"] }), qc.invalidateQueries({ queryKey: ["automation", "health-report"] })]);
  };

  const jobSend = (c: ManualComment, parts: ("comment" | "dm")[], label: string, chosenRule?: string) =>
    run(c, { action: "job", commentId: c.commentId, mediaId: searched?.mediaId, username: c.username, userId: c.userId, commentText: c.text, parts, ruleId: chosenRule }, label);

  const input = "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";
  const comments = lookup.data?.comments ?? [];
  const timeline = lookup.data?.timeline ?? [];
  const busy = send.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Send"
        subtitle="Someone did not get their reply or DM? Find their comment and send it yourself."
        art={<SettingsArt />}
      >
        <InfoTip title="What Instagram allows">
          <p>A person who never messaged you can only be reached through <b>one private reply to their comment</b>, within about <b>7 days</b> of the comment.</p>
          <p className="mt-2">You cannot DM an arbitrary username. That is an Instagram rule, so this page always works from a real comment.</p>
          <p className="mt-2">The public reply has no such limit, and can be sent any time.</p>
        </InfoTip>
      </PageHeader>

      {/* Step 1 */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">1. Find the comment</h2>
        <p className="mt-1 text-[11px] text-white/40">The comments are read from Instagram itself, so comments the automation never received are listed too.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <SearchablePicker
            items={items}
            value={mediaId}
            onChange={setMediaId}
            placeholder="Select the Instagram post"
            searchPlaceholder="Search job, company or media ID…"
            emptyText="No mapped post. Create one in Post Mapping first."
          />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (optional), e.g. sankhar2003" className={input} />
          <button
            onClick={() => setSearched({ mediaId, username })}
            disabled={!mediaId && !username.trim()}
            className="btn-glow flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm disabled:opacity-50"
          >
            {lookup.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
          </button>
        </div>
        <p className="mt-2 text-[11px] text-white/35">Pick a post to list its comments. Add a username to narrow it down. A username alone shows only what the automation logged.</p>
      </section>

      {lookup.isError && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">Could not search: {(lookup.error as Error).message}</div>
      )}
      {lookup.data?.fetchError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Instagram did not return comments: {friendlyError(lookup.data.fetchError)}</span>
        </div>
      )}

      {/* Step 2 */}
      {searched?.mediaId && lookup.data && !lookup.data.fetchError && (
        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
            2. Send
            <InfoTip title="The three ways to send">
              <ul className="list-disc space-y-1 pl-4">
                <li><b>Job DM + reply</b> runs the normal automation for this one comment: your rule, templates, job links and follow check.</li>
                <li><b>Custom DM</b> sends your own text as the comment&apos;s private reply.</li>
                <li><b>Custom reply</b> posts your own text publicly under the comment.</li>
              </ul>
            </InfoTip>
          </h2>

          {comments.length === 0 ? (
            <EmptyState icon={Info} art={<EmptyArt kind="search" />} title="No comments found" description="Instagram returned no comments for this post and username. Check the spelling, or the comment may have been deleted." />
          ) : (
            <ul className="mt-4 space-y-3">
              {comments.map((c) => {
                const why = diagnose(c, timeline.filter((t) => !t.mediaId || t.mediaId === searched.mediaId));
                const result = results[c.commentId];
                const open = composer?.commentId === c.commentId ? composer : null;
                return (
                  <li key={c.commentId} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">@{c.username}<span className="ml-2 text-xs font-normal text-white/35">{c.timestamp ? ago(c.timestamp) : ""}</span></p>
                        <p className="mt-1 break-words text-sm text-white/80">{c.text || <span className="text-white/35">(no text)</span>}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusChip label="Reply" value={c.status.reply} />
                        <StatusChip label="DM" value={c.status.dm} />
                      </div>
                    </div>

                    {why && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-200/90">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {why}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => jobSend(c, ["comment", "dm"], "Job DM + reply")} className="btn-glow rounded-lg px-3 py-2 text-xs disabled:opacity-60">Send job DM + reply</button>
                      <button disabled={busy} onClick={() => jobSend(c, ["dm"], "Job DM")} className="btn-ghost-glow rounded-lg px-3 py-2 text-xs disabled:opacity-60">Job DM only</button>
                      <button disabled={busy} onClick={() => jobSend(c, ["comment"], "Reply")} className="btn-ghost-glow rounded-lg px-3 py-2 text-xs disabled:opacity-60">Reply only</button>
                      <button disabled={busy} onClick={() => setComposer({ commentId: c.commentId, kind: "custom_dm", text: "" })} className="btn-ghost-glow flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs disabled:opacity-60"><Send className="h-3.5 w-3.5" /> Custom DM</button>
                      <button disabled={busy} onClick={() => setComposer({ commentId: c.commentId, kind: "custom_reply", text: "" })} className="btn-ghost-glow flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs disabled:opacity-60"><Reply className="h-3.5 w-3.5" /> Custom reply</button>
                    </div>

                    {needRule?.comment.commentId === c.commentId && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-xs text-white/70">No rule matches &ldquo;{c.text}&rdquo;. Choose which rule to use for this person:</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white ring-1 ring-white/10">
                            <option value="" className="bg-[#111827]">Select a rule</option>
                            {(rules ?? []).map((r) => (
                              <option key={r.id} value={r.id} className="bg-[#111827]">{r.keywords.join(", ") || "any comment"} · {r.replyMode.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                          <button disabled={!ruleId || busy} onClick={() => jobSend(c, needRule.parts, "Job DM + reply", ruleId)} className="btn-glow rounded-lg px-3 py-2 text-xs disabled:opacity-50">Use this rule</button>
                          <button onClick={() => setNeedRule(null)} className="rounded-lg px-3 py-2 text-xs text-white/50">Cancel</button>
                        </div>
                      </div>
                    )}

                    {open && (
                      <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-xs text-white/60">
                          {open.kind === "custom_dm" ? "Your text is sent as the one private reply to this comment (max 1000 characters)." : "Your text is posted publicly under this comment (max 2200 characters)."}
                        </p>
                        <textarea
                          value={open.text}
                          onChange={(e) => setComposer({ ...open, text: e.target.value })}
                          rows={3}
                          maxLength={open.kind === "custom_dm" ? 1000 : 2200}
                          placeholder={open.kind === "custom_dm" ? "Hi! Here is the link you asked for: https://…" : "Sent you a message, please check your DM ✨"}
                          className={input}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            disabled={busy || !open.text.trim()}
                            onClick={() => run(c, { action: open.kind, commentId: c.commentId, mediaId: searched.mediaId, username: c.username, userId: c.userId, text: open.text }, open.kind === "custom_dm" ? "Custom DM" : "Custom reply")}
                            className="btn-glow flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                          </button>
                          <button onClick={() => setComposer(null)} className="rounded-lg px-3 py-2 text-xs text-white/50">Cancel</button>
                          <span className="ml-auto text-[11px] text-white/35">{open.text.length}/{open.kind === "custom_dm" ? 1000 : 2200}</span>
                        </div>
                      </div>
                    )}

                    {result && (
                      <p className={`mt-3 flex items-center gap-1.5 text-xs ${result.ok ? "text-emerald-300" : "text-rose-300"}`}>
                        {result.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {result.text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* History */}
      {searched && lookup.data && (searched.username.trim() || timeline.length > 0) && (
        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/50">
            <History className="h-4 w-4" /> What the automation logged{searched.username.trim() ? ` for @${searched.username.trim().replace(/^@/, "")}` : ""}
            <InfoTip title="History (last 7 days)">
              <p>Every log entry for this username. If there is nothing here but the comment exists on Instagram, the automation never received it.</p>
              <p className="mt-2">&ldquo;SKIPPED&rdquo; means the rule matched but the cooldown or duplicate protection stopped the reply.</p>
            </InfoTip>
          </h2>
          {timeline.length === 0 ? (
            <p className="mt-3 text-sm text-white/45">No log entries for this username in the last 7 days.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {timeline.map((t, i) => (
                <li key={`${t.at}-${i}`} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="w-20 shrink-0 text-xs text-white/35">{ago(t.at)}</span>
                  <span className="w-32 shrink-0 text-xs font-medium text-white/70">{TYPE_LABEL[t.type] ?? t.type}</span>
                  <span className={`min-w-0 flex-1 break-words text-xs ${t.error || /SKIPPED/i.test(t.detail ?? "") ? "text-amber-200/90" : "text-white/55"}`}>
                    {t.error ? friendlyError(t.error) : t.detail ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
