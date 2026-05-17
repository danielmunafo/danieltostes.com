# Recruiter assistant — reference map

## Key paths

| Area | Path |
|------|------|
| UI feature | `src/features/recruiter-assistant/` |
| API URL helper | `src/features/recruiter-assistant/lib/api-url.ts` |
| Home composition | `src/components/HomeContent.tsx` |
| Section ids / parallax | `src/constants/sections.ts` |
| Lambda entry | `services/recruiter-assistant-api/src/handler.ts` → `handleChatRequest.ts` |
| Stream pipeline (orchestrator only) | `services/recruiter-assistant-api/src/recruiterAssistant/pipeline/runRecruiterAssistantPipeline.ts` |
| Portfolio assistant narrative (RAG) | `public/content/experience/danieltostes-com/<locale>.md` — keep in sync when pipeline/agents change |
| Agent facades + `.md` instructions | `services/recruiter-assistant-api/src/recruiterAssistant/agents/*/*Agent.ts` (incl. `recruiterAgent` for off-topic, briefing+chart, pitch), `src/recruiterAssistant/prompt/getAgentInstruction.ts` |
| RAG retrieve | `services/recruiter-assistant-api/src/rag/retrieve.ts` |
| Hard gates | `services/recruiter-assistant-api/src/rag/hardGates/` |
| Chart projection | `services/recruiter-assistant-api/src/recruiterAssistant/agents/chart/` |
| Briefing prep stream | `services/recruiter-assistant-api/src/recruiterAssistant/agents/briefing/` |
| Prompt assembly (evaluator + analyst + pitch) | `services/recruiter-assistant-api/src/recruiterAssistant/agents/*/assemblePrompt.ts` + colocated `instructions.md` |
| Prompt re-exports (tests / legacy imports) | `services/recruiter-assistant-api/src/rag/evaluatorPrompt.ts`, `prompt.ts`, `briefingPrepStatusPrompt.ts`, `chartProjectionPrompt.ts`, `interestsPrompt.ts` |
| References builder | `services/recruiter-assistant-api/src/rag/references.ts` |
| Tunables | `services/recruiter-assistant-api/src/constants.ts` (`CHAT_MODEL` defaults to **`gpt-4.1-nano`**; override with Lambda env `RECRUITER_CHAT_MODEL` in AWS, or `.env` locally) |
| Input guard / intent / rate limit | `services/recruiter-assistant-api/src/security/` |
| Embeddings load | `services/recruiter-assistant-api/src/embeddings/loadEmbeddings.ts` |
| Build script | `services/recruiter-assistant-api/scripts/build-embeddings.mjs` |
| Local dev server | `services/recruiter-assistant-api/scripts/dev-server.mjs` |
| Terms route | `src/app/[locale]/recruiter-assistant/terms/page.tsx` |
| Terms markdown | `public/content/recruiter-assistant/terms/<locale>.md` |
| Professional context route | `src/app/[locale]/recruiter-assistant/professional-context/page.tsx` |
| Professional context markdown | `public/content/recruiter-assistant/professional-context/<locale>.md` |
| CI (API) | `.github/workflows/recruiter-api.yml` |
| Site CI var | `.github/workflows/ci.yml` (`NEXT_PUBLIC_RECRUITER_API_URL` / `vars.RECRUITER_API_URL`) |

## Client markers

Keep API `constants.ts` and `src/features/recruiter-assistant/lib/split-thinking-from-body.ts` in sync:

| Marker pair | Purpose |
|-------------|---------|
| `THINKING_*` | Collapsible evidence evaluator + analyst |
| `BRIEFING_PREP_*` | Ephemeral one-line status before pitch (stripped from final body) |
| `CHART_DATA_*` | Match-profile JSON for radar/summary UI |

## Typical tasks → where to edit

- **Tune retrieval or references:** `constants.ts` (`RAG_TOP_K`, `REFERENCE_*`, `EVIDENCE_EVALUATOR_MAX_TOKENS`, `EVIDENCE_BRIEF_MAX_TOKENS`, thresholds), then `retrieve.ts` / `references.ts` / tests under `services/recruiter-assistant-api/tests/`.
- **Change model behavior / stage order:** `agents/**/instructions.md`, `agents/*/assemblePrompt.ts`, `runRecruiterAssistantPipeline.ts`, associated tests.
- **Tune match profile chart:** `agents/chart/assembleChartPrompt.ts`, `chartDataSchema.ts`, `runRecruiterAssistantPipeline.ts` (briefing + chart steps), `syncChartWithPitch.ts`.
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
