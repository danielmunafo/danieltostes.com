# Recruiter assistant (AI chat)

## Scope

- `src/features/recruiter-assistant/**` — UI (Chat hero, `useChat`, MUI).
- `services/recruiter-assistant-api/**` — streaming Lambda handler, RAG, embeddings build, AWS runbook.

## Agent workflow

1. Read **[docs/plans/recruiter-assistant-plan.md](../../docs/plans/recruiter-assistant-plan.md)** for decisions and verification.
2. For AWS / secrets / CI, follow **[services/recruiter-assistant-api/SETUP.md](../../services/recruiter-assistant-api/SETUP.md)**.

## Conventions

- **i18n:** All user-visible strings under `RecruiterAssistant` and `RecruiterAssistantTerms` in **all four** `src/messages/*.json` files (see `.cursor/rules/i18n/RULE.md`). Full feature terms body: `public/content/recruiter-assistant/terms/<locale>.md`; route `/<locale>/recruiter-assistant/terms`.
- **API URL:** `NEXT_PUBLIC_RECRUITER_API_URL` at **Next build time** (GitHub `vars.RECRUITER_API_URL` for CI; see `.github/workflows/ci.yml`). In `next dev`, if unset, the app defaults to `http://127.0.0.1:3001` (local recruiter-assistant-api).
- **Styling:** MUI only; prefer `sx` (see `.cursor/rules/components/RULE.md`).
- **Recruiter pipeline:** API runs streamed stages inside the thinking block: (0) RAG `embed` + cosine top-K; (1) **Evidence evaluator** `streamText`; (2) **Analyst** `streamText`; then **Pitch** `streamText` as a concise level-1 **executive brief** (Verdict, Scores, …) + post-stream `## References`. When an optional **interests pack** is configured (`INTERESTS_PACK_JSON_PATH` / S3), an **Interests evaluator** `generateText` step still runs after the evidence evaluator (JD vs private `criteriaMarkdown`, skipped when pack missing, invalid, off-topic evaluator output, or `[[INTERESTS_SKIP]]`) — its markdown is **not** sent to the client or merged into the pitch brief; it is **logged server-side** only (`[recruiter-interests-not-in-response]`). Tune token caps in `services/recruiter-assistant-api/src/constants.ts`. Build private pack: `npm run build:interests-pack` (see `SETUP.md`). Evaluator cap rules: `services/recruiter-assistant-api/src/rag/evaluatorPrompt.ts` (`EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN`).
- **Dependencies:** Root app uses `ai` + `@ai-sdk/react`. Service uses `ai` + `@ai-sdk/openai` + AWS SDKs. Follow `.cursor/rules/dependencies/RULE.md` when changing either `package.json`.

## Security reminders

- Do not log the OpenAI key or full user prompts in production.
- Do not log interests pack contents on load failure (errors only).
- Keep `ALLOWED_ORIGIN` aligned with Function URL CORS.
- Rate limiting is in-memory per Lambda instance; reserved concurrency caps abuse (see plan).
