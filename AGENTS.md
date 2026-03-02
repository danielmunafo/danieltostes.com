# Agent instructions

Personal blog/CV site. Next.js, static export (`output: 'export'`), S3 hosting. Root page only for now; content in later PRs.

## Stack

- Next.js (React), TypeScript (ESM/ESNext), MUI + Emotion
- Lint: ESLint + Prettier. Test: Playwright + Vitest. When adding or changing dependencies: remove `node_modules` and `package-lock.json`, then run `npm install` to regenerate the lockfile (see `.cursor/rules/dependencies/RULE.md`).
- DX: Git hooks (Husky + lint-staged). Pre-commit runs format + lint on staged files; pre-push runs format check, full lint, and unit tests. Ensure tests and linters pass before committing or pushing.
- i18n: 4 locales (en, pt-BR, es, it). Dark/light theme. Lighthouse ≥ 95. Deploy: GitHub → AWS (bundle small, on-demand where possible).

## Code style

- **Constants:** Named constants or const arrays; derive types from them. No hardcoded magic strings.
- **Conditions:** Use descriptive variables (e.g. `const isWindowUndefined = typeof window === "undefined"`) instead of inlining.

## CSS (MUI only; no extra styling lib)

1. **Theme-first:** Colors, typography, spacing, radii, shadows, breakpoints in `theme/` (or `src/theme/`).
2. **sx for most:** Use `sx` for ~80%; avoid one-off styled components.
3. **styled() for reuse:** Card variants, Hero, layout primitives → MUI `styled()`.
4. **Global:** `CssBaseline` + minimal `global.css` (e.g. `@font-face`, resets). Rest via theme/MUI.

## Architecture

SPA, client-side rendering, static export for S3. See `docs/architecture.md` and `docs/diagrams.md` for details.

## AI usage

- **Start here**: skim this `AGENTS.md` for stack, style, and architecture context.
- **Find area-specific rules** via `.cursor/AI_INDEX.md` (global map of code areas and RULE files).
- **Before large changes**, open the relevant `.cursor/rules/**/RULE.md` file (e.g. app, components, theme, hooks, i18n, testing, scripts) to understand local constraints.
- **Use detailed docs** in `docs/architecture.md` and `docs/diagrams.md` only when architecture-level context is needed; prefer the small RULE files to minimize navigation.

## Pre-completion code review

**Before you consider your response finished**, run a code-review step against the project’s guidelines:

1. Re-read this `AGENTS.md` and the **RULE.md for each area you changed** (see `.cursor/AI_INDEX.md`). Ensure your edits comply with constraints and gotchas.
2. If you added or changed dependencies, i18n messages, or locale-specific content, or docs/plans, follow the corresponding rule (dependencies, i18n, documentation, plans).
3. Do not leave lint or test failures; fix them or note that the user should run format check, lint, and tests (pre-push will run them).

Detail and checklist: `.cursor/rules/code-review/RULE.md`. In your final reply, state briefly that you ran the review and whether you found or fixed any violations.
