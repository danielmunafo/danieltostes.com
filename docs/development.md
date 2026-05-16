# Development

Local workflow, scripts, and quality checks. For CI/CD and deployment, see [deployment-setup.md](./deployment-setup.md).

---

## When starting a change

Single flow for humans and agents (north star):

1. **Read [AGENTS.md](../AGENTS.md)** — stack, code style, CSS, and AI usage.
2. **Find the relevant RULE** in [.cursor/AI_INDEX.md](../.cursor/AI_INDEX.md) — app, components, theme, i18n, testing, dependencies, etc.
3. **Make your change** — follow the RULE’s constraints and examples.
4. **Run checks** — pre-commit (format + lint on staged files) and pre-push (format check, lint, unit tests). Fix any failures before pushing.
5. **Do the pre-completion review** — re-read AGENTS.md and the rules you touched; ensure no violations. See [.cursor/rules/code-review.mdc](../.cursor/rules/code-review.mdc).

---

## Setup and run

```bash
npm install
npm run dev      # Local dev with hot reload (http://localhost:3000)
npm run build    # Production static export → out/
npm start        # Serves out/ locally (preview production build)
```

**Recruiter assistant API (optional):** in a second terminal, build and run the local Lambda-compatible server from `services/recruiter-assistant-api` (`npm run dev` → port **3001**), set `NEXT_PUBLIC_RECRUITER_API_URL=http://127.0.0.1:3001` for the Next app, and follow [services/recruiter-assistant-api/SETUP.md](../services/recruiter-assistant-api/SETUP.md) for env vars (`OPENAI_API_KEY`, `EMBEDDINGS_JSON_PATH`, `ALLOWED_ORIGIN`).

For **CORS**, `ALLOWED_ORIGIN` in the API must list the **exact** `Origin` the browser sends (comma-separated). Next is usually `http://localhost:3000`, but if you open the site at `http://127.0.0.1:3000` that origin is different—include **both** in local `ALLOWED_ORIGIN` unless you always use one URL. In production, list every real `https://…` origin (and `www` vs apex if both exist).

## Mermaid diagrams (impact and other `public/content`)

`npm run dev` does **not** run the Mermaid step. Diagrams in markdown live as fenced **mermaid** code blocks (triple backticks + `mermaid`); the site UI expects them to be **pre-rendered** to SVG and referenced as `![...](/content/diagrams/...)` (see `scripts/render-mermaid.mjs`).

**Local workflow**

1. From the repo root (after `npm install`):  
   `npm run render-mermaid`  
   This uses **Puppeteer** (pulled in via `@mermaid-js/mermaid-cli`) to render every Mermaid block under `public/content/**/*.md`, writes SVGs under `public/content/diagrams/`, and **rewrites those `.md` files** to image references.
2. Start the app: `npm run dev` (or run both in one go: `npm run dev:with-diagrams`).
3. When you are done iterating and want the source back to fenced Mermaid (as in git), restore the markdown:  
   `git restore public/content/`

The production `npm run build` runs `render-mermaid` before `next build`, then restores `public/content/` so the repo keeps Mermaid in markdown while `out/` contains the rendered assets.

**Scope:** only `public/content/**.md` is scanned. Mermaid in `docs/` (for example `docs/plans/recruiter-assistant-plan.md`) is **not** processed by this script; use your editor’s Mermaid preview, GitHub’s renderer, or export manually with `@mermaid-js/mermaid-cli` if you need those as images.

**If Puppeteer fails to launch (missing Chromium):** install a browser for Puppeteer, for example:

```bash
npx puppeteer browsers install chrome
```

Then re-run `npm run render-mermaid`. On constrained CI sandboxes, the script already passes `--no-sandbox` to `puppeteer.launch`.

## Scripts

| Script                             | Purpose                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                      | Next.js dev server with hot reload                                                     |
| `npm run dev:with-diagrams`        | Renders Mermaid under `public/content/`, then starts the dev server (see above)        |
| `npm run render-mermaid`           | Renders Mermaid in `public/content/**/*.md` → SVGs + image refs in those files         |
| `npm run build`                    | Renders Mermaid diagrams, runs Next.js static export; restores `public/content/` after |
| `npm run start`                    | Serves the `out/` directory (preview production)                                       |
| `npm run lint`                     | ESLint                                                                                 |
| `npm run format`                   | Prettier (write)                                                                       |
| `npm run format:check`             | Prettier (check only)                                                                  |
| `npm run test`                     | Vitest unit tests                                                                      |
| `npm run test:watch`               | Vitest watch mode                                                                      |
| `npm run test:e2e`                 | Build, serve `out/`, run Playwright smoke e2e (`--project=smoke`)                      |
| `npm run test:e2e:recruiter`       | Recruiter match e2e (auto-starts API :3001 + `serve` :3000 when free)                  |
| `npm run test:e2e:recruiter:stack` | Build site with local API URL, then recruiter e2e                                      |

## Recruiter assistant match E2E

Four scenarios (perfection, ok, bad match, complete mismatch) call the **local** API dev server and OpenAI with real job descriptions under `e2e/fixtures/job-descriptions/`. They assert UI stages and match-profile recommendation / evidence-confidence **bands** (not exact LLM wording).

**Local run (three terminals):**

1. **API corpus** — from `services/recruiter-assistant-api`: copy `.env.example` → `.env`, set `OPENAI_API_KEY`, then `npm run build:embeddings` (writes `embeddings/embeddings.v*.json` and updates `.env.local` with `EMBEDDINGS_JSON_PATH`).
2. **API server** — same directory: `ALLOWED_ORIGIN=http://localhost:3000 npm run dev` → `http://127.0.0.1:3001` (health: `GET /health`).
3. **Static site** — repo root: `NEXT_PUBLIC_RECRUITER_API_URL=http://127.0.0.1:3001 npm run build && npx serve out -p 3000`.
4. **Tests** — repo root: `npm run test:e2e:recruiter` (starts API + static site when not already running; reuses existing servers locally).

One-shot (build + stack + tests): `npm run test:e2e:recruiter:stack`.

Collapsible panels (**Evidence review**, **Role Context**) expose titles as `button`, not `heading` — E2E selectors match that.

Set `SKIP_RECRUITER_E2E=1` to skip the recruiter Playwright project. CI runs these in the [Recruiter API workflow](.github/workflows/recruiter-api.yml) (`recruiter-e2e` job), not in the Frontend smoke job.

## Git hooks

- **Pre-commit** (Husky + lint-staged): format and lint staged files.
- **Pre-push**: runs `format:check`, `lint`, and `test`. Fix any failures before pushing.

## CI/CD summary

- **Pull requests**: Lint, format check, unit tests, build, E2E tests, then deploy to **dev** for preview.
- **Main branch**: Same checks, then deploy to **production** (S3 + CloudFront invalidation), then create a semantic version tag and GitHub Release.

Environments and secrets are described in [deployment-setup.md](./deployment-setup.md). For details on the automated release process, see [release-process.md](./release-process.md).
