## Scope

This RULE file governs **all project documentation**, including:

- `docs/**` (architecture, development, deployment, design principles, plans, etc.)
- When and how to update docs after code, config, or behavior changes

## Key constraints

- **Keep docs in sync:** When code, behavior, or tooling changes in a way that affects what a doc describes, update the relevant doc in the same change (or in an immediate follow-up). Documentation should reflect the current state of the project.
- **Single source of truth:** Avoid duplicating the same information in multiple docs; link to the canonical doc instead.
- **Cross-references:** Use relative paths appropriate to the doc’s location (e.g. from `docs/plans/` use `../architecture.md`).

## Common tasks

- **Update a doc after a change**
  - When you change implementation, config, scripts, or behavior that a doc describes (e.g. new npm script, different CI steps, updated architecture decision), update the corresponding doc so it stays accurate.
  - If a doc’s purpose or scope changes, update its description in `docs/README.md` (or in `docs/plans/README.md` for plans).

- **Add or reorganize documentation**
  - New top-level docs go in `docs/` and are listed in `docs/README.md`.
  - Implementation/execution plans go in `docs/plans/` and are listed in `docs/plans/README.md`; see `.cursor/rules/plans/RULE.md` for plan-specific conventions.

## Gotchas

- Do not leave docs outdated after a related code or config change; update the doc in the same PR.
- When in doubt, update the doc that is the primary source for that topic (e.g. `docs/development.md` for scripts, `docs/deployment-setup.md` for CI/secrets).
