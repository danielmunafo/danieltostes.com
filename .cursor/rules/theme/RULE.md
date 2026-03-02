## Scope

This RULE file governs the **theme and design tokens**, including:

- `src/theme/**`
- Global typography, palette, spacing, radii, shadows, and breakpoints

## Key constraints

- Centralize **all design tokens** (colors, typography, spacing, radii, shadows) in the theme.
- Use theme tokens via `sx` or `styled()`; avoid hardcoded values in components.
- Support **light and dark themes** consistently across components.
- Keep the theme **tree-shakeable**: avoid importing component code into theme files.

## Common tasks

- **Adjust a design token**
  - Update the relevant token in `src/theme/**` instead of editing individual components.
  - Check that light and dark modes remain visually coherent after the change.

- **Add a new reusable variant or primitive**
  - Define reusable primitives (e.g. layout containers, card variants) using MUI `styled()` and theme tokens.
  - Keep variant names descriptive and aligned with their usage (e.g. `hero`, `highlight`, `muted`).

## Gotchas

- Do not duplicate design decisions across multiple files; change them once in the theme.
- Be careful not to introduce theme logic that assumes a browser environment at import time.
- Avoid adding rarely used fonts or heavy assets that would harm performance budgets.
