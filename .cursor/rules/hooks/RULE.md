## Scope

This RULE file governs **React hooks**, including:

- `src/hooks/**`

## Key constraints

- Name hooks descriptively based on their behavior (e.g. `useActiveSection`) rather than implementation details.
- Avoid direct DOM or `window` access without guards (e.g. `const isWindowUndefined = typeof window === "undefined"`).
- Use memoization (`useMemo`, `useCallback`) and `useEffect` dependencies carefully to avoid unnecessary re-renders or loops.
- Prefer **pure, reusable hooks** that encapsulate behavior and can be shared across components.

## Common tasks

- **Add a new hook**
  - Place it under `src/hooks/` with a clear, behavior-oriented name.
  - Keep parameters and return values explicit and typed for good DX.
  - Ensure any side effects are isolated and well-scoped, with correct dependency arrays.

- **Update an existing hook**
  - Preserve existing public behavior (inputs/outputs) when possible to avoid breaking callers.
  - If the hook needs DOM access, guard for server/SSR or static export environments by checking `typeof window`.

## Gotchas

- Do not call hooks conditionally; follow standard React Rules of Hooks.
- Be careful with global event listeners or intervals; always clean them up in `useEffect` cleanups.
- Avoid embedding large amounts of UI logic in hooks; keep them focused on behavior and state.
