# Recruiter assistant API

Streaming Lambda handler + offline embeddings build for the portfolio **recruiter chat** (see `docs/plans/recruiter-assistant-plan.md`).

Copy [`.env.example`](./.env.example) to `.env` and/or `.env.local`, fill in values. Local scripts load those files automatically. Generate RAG data with `npm run build:embeddings`, then set `EMBEDDINGS_JSON_PATH` to the printed file (see [.env.example](./.env.example)). See [SETUP.md](./SETUP.md) §10.

## Scripts

| Command                    | Purpose                                                               |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run build`            | Bundle `src/handler.ts` → `dist/index.cjs` (upload to Lambda)         |
| `npm run dev`              | Build then run `scripts/dev-server.mjs` on port **3001**              |
| `npm run build:embeddings` | Generate `embeddings/embeddings.v<sha>.json` (needs `OPENAI_API_KEY`) |
| `npm test`                 | Vitest                                                                |

## AWS

See **[SETUP.md](./SETUP.md)** for one-time resource creation and GitHub OIDC.
