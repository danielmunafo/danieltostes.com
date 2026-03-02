## Scope

This RULE defines the **pre-completion code review** step. Before you consider your response to the user’s request finished, you must run this review against the project’s guidelines and fix or acknowledge any violations.

## When to run

Run this review **after** you have made all edits and **before** you send your final reply. Treat it as a mandatory step before “done.”

## Review checklist

1. **Re-read AGENTS.md** (stack, code style, CSS, AI usage). Ensure your changes comply (constants, descriptive condition variables, MUI-only styling, theme-first, etc.).

2. **Re-read the RULE.md for each area you touched** (from `.cursor/AI_INDEX.md`): app, components, theme, hooks, i18n, testing, scripts, dependencies, documentation, plans. Confirm constraints and gotchas are satisfied.

3. **If you changed or added dependencies:** Follow `.cursor/rules/dependencies/RULE.md` (remove `node_modules` and `package-lock.json`, run `npm install`). If you only edited code, skip.

4. **If you changed messages or locale-specific content:** Follow `.cursor/rules/i18n/RULE.md` — all four locales (en, pt-BR, es, it) must be updated in the same change.

5. **If you changed docs or plans:** Follow `.cursor/rules/documentation/RULE.md` — update the doc that describes the changed behavior; keep `docs/README.md` or `docs/plans/README.md` in sync if scope changed.

6. **Lint and tests:** Remind the user to run `npm run format:check`, `npm run lint`, `npm run test` (or note that pre-push will run them). If you introduced a lint or test failure, fix it before finishing.

## Output

- If everything complies: state briefly that you ran the pre-completion review and found no violations (e.g. “Pre-completion review: checked against AGENTS.md and relevant RULEs; no violations.”).
- If you fixed something during the review: say what you fixed.
- If you left a known violation (e.g. user asked to skip tests): say what was skipped and why.

Do not skip this step. It runs as part of your response, not as a separate tool.
