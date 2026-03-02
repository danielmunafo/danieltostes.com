# Development

Local workflow, scripts, and quality checks. For CI/CD and deployment, see [deployment-setup.md](./deployment-setup.md).

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
- **Main branch**: Same checks, then deploy to **production** (S3 + CloudFront invalidation).

Environments and secrets are described in [deployment-setup.md](./deployment-setup.md).
