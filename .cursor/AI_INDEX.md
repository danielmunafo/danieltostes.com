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

### Skills

Invoke by name (e.g. “use the recruiter-assistant skill”).

| Skill | When |
|-------|------|
| `recruiter-assistant` | Chat UI, Lambda RAG, embeddings, terms, recruiter CI |
| `portfolio-career-reviewer` | Jobs/experience `.md` or portfolio copy |

Paths: `.cursor/skills/<name>/SKILL.md`
