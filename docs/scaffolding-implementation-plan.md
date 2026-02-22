# Implementation Plan (Scaffolding PR)

This document describes the execution plan and technology choices for the initial scaffolding of the personal portfolio site. It is intended for **pull request reviewers** and aligns with the architectural decisions in [docs/architecture.md](./architecture.md) and the system view in [docs/diagrams.md](./diagrams.md).

---

## Alignment with Architecture and Diagrams

- **Architecture:** The implementation follows [docs/architecture.md](./architecture.md): static-first export, S3/CloudFront deployment target, no runtime server, Lighthouse target ≥ 80, MUI + theme tokens, i18n with per-locale loading.
- **Diagrams:** CI/CD and deployment flow match [docs/diagrams.md](./diagrams.md) (GitHub Actions → build → S3 sync → CloudFront invalidation; Route 53 → CloudFront → S3).
- Referencing these docs gives reviewers a single source of truth for _why_ choices were made, not only _what_ was built.

---

## What Was Delivered

| Area          | Deliverable                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **App shell** | Next.js 16, App Router, TypeScript, `output: 'export'`, `src/` layout                                                      |
| **Styling**   | MUI + Emotion, design tokens in `src/theme/`, CssBaseline, dark/light theme toggle                                         |
| **i18n**      | next-intl, 4 locales (en, pt-BR, es, it), one route per locale, on-demand message chunks                                   |
| **Quality**   | ESLint + Prettier, Husky + lint-staged, Vitest (unit), Playwright (e2e)                                                    |
| **DX**        | .vscode recommendations, format on save, `npm run start` serves `out/`                                                     |
| **CI**        | GitHub Actions: lint, format check, unit tests, build, e2e against static `out/`; separate Lighthouse CI job (assert ≥80). |

---

## Technology Choices (Pros and Cons)

### 1. Next.js with static export (`output: 'export'`)

| Pros                                                  | Cons                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| File-based routing and code splitting out of the box. | No runtime SSR, API routes, or server actions.                                    |
| Strong ecosystem (i18n, metadata).                    | Some features (e.g. on-demand image optimization) not available without a server. |
| Familiar to many reviewers and interviewers.          | Framework overhead vs. a minimal Vite setup.                                      |
| Fits architecture: static-first, S3 deploy.           |                                                                                   |

**Decision:** Use Next.js for structure and conventions; accept the constraint of static export for S3. See [architecture.md – Why Next.js](./architecture.md#why-next-js-static-export-over-pure-vite).

---

### 2. One route per locale (`/en`, `/pt-BR`, `/es`, `/it`)

| Pros                                                                                                                                                                                                                                                                                            | Cons                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Static and performant:** Each locale is pre-rendered at build time; no runtime locale detection.                                                                                                                                                                                              | More URLs to manage; redirect or link strategy for “default” locale (e.g. `/` → `/en`).                                        |
| **On-demand loading:** Dynamic `import(\`@/messages/${locale}.json\`)`in`getRequestConfig`makes the bundler emit one chunk per locale. Visiting`/en`only loads the English chunk; navigating to`/pt-BR` loads the Portuguese chunk when the user switches. No single bundle with all languages. | Switching language in-app is in-place (no URL change); locale routes remain the source of truth for direct access and sharing. |
| **SEO and shareability:** Each locale has a stable URL (e.g. `/pt-BR`), which is better for indexing and sharing.                                                                                                                                                                               |                                                                                                                                |
| **Aligns with static export:** No `headers()` or cookies at runtime; `setRequestLocale` + `getMessages({ locale })` keep build static.                                                                                                                                                          |                                                                                                                                |

**Decision:** Use a route per locale so the app stays static, fast, and cacheable at the edge, with language-specific URLs and on-demand message loading. This is documented in [architecture.md – i18n Strategy](./architecture.md#i18n-strategy).

---

### 3. MUI + Emotion (no Tailwind)

| Pros                                                                                | Cons                                                     |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Accessible components and theme tokens (dark/light) built-in.                       | Larger bundle if components are used without discipline. |
| `sx` and `styled()` keep styling in one system; design tokens live in `src/theme/`. | Extra dependency surface (MUI + Emotion).                |
| Fast UI iteration without building a design system from scratch.                    |                                                          |

**Decision:** MUI + theme tokens + CssBaseline; prefer `sx` for most styling and `styled()` for reusable blocks. See [architecture.md – Why MUI](./architecture.md#why-mui-over-tailwind) and [AGENTS.md – CSS / Styling](../AGENTS.md#css--styling).

---

### 4. next-intl (vs. react-i18next or custom)

| Pros                                                                                                                | Cons                                             |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Designed for Next.js App Router and static export.                                                                  | Tied to Next.js.                                 |
| `getRequestConfig` + dynamic import gives per-locale chunks.                                                        | Learning curve if team is used to react-i18next. |
| Type-safe messages and server/client usage.                                                                         |                                                  |
| `setRequestLocale` + explicit `locale` in `getMessages`/`getTranslations` avoid `headers()` and keep static export. |                                                  |

**Decision:** next-intl for App Router, static export, and clean per-locale message loading.

---

### 5. Testing: Vitest (unit) + Playwright (e2e)

| Pros                                                                         | Cons                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Vitest: fast, Vite-based, good for components and pure logic.                | Two test runners to maintain.                                      |
| Playwright: runs against the real static export (`out/` served via `serve`). | E2E needs a build + server (handled with `start-server-and-test`). |
| CI runs both; e2e validates the actual static output.                        |                                                                    |

**Decision:** Vitest for unit tests; Playwright for e2e against `out/` to match production behavior.

---

### 6. `npm start` serves `out/` (no `next start`)

With `output: 'export'`, there is no Next.js server. **Decision:** `start` script runs `serve out -p 3000` so “start” means “serve the static export.” Build once with `npm run build`, then `npm start` to preview.

---

## Order of Implementation (What Was Done)

1. **AGENTS.md** — Typo fixes, Next.js naming, CSS/Styling and coding-practice guidelines.
2. **Next.js scaffold** — App Router, TypeScript, `src/`, `output: 'export'`.
3. **ESLint + Prettier + .vscode** — Format on save, recommended extensions.
4. **Husky + lint-staged** — Pre-commit lint and format on staged files.
5. **MUI + theme** — `src/theme/`, CssBaseline, dark/light toggle, ThemeModeContext (constants and descriptive condition variables per AGENTS.md).
6. **i18n** — next-intl, `src/i18n/request.ts`, `src/messages/*.json`, `[locale]` layout and page, `generateStaticParams` (Next.js convention: called at build time only, no in-repo references) for en/pt-BR/es/it, root redirect to `/en`.
7. **Tests** — Vitest + setup, one theme unit test; Playwright + smoke e2e (home + locale links); `test:e2e` builds and serves `out/` then runs Playwright.
8. **CI** — GitHub Actions: install, lint, format check, unit tests, build, Playwright install, e2e (`test:e2e:ci`); separate job for Lighthouse CI (`lighthouserc.cjs`, assert ≥80).
9. **Docs and scripts** — README scripts; `.gitignore` for test/output dirs.

---

## How to Verify (Reviewers)

- **Lint and format:** `npm run lint`, `npm run format:check`
- **Unit tests:** `npm run test`
- **Build:** `npm run build` (produces `out/`)
- **E2E:** `npm run test:e2e` (builds, serves `out/`, runs Playwright)
- **Preview static site:** `npm run build && npm start` → http://localhost:3000 (then try `/en`, `/pt-BR`, etc.)
- **CI:** Push or open PR; workflow runs lint, format, unit, build, e2e, and Lighthouse CI (see [README – CI/CD](../README.md#cicd))

---

## References

- [docs/architecture.md](./architecture.md) — Goals, constraints, static export, Next.js vs Vite, MUI, i18n, bundle budget.
- [docs/diagrams.md](./diagrams.md) — CI/CD sequence, S3 + CloudFront + Route 53.
- [docs/lighthouse-and-performance.md](./lighthouse-and-performance.md) — How we address Lighthouse insights (cache, legacy JS, MUI tree-shaking) and what is deploy/environment.
- [AGENTS.md](../AGENTS.md) — Coding practices, CSS/styling rules, constants and condition variables.

This plan and the implementation were developed to satisfy the scaffolding requirements while staying consistent with the above architecture and diagrams.
