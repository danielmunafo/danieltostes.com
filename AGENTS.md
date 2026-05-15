# Agent instructions

Personal blog/CV site. Next.js static export (`output: 'export'`), S3 + CloudFront. SPA, client-side rendering.

## Stack

- Next.js (React), TypeScript (ESM), MUI + Emotion
- ESLint + Prettier; Vitest + Playwright
- i18n: en, pt-BR, es, it. Dark/light theme. Lighthouse ≥ 95

## Code style

- Named constants / const arrays; derive types. No magic strings.
- Descriptive condition variables (e.g. `const isWindowUndefined = typeof window === "undefined"`).

## CSS (MUI only)

1. Theme-first: tokens in `src/theme/`
2. `sx` for most styling; `styled()` for reusable primitives
3. Global: `CssBaseline` + minimal `global.css`

## AI workflow

- Map: `.cursor/AI_INDEX.md` → scoped rules in `.cursor/rules/*.mdc`
- Skills: `.cursor/skills/<name>/` — mention the skill by name in your prompt
- Before finishing: `.cursor/rules/code-review.mdc`

## Dev (summary)

Node 20 · `npm run dev` (:3000) · `npm run build` → `out/` · pre-push: format:check, lint, test · details: `docs/development.md`
