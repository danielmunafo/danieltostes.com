# Prompt registry & versioning

The recruiter-assistant pipeline runs nine LLM stages, each driven by a prompt. Before the
registry, the only record of a prompt's version was git history — there was no explicit
version to attach to a trace, compare across an eval run, or point at in a review.

The registry ([`src/recruiterAssistant/prompt/promptRegistry.ts`](../src/recruiterAssistant/prompt/promptRegistry.ts))
makes each prompt version **explicit**, **attachable to traces**, and **easy to discuss**.
It is pure metadata: it changes no prompt wording and no model behavior. Canonical prompt
text still lives where it always did — in the `.md` instruction files (loaded via
[`getAgentInstruction.ts`](../src/recruiterAssistant/prompt/getAgentInstruction.ts)) or in
the inline system string noted on the entry.

## How a prompt version is defined

Each stage has one `PromptMetadata` entry:

| Field         | Meaning                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `promptId`    | Stable, human-readable id (e.g. `pitch`). Never reused for another prompt.               |
| `version`     | Semantic version `MAJOR.MINOR.PATCH`. Bumped on any prompt-text change.                  |
| `stage`       | The trace stage string this prompt drives — the join key to tracing.                     |
| `source`      | Where the text lives: `{ kind: "file", files }` or `{ kind: "inline", module, symbol }`. |
| `description` | One line on the stage's job, for reviewers.                                              |
| `lastUpdated` | ISO date (`YYYY-MM-DD`) the version last changed.                                        |
| `owner`       | Accountable owner handle.                                                                |

The nine stages and their sources:

| `promptId`            | `stage` (trace key)   | Source                                                      |
| --------------------- | --------------------- | ----------------------------------------------------------- |
| `intent-gate`         | `intent_gate`         | inline `INTENT_GATE_SYSTEM` in `src/security/intentGate.ts` |
| `evidence-evaluation` | `evidence_evaluation` | `agents/evidenceEvaluation/instructions.md`                 |
| `hard-gates`          | `hard_gates`          | `agents/hardGates/instructions.md`                          |
| `evidence-analysis`   | `evidence_analysis`   | `agents/evidenceAnalysis/instructions.md`                   |
| `briefing`            | `briefing_prep`       | `agents/briefing/briefingInstructions.md`                   |
| `chart`               | `chart`               | `agents/chart/chartInstructions.md` (+ `…Compact.md`)       |
| `pitch`               | `pitch`               | `agents/pitch/instructions.md`                              |
| `references-claims`   | `references_claims`   | `agents/references/claimExtractionInstructions.md`          |
| `interests`           | `interests`           | `agents/interests/instructions.md`                          |

A test (`tests/promptRegistry.test.ts`) enforces a **bijection** between the registry's
file sources and `listAgentInstructionPaths()`: add a prompt file without registering it (or
vice versa) and the suite fails. It also checks unique ids/stages, semver/date formats, and
that every referenced file loads with non-empty content.

> The legacy `src/rag/*Prompt.ts` builders are intentionally **not** registered — they are
> superseded by the `agents/*` generation and imported only by tests.

## How to bump a prompt version

The **registry is the sole source of version truth.** `.md` instruction files contain prompt
text only — no frontmatter, no version comments. Never add version metadata to an `.md` file.

To ship a prompt change:

1. Edit the prompt text in its canonical location:
   - **File-backed prompt** (`source.kind === "file"`): edit the `.md` file(s) listed in
     `source.files`.
   - **Inline prompt** (`source.kind === "inline"`): edit the `symbol` in the `module` named
     on the entry (e.g. `INTENT_GATE_SYSTEM` in `src/security/intentGate.ts`).
2. In `promptRegistry.ts`, bump `version` on that entry:
   - **PATCH** — wording/clarity tweak, no intended behavior change.
   - **MINOR** — new guidance or capability, backward-compatible output shape.
   - **MAJOR** — output contract or behavior changes (downstream parsers/evals may need
     updating).
3. In the same registry entry, update `lastUpdated` to today (`YYYY-MM-DD`).
4. Run `npm test`.

The `promptId` and `stage` are **stable across bumps** — only `version`/`lastUpdated` move.
That stability is what lets a trace or eval from six months ago still name the exact prompt it ran.

## How this connects to traces and evals

**Tracing.** Each LLM stage already records itself through
[`requestTrace.ts`](../src/tracing/requestTrace.ts) as
`recordStage({ stage, model, ... })`. Because a registry entry's `stage` is that same string,
attaching the prompt version to a trace is a lookup, not a refactor:

```ts
const { promptId, version } = getPromptByStage(stage);
// record promptId + version on the StageRecord
```

This is wired at the `RequestTrace.recordStage` boundary with a non-throwing stage lookup.
Registered prompt-backed stages attach optional `promptId` and `promptVersion` fields to
their `StageRecord`; unregistered technical stages such as `retrieval_embed` and
`references_embed` remain valid and omit those fields.

**Evals.** The E2E eval runner (`npm run eval:e2e`) prints the active registry versions as
`promptId@version` at the start and end of the run. That turns "the pitch got worse" into
"pitch `1.2.0` regressed vs `1.1.0` on these JDs", and lets a trace be replayed against the
exact prompt version that produced it.

Together this is a step toward AI production-lifecycle maturity: prompts become versioned,
owned artifacts whose changes are reviewable, traceable, and measurable — not just diffs in git.
