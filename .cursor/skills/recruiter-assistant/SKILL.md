---
name: recruiter-assistant
description: Recruiter AI chat (Next.js + Lambda RAG). Invoke for assistant UI, API, embeddings, terms, or recruiter CI.
---

# Recruiter Assistant

## Purpose

Give the agent a **single entry point** for the optional “AI recruiter assistant” feature: static Next.js site + separate Node Lambda with **vector RAG** (S3 JSON embeddings, cosine top-K). **Runtime order** is implemented in `services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts` (not a monolithic `handler.ts` body): **evaluator** + **hard-gate assessment** (server-only, caps pitch/chart) + optional **interests** `generateText` (server-logged only) + **analyst** inside `THINKING_*` markers → after close: **briefing-prep status** stream + **match-profile chart** JSON (`CHART_DATA_*`, `BRIEFING_PREP_*` markers) → **pitch** (hard-gate clamp) → optional chart re-emit aligned to pitch → **post-stream** `## References`. HTTP entry: `handleChatRequest.ts` → `createRecruiterAssistantStreamResponse.ts`.

This skill is **project-local knowledge**, not runtime RAG. For authoritative architecture and security detail, read the linked docs in order below.

## When to use

Use this skill when the task touches any of:

- `src/features/recruiter-assistant/**` or `ChatHero` / home composition for the assistant.
- `services/recruiter-assistant-api/**` (handler, RAG, guards, rate limit, prompts, embeddings scripts, tests).
- `public/content/**` chunks that feed embeddings, or `src/messages/**` if included in the embedding corpus.
- `NEXT_PUBLIC_RECRUITER_API_URL`, CORS, `ALLOWED_ORIGIN`, Secrets Manager, Function URL, `INTERESTS_PACK_*` / `private/` interests pack, `.github/workflows/recruiter-api.yml`.
- Legal/terms copy: `public/content/recruiter-assistant/terms/<locale>.md` and `src/app/[locale]/recruiter-assistant/terms/`.

**Invocation:** Say e.g. “use the recruiter-assistant skill” so the agent loads this file; ambient matching is not guaranteed.

## Read first (in order)

1. `.cursor/rules/recruiter-assistant.mdc` — scope, i18n keys, API URL, styling, pipeline summary, dependency split.
2. `docs/plans/recruiter-assistant-plan.md` — locked decisions, handler flow, security, CI, verification.
3. AWS / deploy / secrets steps: `services/recruiter-assistant-api/SETUP.md`.

For a **file map and command cheat sheet**, open [reference.md](reference.md).

## Architecture (one screen)

- **Browser:** `@ai-sdk/react` `useChat` → Function URL (data stream). Client splits markers via `src/features/recruiter-assistant/lib/split-thinking-from-body.ts` (must match `constants.ts`).
- **Lambda HTTP:** `parseAndValidateRecruiterRequest` (input guard, rate limit, CORS, optional reCAPTCHA) → `runIntentGate` → `runRecruiterAssistantPipeline`.
- **Pipeline (ordered):** `prepareRecruiterContext` (embed + `retrieveTopK`) → **evaluator** `streamText` → **hard gates** (`extractHardGateRows` + `assessHardGates`; not streamed) → optional **interests** `generateText` (`[recruiter-interests-not-in-response]` when non-empty) → **analyst** `streamText` → `THINKING_CLOSE` → **briefing prep** `streamText` + **chart** `generateObject` in parallel (`runBriefingAndChartProjection`) → **pitch** `streamText` (respects hard-gate technical-fit cap; `validateAndClampPitchHardGates`) → `syncChartWithPitch` (may re-emit chart) → **references** (`generateObject` + embed match-back).
- **Embeddings:** `scripts/build-embeddings.mjs` → JSON at runtime (local path or S3 per env).
- **Interests pack (optional):** `scripts/build-interests-pack.mjs` from `private/interests.source.md`; load via `INTERESTS_PACK_JSON_PATH` or S3 (see `SETUP.md`).

## Agent workflow

1. Confirm whether the change is **UI-only**, **API-only**, **content/embeddings**, or **infra/CI**; read the minimum files from [reference.md](reference.md) for that track.
2. Respect **security**: do not log secrets or full prompts in production; keep CORS allowlist aligned in prod.
3. **i18n:** user-visible strings under `RecruiterAssistant` / `RecruiterAssistantTerms` / `RecruiterAssistantProfessionalContext` in **all four** `src/messages/*.json` (see `.cursor/rules/i18n.mdc`).
4. After edits, run checks listed in **Verification** on the relevant package (root and/or service).

## Verification

- Root: `npm run format:check`, `npm run lint`, `npm run test` (and `npm run build` / `npm run test:e2e` when the change affects the static app or smoke paths).
- Service: `cd services/recruiter-assistant-api && npm test`.

## Coordination with portfolio content

Portfolio facts live in markdown/json that may be **embedded into RAG**. When changing experience copy primarily for narrative/positioning, consider **portfolio-career-reviewer**; when wiring that copy into **assistant retrieval, prompts, or build scripts**, use **this skill** and rebuild embeddings per `SETUP.md` / CI.
