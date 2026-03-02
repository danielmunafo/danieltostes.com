# Development

Local workflow, scripts, and quality checks. For CI/CD and deployment, see [deployment-setup.md](./deployment-setup.md).

---

## When starting a change

Single flow for humans and agents (north star):

1. **Read [AGENTS.md](../AGENTS.md)** — stack, code style, CSS, and AI usage.
2. **Find the relevant RULE** in [.cursor/AI_INDEX.md](../.cursor/AI_INDEX.md) — app, components, theme, i18n, testing, dependencies, etc.
3. **Make your change** — follow the RULE’s constraints and examples.
4. **Run checks** — pre-commit (format + lint on staged files) and pre-push (format check, lint, unit tests). Fix any failures before pushing.
5. **Do the pre-completion review** — re-read AGENTS.md and the RULEs you touched; ensure no violations. See [.cursor/rules/code-review/RULE.md](../.cursor/rules/code-review/RULE.md).

---

## Setup and run

```bash
npm install
npm run dev      # Local dev with hot reload (http://localhost:3000)
npm run build    # Production static export → out/
npm start        # Serves out/ locally (preview production build)
```

## Scripts

| Script                 | Purpose                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`          | Next.js dev server with hot reload                                                     |
| `npm run build`        | Renders Mermaid diagrams, runs Next.js static export; restores `public/content/` after |
| `npm run start`        | Serves the `out/` directory (preview production)                                       |
| `npm run lint`         | ESLint                                                                                 |
| `npm run format`       | Prettier (write)                                                                       |
| `npm run format:check` | Prettier (check only)                                                                  |
| `npm run test`         | Vitest unit tests                                                                      |
| `npm run test:watch`   | Vitest watch mode                                                                      |
| `npm run test:e2e`     | Build, serve `out/`, run Playwright e2e                                                |

## Git hooks

- **Pre-commit** (Husky + lint-staged): format and lint staged files.
- **Pre-push**: runs `format:check`, `lint`, and `test`. Fix any failures before pushing.

## CI/CD summary

- **Pull requests**: Lint, format check, unit tests, build, E2E tests, then deploy to **dev** for preview.
- **Main branch**: Same checks, then deploy to **production** (S3 + CloudFront invalidation), then create a semantic version tag and GitHub Release.

Environments and secrets are described in [deployment-setup.md](./deployment-setup.md). For details on the automated release process, see [release-process.md](./release-process.md).
