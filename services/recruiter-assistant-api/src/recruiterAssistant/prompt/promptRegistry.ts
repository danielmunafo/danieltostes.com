import {
  type AgentInstructionPath,
  getAgentInstruction,
  listAgentInstructionPaths,
} from "./getAgentInstruction.js";

/**
 * Prompt registry: the single explicit record of which prompt powers each AI stage,
 * and at what version. Before this, the only version history was git.
 *
 * The `stage` of each entry is the SAME stable string the tracing layer already records
 * via `RequestTrace.recordStage({ stage })` (see ../../tracing/requestTrace.ts). That makes
 * the registry the join key between a prompt version and a trace, without this module having
 * to touch the shared AI-call wrappers. See docs/prompt-registry.md for the lifecycle.
 *
 * This module is intentionally pure metadata: it changes no prompt wording and no runtime
 * behavior. Canonical prompt text still lives in the `.md` instruction files (loaded via
 * getAgentInstruction) or in the inline source noted on each entry.
 */

/** Stable stage identifier, identical to the string recorded by the tracing layer. */
export type PromptStage =
  | "intent_gate"
  | "evidence_evaluation"
  | "hard_gates"
  | "evidence_analysis"
  | "briefing_prep"
  | "chart"
  | "pitch"
  | "references_claims"
  | "interests";

/** Where a prompt's canonical text lives. */
export type PromptSource =
  | { kind: "file"; files: readonly AgentInstructionPath[] }
  | { kind: "inline"; module: string; symbol: string };

export type PromptMetadata = {
  /** Stable, human-readable id. Never reused for a different prompt. */
  promptId: string;
  /** Semantic version "MAJOR.MINOR.PATCH". Bump on any prompt-text change. */
  version: string;
  /** Trace stage string this prompt drives — the link to RequestTrace.recordStage. */
  stage: PromptStage;
  /** Canonical source of the prompt text. */
  source: PromptSource;
  /** One-line description of the stage's job, for humans reviewing changes. */
  description: string;
  /** ISO date (YYYY-MM-DD) the version last changed. */
  lastUpdated: string;
  /** Accountable owner handle. */
  owner: string;
};

const OWNER = "daniel-tostes";
const SEEDED_AT = "2026-06-22";

const PROMPT_REGISTRY = [
  {
    promptId: "intent-gate",
    version: "1.0.0",
    stage: "intent_gate",
    source: {
      kind: "inline",
      module: "src/security/intentGate.ts",
      symbol: "INTENT_GATE_SYSTEM",
    },
    description:
      "Classifies a single user message as RECRUITER or OFF_TOPIC before the pipeline runs.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "evidence-evaluation",
    version: "1.0.0",
    stage: "evidence_evaluation",
    source: {
      kind: "file",
      files: ["agents/evidenceEvaluation/instructions.md"],
    },
    description:
      "Scores JD requirements against retrieved portfolio evidence, applying hard score caps.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "hard-gates",
    version: "1.0.0",
    stage: "hard_gates",
    source: { kind: "file", files: ["agents/hardGates/instructions.md"] },
    description:
      "Extracts structured hard-gate requirement rows (must-have constraints) from the JD.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "evidence-analysis",
    version: "1.0.0",
    stage: "evidence_analysis",
    source: {
      kind: "file",
      files: ["agents/evidenceAnalysis/instructions.md"],
    },
    description:
      "Analyzes retrieved evidence into a structured brief used downstream by the pitch.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "briefing",
    version: "1.0.0",
    stage: "briefing_prep",
    source: {
      kind: "file",
      files: ["agents/briefing/briefingInstructions.md"],
    },
    description:
      "Streams the recruiter-facing briefing prep before the chart and pitch.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "chart",
    version: "1.0.0",
    stage: "chart",
    source: {
      kind: "file",
      files: [
        "agents/chart/chartInstructions.md",
        "agents/chart/chartInstructionsCompact.md",
      ],
    },
    description:
      "Projects the fit chart (per-dimension scores + assessment summary); compact variant appended on demand.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "pitch",
    version: "1.0.0",
    stage: "pitch",
    source: { kind: "file", files: ["agents/pitch/instructions.md"] },
    description:
      "Generates the streamed recruiter pitch grounded in the evidence brief.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "references-claims",
    version: "1.0.0",
    stage: "references_claims",
    source: {
      kind: "file",
      files: ["agents/references/claimExtractionInstructions.md"],
    },
    description:
      "Extracts verifiable claims from the pitch for reference grounding.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
  {
    promptId: "interests",
    version: "1.0.0",
    stage: "interests",
    source: { kind: "file", files: ["agents/interests/instructions.md"] },
    description:
      "Evaluates the candidate's interest alignment against the role.",
    lastUpdated: SEEDED_AT,
    owner: OWNER,
  },
] as const satisfies readonly PromptMetadata[];

export type RegisteredPromptId = (typeof PROMPT_REGISTRY)[number]["promptId"];

/** All registered prompts, in pipeline order. */
export function listPrompts(): readonly PromptMetadata[] {
  return PROMPT_REGISTRY;
}

/** Looks up a prompt by its stable id. Throws if the id is not registered. */
export function getPromptById(promptId: string): PromptMetadata {
  const entry = PROMPT_REGISTRY.find((p) => p.promptId === promptId);
  if (!entry) {
    throw new Error(`Unknown promptId: ${promptId}`);
  }
  return entry;
}

/**
 * Looks up a prompt by its trace stage. This is the trace-attach helper: a tracing
 * call site can pass `getPromptByStage(stage)` to record `promptId`/`version` alongside
 * the existing stage record. Throws if the stage is not registered.
 */
export function getPromptByStage(stage: PromptStage): PromptMetadata {
  const entry = PROMPT_REGISTRY.find((p) => p.stage === stage);
  if (!entry) {
    throw new Error(`Unknown prompt stage: ${stage}`);
  }
  return entry;
}

/** Instruction files referenced by a prompt entry (empty for inline prompts). */
export function promptInstructionFiles(
  metadata: PromptMetadata
): readonly AgentInstructionPath[] {
  return metadata.source.kind === "file" ? metadata.source.files : [];
}

/** Re-exported so consistency checks can compare the registry against the loader. */
export { getAgentInstruction, listAgentInstructionPaths };
