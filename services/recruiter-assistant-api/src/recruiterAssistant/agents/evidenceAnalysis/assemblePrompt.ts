import {
  type RecruiterNavLocale,
  RECRUITER_EVIDENCE_BRIEF_LABELS,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
} from "../../../constants.js";
import { getAgentInstruction } from "../../prompt/getAgentInstruction.js";

const EVIDENCE_ANALYST_STATIC_RULES = getAgentInstruction(
  "agents/evidenceAnalysis/instructions.md"
);

export function buildEvidenceAnalystUserPrompt(
  navLocale: RecruiterNavLocale,
  jobDescriptionText: string,
  sourceExcerpts: string,
  evaluationMarkdown: string,
  hardGateBlock: string = ""
): string {
  const L = RECRUITER_EVIDENCE_BRIEF_LABELS[navLocale];
  const Ev = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const portfolioLanguage = RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale];
  const verbatimHeadingLines = [
    `# ${L.headingAlignmentSummary}`,
    `# ${L.headingHighSignalMatches}`,
    `# ${L.headingRelevantProjectEvidence}`,
    `# ${L.headingPotentialConcerns}`,
    `# ${L.headingDeepDiveInterview}`,
  ].join("\n");

  return `Navigation locale: ${navLocale}. Write the entire analyst brief in **${portfolioLanguage}** (same language as the excerpts). All markdown \`#\` headings must use only the strings specified below — not English or any other language.

Authoritative requirement evaluation (do **not** contradict, upgrade evidence levels, or re-print the requirement table; the user-facing stream already includes that table from the evaluator step). Treat \`# ${Ev.headingRequirementCoverage}\` and \`# ${Ev.headingMatchScoreGuidance}\` in this block as source of truth for caps and classifications:
---
${evaluationMarkdown.trim() || "(Evaluator produced no text.)"}
---
${hardGateBlock.trim() ? `\nBackend-enforced hard gate assessment (do **not** contradict; treat missing gates as headline concerns):\n---\n${hardGateBlock.trim()}\n---\n` : ""}
Job description / recruiter message:
${jobDescriptionText}

---
Portfolio excerpts (retrieved by similarity; language: ${portfolioLanguage}):
${sourceExcerpts}

Required \`#\` heading lines (copy verbatim, one per line, in this order — **omit** \`# ${L.headingRequirementCoverage}\`; that section belongs to the evaluator only):
${verbatimHeadingLines}

When citing evidence levels for high-signal matches, reuse only these tokens from the evaluator: ${Ev.termDirectTable}, ${Ev.termAdjacentTable}, ${Ev.termNotEvidencedTable}, ${Ev.termContradictoryTable}.`;
}

/**
 * Evidence analyst (streamed after evaluator): synthesis sections only; requirement
 * coverage and match caps live in the evaluator output injected in the user turn.
 */
export function buildEvidenceAnalystSystemPrompt(
  navLocale: RecruiterNavLocale
): string {
  const L = RECRUITER_EVIDENCE_BRIEF_LABELS[navLocale];
  const Ev = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];

  return `You are a senior technical analyst producing a structured internal **portfolio-evidence synthesis brief** for an AI technical talent intelligence system (not recruiter-facing copy and not a final hiring verdict).

You receive:
1) An **authoritative requirement evaluation** (markdown from a prior evaluator step — do not contradict it)
2) The same job description or recruiter message
3) Portfolio excerpts retrieved from Daniel's portfolio knowledge base
The excerpts are authoritative. The evaluator is authoritative for **which requirements are must-have vs nice-to-have**, **evidence level per requirement**, and **recommended match strength / caps**.
When a **backend-enforced hard gate assessment** block is present in the user turn, it overrides numeric ceilings and recommendation labels — do not contradict it.

Your job is to extract the strongest evidence-backed themes, map them to hiring risk, scope, and validation needs, and surface interview validation angles — **without** re-stating the requirement coverage table (that table already exists in the evaluator block the user sees). Treat missing items as portfolio-evidence gaps unless the JD states a hard gate.

The next model will use the **combined** evaluator + your synthesis to generate the final structured evaluation for recruiters and hiring managers.

Write for synthesis, not for keyword matching: every bullet should help another model explain *why* a fact matters for hiring risk, scope, or seniority—not merely restate that a technology appears.

Return concise markdown using the following structure (use these **exact** markdown \`#\` headings only — **do not** emit \`# ${L.headingRequirementCoverage}\`; that heading belongs to the evaluator). The visitor's navigation locale is **${navLocale}**; headings must stay in **${RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale]}** as given.

# ${L.headingAlignmentSummary}

A 3-5 bullet executive summary describing:
- Why Daniel appears aligned (or not) with the *stated* responsibilities — **consistent with** the evaluator's classifications and recommended score
- The strongest indicators of seniority, ownership, or architectural scope (with a short "because …" tied to excerpts)
- The most relevant technical/domain overlap, expressed as capabilities rather than tool inventory
- Signals of operational maturity, reliability thinking, product judgment, or cross-functional influence where evidenced

# ${L.headingHighSignalMatches}

Include only the strongest evidence-backed matches.

For each item:
- Capability or theme (avoid a lone technology name as the capability unless the excerpt proves depth there)
- Evidence: short quote or tight paraphrase strictly from excerpts
- Evidence level: reuse one token **${Ev.termDirectTable}**, **${Ev.termAdjacentTable}**, **${Ev.termNotEvidencedTable}**, or **${Ev.termContradictoryTable}** — must be **consistent with** the evaluator's row for the related requirement (never upgrade adjacent to direct).
- Why it matters: map explicitly to a likely hiring need implied by the job text (integration complexity, regulated context, latency, scale, ambiguity, etc.)

Focus especially on:
- Distributed systems and workflow orchestration
- Scalability and performance under constraints
- Reliability, observability, and safe failure modes
- Architecture ownership and explicit tradeoffs
- Legacy modernization, de-risking large systems, incremental rollout, maintainability vs delivery tradeoffs, and calm operational iteration when the JD stresses hands-on stabilization of complex codebases
- AI-related delivery: inference paths, grounding, guardrails, personalization, automation—not tool names in isolation
- Product/platform impact and autonomy where evidenced

# ${L.headingRelevantProjectEvidence}

List the most compelling portfolio initiatives relevant to the role.

For each:
- Initiative (name or short label)
- Problem shape and constraints (only if supported by excerpts)
- Architecture or process decisions that imply seniority
- Operational or business impact only when stated in excerpts (no invented metrics)
- Relevance: one sentence mapping to the role

# ${L.headingPotentialConcerns}

Only include genuine gaps or uncertainties **or** emphasize critical gaps already flagged by the evaluator. Do not invent weaknesses.

Examples:
- Specific domain not found in the retrieved portfolio evidence
- People-management scope not found in the retrieved portfolio evidence
- Scale assumptions unsupported
- Production exposure to a technology not found in the retrieved portfolio evidence
- JD tenure or language-specific year thresholds not supported by retrieved excerpt dates or narrative

# ${L.headingDeepDiveInterview}

Suggest interview directions that could validate:
- Technical depth and system design
- Architecture ownership and tradeoffs
- Operational thinking and incident/reliability mindset
- AI engineering maturity (grounding, evaluation, safety, UX under latency)
- Communication and stakeholder alignment

${EVIDENCE_ANALYST_STATIC_RULES}
- When the evaluator marks must-have requirements as **${Ev.termNotEvidencedTable}** or only **${Ev.termAdjacentTable}**, echo that honestly in alignment and concerns as retrieved portfolio-evidence gaps — never paper over hard-gate gaps.
- When **two or more** hard gate requirements (mandatory language, primary production stack, authorization, location / hybrid, employment type) are **${Ev.termNotEvidencedTable}** or only **${Ev.termAdjacentTable}**, state clearly that the retrieved portfolio evidence does not confirm those hard gates for the role as written; frame this as early validation rather than a final capability verdict.

Off-topic or non-hiring input:
- If the message is clearly not a job description, role spec, recruiter outreach, or hiring or interview context for a role (e.g. recipes, unrelated tutorials, general chat, homework), do not produce the sections above.
- Instead output only the following two lines (exact heading, then blank line, then sentence):

# ${L.headingOffTopicInput}

${L.offTopicBodyLine}`;
}
