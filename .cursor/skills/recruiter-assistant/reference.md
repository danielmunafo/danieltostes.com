# Recruiter assistant — reference map

## Key paths

| Area | Path |
|------|------|
| UI feature | `src/features/recruiter-assistant/` |
| API URL helper | `src/features/recruiter-assistant/lib/api-url.ts` |
| Home composition | `src/components/HomeContent.tsx` |
| Section ids / parallax | `src/constants/sections.ts` |
| Lambda handler | `services/recruiter-assistant-api/src/handler.ts` |
| RAG retrieve | `services/recruiter-assistant-api/src/rag/retrieve.ts` |
| Prompts (evaluator + analyst + pitch) | `services/recruiter-assistant-api/src/rag/evaluatorPrompt.ts`, `services/recruiter-assistant-api/src/rag/prompt.ts` |
| References builder | `services/recruiter-assistant-api/src/rag/references.ts` |
| Tunables | `services/recruiter-assistant-api/src/constants.ts` |
| Input guard / intent / rate limit | `services/recruiter-assistant-api/src/security/` |
| Embeddings load | `services/recruiter-assistant-api/src/embeddings/loadEmbeddings.ts` |
| Build script | `services/recruiter-assistant-api/scripts/build-embeddings.mjs` |
| Local dev server | `services/recruiter-assistant-api/scripts/dev-server.mjs` |
| Terms route | `src/app/[locale]/recruiter-assistant/terms/page.tsx` |
| Terms markdown | `public/content/recruiter-assistant/terms/<locale>.md` |
| CI (API) | `.github/workflows/recruiter-api.yml` |
| Site CI var | `.github/workflows/ci.yml` (`NEXT_PUBLIC_RECRUITER_API_URL` / `vars.RECRUITER_API_URL`) |

## Client markers

Import thinking markers from the API package constants so UI and Lambda stay aligned (see `THINKING_OPEN_MARKER` / `THINKING_CLOSE_MARKER` in `constants.ts`).

## Typical tasks → where to edit

- **Tune retrieval or references:** `constants.ts` (`RAG_TOP_K`, `REFERENCE_*`, `EVIDENCE_EVALUATOR_MAX_TOKENS`, `EVIDENCE_BRIEF_MAX_TOKENS`, thresholds), then `retrieve.ts` / `references.ts` / tests under `services/recruiter-assistant-api/tests/`.
- **Change model behavior:** `evaluatorPrompt.ts`, `prompt.ts`, handler ordering in `handler.ts`, associated tests.
- **Stricter or looser input:** `inputGuard.ts`, `intentGate.ts`, tests.
- **New indexed content:** ensure the build script picks it up, run embeddings build, upload/update per `SETUP.md` or CI job.
- **New UI copy:** messages JSON (all locales) + components; long legal body in terms `.md` files.

## Local dev commands

```bash
# Terminal A — Next (port 3000)
npm run dev

# Terminal B — recruiter API (default 3001; see package.json in service)
cd services/recruiter-assistant-api && npm run dev
```

Set `NEXT_PUBLIC_RECRUITER_API_URL` at Next build time; in `next dev` the app can default to `http://127.0.0.1:3001` when unset (see RULE.md).
