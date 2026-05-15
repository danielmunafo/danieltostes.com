---
name: recruiter-assistant
description: >-
  Works on the recruiter-facing AI chat (Next.js hero + streaming Lambda RAG),
  embeddings pipeline, security gates, and AWS/CI wiring for
  danieltostes.com. Use when changing recruiter assistant UI, API handler,
  prompts, retrieval, references block, constants/tuning, i18n/terms content,
  embeddings build, or recruiter-api GitHub Actions.
---

# Recruiter Assistant

## Purpose

Give the agent a **single entry point** for the optional “AI recruiter assistant” feature: static Next.js site + separate Node Lambda with **vector RAG** (S3 JSON embeddings, cosine top-K), **two streamed segments inside thinking markers** (evidence **evaluator**, then evidence **analyst** synthesis), then recruiter **pitch** outside the close marker, plus **post-stream claim matching** into a `## References` section. When a private **interests pack** is configured, an optional **interests** `generateText` step runs server-side only (not streamed, not in the pitch brief); output is logged for operators (`[recruiter-interests-not-in-response]`).

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

1. `.cursor/rules/recruiter-assistant/RULE.md` — scope, i18n keys, API URL, styling, pipeline summary, dependency split.
2. `docs/plans/recruiter-assistant-plan.md` — locked decisions, handler flow, security, CI, verification.
3. AWS / deploy / secrets steps: `services/recruiter-assistant-api/SETUP.md`.

For a **file map and command cheat sheet**, open [reference.md](reference.md).

## Architecture (one screen)

- **Browser:** `@ai-sdk/react` `useChat` → Function URL (data stream).
- **Lambda:** validate → rate limit → `getLastUserText` → input guard → intent gate → embed query → `retrieveTopK` from loaded embeddings → **evaluator** `streamText` (requirement coverage + match score guidance) → optional **interests** `generateText` when a pack is loaded (private rubric; **not** merged into stream or pitch brief; logged server-side) → **analyst** `streamText` (synthesis only), wrapped in `THINKING_OPEN_MARKER` / `THINKING_CLOSE_MARKER` from `services/recruiter-assistant-api/src/constants.ts` → **pitch** `streamText` → post-stream `generateObject` + embeddings → `## References` markdown appended to the stream.
- **Embeddings:** `services/recruiter-assistant-api/scripts/build-embeddings.mjs` writes JSON consumed at runtime (local path or S3 per env).
- **Interests pack (optional):** `services/recruiter-assistant-api/scripts/build-interests-pack.mjs` from `private/interests.source.md` → JSON; load via `INTERESTS_PACK_JSON_PATH` or S3 env vars (see `SETUP.md`).

## Agent workflow

1. Confirm whether the change is **UI-only**, **API-only**, **content/embeddings**, or **infra/CI**; read the minimum files from [reference.md](reference.md) for that track.
2. Respect **security**: do not log secrets or full prompts in production; keep CORS allowlist aligned in prod.
3. **i18n:** user-visible strings under `RecruiterAssistant` / `RecruiterAssistantTerms` in **all four** `src/messages/*.json` (see `.cursor/rules/i18n/RULE.md`).
4. After edits, run checks listed in **Verification** on the relevant package (root and/or service).

## Verification

- Root: `npm run format:check`, `npm run lint`, `npm run test` (and `npm run build` / `npm run test:e2e` when the change affects the static app or smoke paths).
- Service: `cd services/recruiter-assistant-api && npm test`.

## Coordination with portfolio content

Portfolio facts live in markdown/json that may be **embedded into RAG**. When changing experience copy primarily for narrative/positioning, consider **portfolio-career-reviewer**; when wiring that copy into **assistant retrieval, prompts, or build scripts**, use **this skill** and rebuild embeddings per `SETUP.md` / CI.
