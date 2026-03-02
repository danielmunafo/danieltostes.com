## Scope

This RULE file governs **creating and documenting implementation or execution plans**, including:

- Where plans live
- How to reference them from code, tests, or other docs

## Key constraints

- **Location:** All implementation plans and execution plans live under **`docs/plans/`**. Do not add new plan documents at the repo root or in generic `docs/`; place them in `docs/plans/` and list them in `docs/plans/README.md`.
- **Naming:** Use descriptive, kebab-case filenames (e.g. `scaffolding-implementation-plan.md`, `parallax-sections-plan.md`).
- **Cross-references:** When other rules or docs refer to a plan, use the path `docs/plans/<name>.md`.

## Common tasks

- **Create a new plan**
  - Add a new `.md` file under `docs/plans/` with a clear title and sections (e.g. overview, decisions, verification steps).
  - Add an entry to the table in `docs/plans/README.md`.
  - Link to architecture or other docs where relevant (use relative paths from `docs/plans/`, e.g. `../architecture.md`).

- **Reference an existing plan**
  - From rules or skills: use `docs/plans/<filename>.md`.
  - From other docs under `docs/`: use `plans/<filename>.md` or `./plans/<filename>.md` as appropriate.

## Gotchas

- Existing plans: `docs/plans/scaffolding-implementation-plan.md`, `docs/plans/parallax-sections-plan.md`. Follow their structure (sections, alignment with architecture, references) when adding new ones.
