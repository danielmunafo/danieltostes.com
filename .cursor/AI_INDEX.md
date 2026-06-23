## AI Index

Compact map for agents. Open the matching `.mdc` rule when editing that area (rules attach via file globs).

| Area | Rule |
|------|------|
| Pre-completion review | `.cursor/rules/code-review.mdc` |
| Commits | `.cursor/rules/commits.mdc` |
| App / routing | `.cursor/rules/app.mdc` |
| Components | `.cursor/rules/components.mdc` |
| Theme | `.cursor/rules/theme.mdc` |
| Hooks | `.cursor/rules/hooks.mdc` |
| i18n / messages | `.cursor/rules/i18n.mdc` |
| Recruiter assistant | `.cursor/rules/recruiter-assistant.mdc` |
| Testing | `.cursor/rules/testing.mdc` |
| Scripts | `.cursor/rules/scripts.mdc` |
| Dependencies | `.cursor/rules/dependencies.mdc` |
| Documentation | `.cursor/rules/documentation.mdc` |
| Plans | `.cursor/rules/plans.mdc` |

**Docs:** `AGENTS.md` · `docs/architecture.md` · `docs/development.md` · `docs/search-index.md`

### Where code lives

Navigate here first instead of globbing the tree.

| Path | Contains |
|------|----------|
| `src/app/` | App Router; `[locale]/` segments, `layout.tsx`, `page.tsx` — static export |
| `src/components/` | Shared MUI components; `sections/` = portfolio sections + parallax |
| `src/features/recruiter-assistant/` | Assistant chat UI (use the `recruiter-assistant` skill) |
| `src/constants/` | `sections.ts` (section ids/parallax), `site.ts` |
| `src/contexts/` | Theme / locale React contexts |
| `src/hooks/` | Scroll, parallax, search-index hooks |
| `src/i18n/` | next-intl request config + static params |
| `src/lib/` | Small client utils (location hash) |
| `src/messages/` | Locale JSON: `en`, `pt-BR`, `es`, `it` |
| `src/theme/` | MUI theme tokens |
| `services/recruiter-assistant-api/` | Node Lambda RAG API; entry `src/handler.ts` (deep map in the `recruiter-assistant` skill's `reference.md`) |
| `scripts/` | Root build/release ESM scripts (service scripts live under `services/recruiter-assistant-api/scripts/`) |
| `docs/` | Long-form docs; index in `docs/README.md` |

### Skills

`.cursor/skills/<name>/SKILL.md`. Cursor: invoke by name (e.g. “use the recruiter-assistant skill”). Other agents (Claude Code, etc.): open the `SKILL.md` at the path below when the task matches.

| Skill | When |
|-------|------|
| `recruiter-assistant` | Chat UI, Lambda RAG, embeddings, terms, recruiter CI |
| `portfolio-career-reviewer` | Jobs/experience `.md` or portfolio copy |
