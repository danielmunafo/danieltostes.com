---
name: recruiter-assistant
description: Recruiter AI chat (Next.js + Lambda RAG). Invoke for assistant UI, API, embeddings, terms, or recruiter CI.
---

# Recruiter Assistant

## Purpose

Give the agent a **single entry point** for the optional “AI recruiter assistant” feature: static Next.js site + separate Node Lambda with **vector RAG** (canonical `llamaindex-index.json` corpus, default `llamaindex-native` retrieval). **Runtime order** is implemented in [`runRecruiterAssistantPipeline.ts`](services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts) (not a monolithic `handler.ts` body). The pipeline **orchestrates topic agents** under `services/recruiter-assistant-api/src/recruiterAssistant/agents/`; behavioral rules live in colocated **`instructions.md`** files loaded via [`getAgentInstruction.ts`](services/recruiter-assistant-api/src/recruiterAssistant/prompt/getAgentInstruction.ts). HTTP entry: `handleChatRequest.ts` → `createRecruiterAssistantStreamResponse.ts`.

This skill is **project-local knowledge**, not runtime RAG. For authoritative architecture and security detail, read the linked docs in order below.

## When to use

Use this skill when the task touches any of:

- `src/features/recruiter-assistant/**` or `ChatHero` / home composition for the assistant.
- `services/recruiter-assistant-api/**` (handler, RAG, guards, rate limit, prompts, embeddings scripts, tests).
- `public/content/**` chunks that feed embeddings, or `src/messages/**` if included in the embedding corpus.
- `NEXT_PUBLIC_RECRUITER_API_URL`, CORS, `ALLOWED_ORIGIN`, Secrets Manager, Function URL, `INTERESTS_PACK_*` / `private/` interests pack, `.github/workflows/recruiter-api.yml`.
- Legal/terms copy: `public/content/recruiter-assistant/terms/<locale>.md` and `src/app/[locale]/recruiter-assistant/terms/`.
- Portfolio narrative for this project: `public/content/experience/danieltostes-com/<locale>.md` (all four locales).

**Invocation:** Say e.g. “use the recruiter-assistant skill” so the agent loads this file; ambient matching is not guaranteed.

## Read first (in order)

1. `.cursor/rules/recruiter-assistant.mdc` — scope, i18n keys, API URL, styling, pipeline summary, dependency split.
2. `docs/plans/recruiter-assistant-plan.md` — locked decisions, handler flow, security, CI, verification.
3. AWS / deploy / secrets steps: `services/recruiter-assistant-api/SETUP.md`.

For a **file map and command cheat sheet**, open [reference.md](reference.md).

## Architecture (one screen)

- **Browser:** `@ai-sdk/react` `useChat` → Function URL (data stream). Client splits markers via `src/features/recruiter-assistant/lib/split-thinking-from-body.ts` (must match `constants.ts`).
- **Lambda HTTP:** `parseAndValidateRecruiterRequest` (input guard, rate limit, CORS, optional reCAPTCHA) → `runIntentGate` → `runRecruiterAssistantPipeline`.
- **Pipeline orchestration (ordered):** `contextAgent.createContext` (`RecruiterRetriever` in `src/retrieval/`; default `custom`, optional LlamaIndex via `RECRUITER_RETRIEVER_PROVIDER`) → `evidenceEvaluationAgent.evaluateEvidence` (streamed in `THINKING_*`) → `recruiterAgent.evaluateOffTopic` → `hardGatesAgent.assessHardGates` (server-only) → `interestsAgent.scheduleEvaluation` (background, server-only) → `evidenceAnalysisAgent.analyzeEvidence` (streamed) → `THINKING_CLOSE` → `recruiterAgent.projectBriefingAndChart` (briefing stream + chart JSON in parallel when on-topic) → `recruiterAgent.generatePitch` → `recruiterAgent.syncChartWithPitch` → `referencesAgent.generateReferences`.
- **Sub-agents:** `briefingAgent` and `chartAgent` are invoked inside `recruiterAgent.projectBriefingAndChart`; prompts in `agents/briefing/` and `agents/chart/`.
- **Corpus index:** `scripts/build-llamaindex-index.mjs` → `llamaindex-index.json` at runtime (local path or S3).
- **Interests pack (optional):** `scripts/build-interests-pack.mjs` from `private/interests.source.md`; load via `INTERESTS_PACK_JSON_PATH` or S3 (see `SETUP.md`).

## Agent workflow

1. Confirm whether the change is **UI-only**, **API-only**, **content/embeddings**, or **infra/CI**; read the minimum files from [reference.md](reference.md) for that track.
2. Respect **security**: do not log secrets or full prompts in production; keep CORS allowlist aligned in prod.
3. **i18n:** user-visible strings under `RecruiterAssistant` / `RecruiterAssistantTerms` / `RecruiterAssistantProfessionalContext` in **all four** `src/messages/*.json` (see `.cursor/rules/i18n.mdc`).
4. **Portfolio experience doc:** when you change pipeline stage order, agent boundaries, stream markers (`THINKING_*`, `BRIEFING_PREP_*`, `CHART_DATA_*`), or what is user-visible vs server-only, update [`public/content/experience/danieltostes-com/`](public/content/experience/danieltostes-com/) in **all four locales** (`en.md`, `pt-BR.md`, `es.md`, `it.md`)—including the **Pipeline orchestration (agents)** mermaid diagram so embedded RAG copy stays accurate. Rebuild the LlamaIndex corpus per `SETUP.md` / CI when that content is in the corpus.
5. After edits, run checks listed in **Verification** on the relevant package (root and/or service).

## Verification

- Root: `npm run format:check`, `npm run lint`, `npm run test` (and `npm run build` / `npm run test:e2e` when the change affects the static app or smoke paths).
- Service: `cd services/recruiter-assistant-api && npm test`.

## Coordination with portfolio content

Portfolio facts live in markdown/json that may be **embedded into RAG**. When changing experience copy primarily for narrative/positioning, consider **portfolio-career-reviewer**; when wiring that copy into **assistant retrieval, prompts, or build scripts**, use **this skill** and rebuild the corpus index per `SETUP.md` / CI.
