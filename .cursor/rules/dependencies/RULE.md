## Scope

This RULE file governs **adding or changing npm dependencies**, including:

- `package.json` (dependencies, devDependencies)
- `package-lock.json`

## Key constraints

- When **adding or updating a dependency**, regenerate the lockfile from a clean state so the repo keeps a consistent, reproducible lockfile.
- Do not edit `package-lock.json` by hand; let `npm install` produce it.

## Workflow: adding or changing a dependency

1. Edit `package.json` (add or update the dependency version as needed).
2. **Remove** `node_modules` and **remove** `package-lock.json`.
3. Run **`npm install`** to reinstall dependencies and regenerate `package-lock.json`.
4. Commit both `package.json` and the new `package-lock.json`.

## Gotchas

- Skipping the clean reinstall can leave the lockfile out of sync with `package.json` or with other environments.
- After regenerating, run tests and lint (`npm run test`, `npm run lint`, `npm run format:check`) to catch any breakage from dependency updates.
