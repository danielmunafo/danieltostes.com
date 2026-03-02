## Scope

This RULE file governs **components and sections**, including:

- `src/components/**`
- Section-level components (e.g. dialogs, heroes, content sections)

## Key constraints

- **MUI only** for component primitives and styling; no additional styling libraries.
- Prefer **`sx` props** for most styling; use `styled()` only for reusable building blocks.
- Avoid magic strings for labels and copy; use i18n message keys where appropriate.
- Keep components **presentational and focused**; push cross-cutting logic into hooks.
- Maintain **accessibility**: use semantic elements, ARIA where needed, and keyboard support for interactive components.

## Common tasks

- **Add a new section component**
  - Create it under `src/components/sections/` (or the relevant subdirectory).
  - Use MUI components with `sx` for layout and spacing, and rely on theme tokens for colors and typography.
  - Surface user-visible text via the i18n/message layer instead of hardcoded strings when it should be localized.

- **Update an existing dialog or complex component**
  - Keep state management minimal and co-located; extract reusable behaviors into hooks in `src/hooks/` when the logic grows.
  - Ensure focus management and keyboard interactions work correctly.

## Gotchas

- Avoid importing heavyweight MUI modules that are not used; prefer focused imports to keep bundle size small.
- Do not reach directly into the DOM; use React refs and hooks, and guard any `window` access behind environment checks.
- Keep visual consistency by using the global theme tokens instead of ad-hoc values.
