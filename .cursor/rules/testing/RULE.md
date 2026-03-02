## Scope

This RULE file governs **testing**, including:

- Unit tests with **Vitest**
- End-to-end tests with **Playwright**

## Key constraints

- Follow the testing strategy described in `docs/scaffolding-implementation-plan.md` (when present) and related docs.
- Use Vitest for unit and component-level tests; use Playwright for end-to-end flows against the built `out/` directory.
- Keep tests focused and fast; avoid brittle implementation-detail assertions.
- **Before committing or pushing**: Update and run tests so they pass; ensure linters pass (`npm run lint`, `npm run format:check`). The pre-push hook runs format check, lint, and unit tests—fix any failures before pushing.

## Common tasks

- **Add or update a unit test (Vitest)**
  - Co-locate tests near the code under test or follow the existing test folder conventions.
  - Cover core behavior and edge cases, not every branch of implementation detail.

- **Add or update an e2e test (Playwright)**
  - Target key user journeys (e.g. loading the home page, interacting with important sections).
  - Run against the static export output (`out/`) using the configured npm scripts.

## Gotchas

- Do not commit or push with failing tests or lint/format errors; the pre-push hook will block until they pass.
- Do not introduce global test state that leaks between test cases.
- Keep Playwright tests resilient to minor UI refactors by preferring role- and label-based selectors when possible.
- Be mindful of CI runtime; avoid adding slow or flaky tests without clear value.
