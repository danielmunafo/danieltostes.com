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

- Start with `.cursor/AI_INDEX.md`: code map ("Where code lives") + scoped rules (`.cursor/rules/*.mdc`) + skills. In Cursor, rules auto-attach by file glob; other agents (Claude Code, etc.) open the matching rule/skill manually.
- Skills: `.cursor/skills/<name>/SKILL.md` — read the matching one when the task fits.
- Before finishing: `.cursor/rules/code-review.mdc`

## Git workflow

**Worktrees are not PR branches.** Claude Code may run inside a worktree on a branch named `claude/<slug>`. That branch is internal scaffolding — it is never the branch a PR tracks. Before any commit+push:

1. Run `gh pr list --state open` or `gh pr view <N>` to find the actual PR branch (`headRefName`).
2. All commits intended for a PR must land on that branch, not the worktree branch.
3. If commits were made to the worktree branch, cherry-pick them onto the PR branch before pushing.

**Verify commits aren't no-ops.** After `git commit`, run `git show --stat HEAD` and confirm the expected files appear. If the diff is empty or the hash matches the previous HEAD, the commit was a no-op — diagnose (staged correctly? pre-commit stash restored?) and retry before reporting success.

**Verify the push reached the PR branch.** After pushing, confirm with `gh pr view <N> --json headRefOid,commits` that the new commit SHA appears. Never declare "pushed" based on local state alone.

**One commit per logical change.** Don't bundle unrelated fixes into a single commit to work around a pre-push hook failure. Fix the root cause (e.g. add `.claude/**` to `.prettierignore` and `eslint.config.mjs` ignore list) as a separate commit, then push the intended change.

## Dev (summary)

Node 20 · `npm run dev` (:3000) · `npm run build` → `out/` · pre-push: format:check, lint, test · details: `docs/development.md`
