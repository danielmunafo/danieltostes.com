# Recruiter assistant API

Lambda-compatible Node service for the portfolio recruiter chat (RAG + streaming).

Copy [`.env.example`](./.env.example) to `.env` and/or `.env.local`, fill in values. Local scripts load those files automatically. Generate the corpus index with `npm run build:llamaindex-index` (see [.env.example](./.env.example)). See [SETUP.md](./SETUP.md) §10.

| Script                           | Purpose                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                    | Build index if missing, esbuild watch + HTTP on :3001                 |
| `npm run build:llamaindex-index` | Generate `embeddings/llamaindex.v<sha>.json` (needs `OPENAI_API_KEY`) |
| `npm run ops:cloudwatch`         | Render dashboard body + alarm CLI JSON (see docs below)               |
| `npm test`                       | Vitest unit tests                                                     |

Prompt versions for each AI stage are tracked in [docs/prompt-registry.md](./docs/prompt-registry.md).

CloudWatch dashboard, alarm, and runbook steps are in
[docs/cloudwatch-operations.md](./docs/cloudwatch-operations.md).
