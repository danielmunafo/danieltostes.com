## Scope

This RULE file governs **scripts and tooling**, including:

- `scripts/*.mjs`
- Repo-level build, export, and helper scripts (e.g. `scripts/render-mermaid.mjs`)

## Key constraints

- Scripts are **Node ESM** modules; keep them consistent with the rest of the tooling.
- Keep scripts focused and composable; avoid embedding large amounts of business logic here.
- Prefer clear CLI interfaces (arguments, flags) and predictable exit codes.
- Log in a concise, readable way; avoid noisy output in CI by default.

## Common tasks

- **Add a new script**
  - Place it under `scripts/` with a clear, descriptive name.
  - Implement it as an ESM module (`.mjs`) and follow existing patterns for argument parsing and error handling.
  - Wire it into `package.json` scripts if it is part of the developer or CI workflow.

- **Update an existing script**
  - Preserve current behavior and exit codes unless intentionally changing CI behavior.
  - Keep error messages clear and useful for debugging failing workflows.

## Gotchas

- Avoid introducing dependencies that significantly slow down `npm install` or bloat the toolchain without clear value.
- Do not assume interactive terminals in CI; scripts should run non-interactively.
- Be cautious with file system operations; prefer safe, idempotent patterns when used in CI.
