// "Test a comment": runs the REAL rule matching, mapping resolution and
// template rendering for a hypothetical comment, and describes what would be
// sent, without calling Meta or writing anything.

import { evaluateComment, explainRuleEvaluation } from "./rule-engine.service.js";
import { extractDmCta, renderCommentReply, jobLinkValue } from "./instagram.service.js";
import { buildNamesBlock, buttonTitle, clipText, MAX_BUTTON_TEMPLATE_LINKS, type ResolvedLink } from "./job-links.js";
import type { PostJobResolution } from "./post-mapping.service.js";
import type { RuleEngineRule } from "../types/rule-engine.js";

export interface DmPreviewResult {
  /** text = plain message, button = text + 1 button, buttons = text + 2-3 buttons, carousel = 4-5 cards. */
  kind: "text" | "button" | "buttons" | "carousel";
  text: string;
  buttons: string[];
  /** 4-5 links: one card per link (role as title, company and location as subtitle). */
  cards: { title: string; subtitle: string }[];
}

export interface SimulationDeps {
  readRules(): Promise<RuleEngineRule[]>;
  resolve(mediaId: string): Promise<PostJobResolution>;
  commentVariants(rule: RuleEngineRule): Promise<{ id: string; text: string }[]>;
  dmText(rule: RuleEngineRule): Promise<string | null>;
  now?: number;
  dryRun?: boolean;
}

export interface SimulationResult {
  matched: boolean;
  reason: string;
  rule: { id: string; mode: string; keywords: string[]; replyMode: string; scope: string } | null;
  matchedKeyword: string | null;
  otherRules: { ruleId: string; active: boolean; scopeMatched: boolean; matched: boolean; keywords: string[] }[];
  mapping: { mapped: boolean; reason: string; links: ResolvedLink[]; title: string | null };
  willPostComment: boolean;
  willSendDm: boolean;
  comment: { variants: { id: string; text: string | null; error: string | null }[] };
  dm: DmPreviewResult | null;
  warnings: string[];
  dryRun: boolean;
}

/** Mirrors processDirectMessage: how the DM is shaped for 1, 2-3 and 4-5 links. */
export function buildDmPreview(
  dmTemplate: string,
  resolution: Pick<PostJobResolution, "jobUrl" | "links" | "company" | "jobTitle" | "title" | "location">,
  username: string,
): { preview: DmPreviewResult | null; error: string | null } {
  const links = resolution.links ?? [];
  const multi = links.length > 1;
  const vars = {
    commentReplyText: dmTemplate,
    username,
    company: resolution.company ?? "",
    title: resolution.jobTitle ?? resolution.title ?? "",
    location: resolution.location ?? "",
    jobLink: multi ? buildNamesBlock(links) : resolution.jobUrl ?? "",
  };
  const rendered = renderCommentReply(dmTemplate, vars);
  if (!rendered.ok) return { preview: null, error: rendered.error ?? "render_failed" };

  const cta = extractDmCta(rendered.rendered);
  if (!multi) {
    return {
      preview: { kind: cta.label ? "button" : "text", text: cta.text, buttons: cta.label ? [clipText(cta.label, 20)] : [], cards: [] },
      error: null,
    };
  }
  let text = cta.text;
  if (!dmTemplate.includes("{{jobLink}}")) text = `${text}\n\n${buildNamesBlock(links)}`.trim();

  if (links.length <= MAX_BUTTON_TEMPLATE_LINKS) {
    return { preview: { kind: "buttons", text, buttons: links.map((l, i) => buttonTitle(i, l.label)), cards: [] }, error: null };
  }
  return { preview: { kind: "carousel", text: "", buttons: [], cards: links.map((l) => ({ title: clipText(l.title || l.label, 80), subtitle: clipText(l.subtitle || "Tap to view & apply", 80) })) }, error: null };
}

export async function simulateComment(
  input: { mediaId: string; commentText: string; username?: string | null },
  deps: SimulationDeps,
): Promise<SimulationResult> {
  const now = deps.now ?? Date.now();
  const username = (input.username ?? "").trim() || "instagram_user";
  const warnings: string[] = [];
  const rules = await deps.readRules();

  const context = {
    commentText: input.commentText,
    mediaId: input.mediaId,
    userId: "simulated_user",
    username,
    commentId: null,
    receivedAt: now,
  };

  const result = evaluateComment(rules, context, now);
  const others = explainRuleEvaluation(rules, context, now).map((e) => ({
    ruleId: e.ruleId,
    active: e.active,
    scopeMatched: e.scopeMatched,
    matched: e.matched,
    keywords: e.keywords,
  }));

  const resolution = await deps.resolve(input.mediaId);
  const mapping = {
    mapped: resolution.mapped,
    reason: resolution.reason,
    links: resolution.links ?? [],
    title: resolution.jobTitle,
  };

  const base: SimulationResult = {
    matched: result.matched,
    reason: result.reason,
    rule: null,
    matchedKeyword: result.matchedKeyword,
    otherRules: others,
    mapping,
    willPostComment: false,
    willSendDm: false,
    comment: { variants: [] },
    dm: null,
    warnings,
    dryRun: deps.dryRun ?? false,
  };

  if (!resolution.mapped) {
    warnings.push(`This post has no usable mapping (${resolution.reason}). The automation would not reply.`);
  }
  if (!result.matched || !result.rule) {
    if (rules.length === 0) warnings.push("There are no rules yet.");
    return base;
  }

  const rule = result.rule;
  base.rule = { id: rule.id, mode: rule.mode, keywords: rule.keywords, replyMode: rule.replyMode, scope: rule.scope };
  base.willPostComment = resolution.mapped && rule.replyMode !== "dm_only";
  base.willSendDm = resolution.mapped && rule.replyMode !== "comment_only";

  if (!resolution.mapped) return base;

  if (base.willPostComment) {
    const variants = await deps.commentVariants(rule);
    if (variants.length === 0) warnings.push("This rule posts a public reply but has no usable comment template.");
    for (const v of variants) {
      const r = renderCommentReply(v.text, {
        commentReplyText: v.text,
        username,
        company: resolution.company ?? "",
        title: resolution.jobTitle ?? resolution.title ?? "",
        location: resolution.location ?? "",
        jobLink: jobLinkValue(resolution),
      });
      base.comment.variants.push({ id: v.id, text: r.ok ? r.rendered : null, error: r.ok ? null : r.error ?? "render_failed" });
      if (!r.ok) warnings.push(`A comment template cannot be rendered: ${r.error}. That reply would NOT be sent.`);
    }
    if (variants.length > 1) warnings.push(`Rotation is on: one of ${variants.length} comment templates is picked at random.`);
  }

  if (base.willSendDm) {
    const dmTemplate = await deps.dmText(rule);
    if (!dmTemplate) {
      warnings.push("This rule sends a DM but has no usable DM template.");
    } else {
      const built = buildDmPreview(dmTemplate, resolution, username);
      if (built.error) warnings.push(`The DM template cannot be rendered: ${built.error}. The DM would NOT be sent.`);
      base.dm = built.preview;
    }
  }

  if (deps.dryRun) warnings.push("Dry-run mode is ON: in production nothing is actually sent to Instagram.");
  return base;
}
