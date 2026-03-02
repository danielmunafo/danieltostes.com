## Scope

This RULE file governs **i18n and messages**, including:

- `src/i18n/**`
- `src/messages/*.json`

## Key constraints

- Support **4 locales**: `en`, `pt-BR`, `es`, `it`.
- Keep messages in locale-specific JSON files (e.g. `src/messages/en.json`) and load them on demand.
- Do **not** introduce runtime locale detection that breaks static export; use explicit locale paths (e.g. `/en`, `/pt-BR`).
- Prefer stable, descriptive message keys; avoid embedding whole sentences as keys.

## Common tasks

- **Add a new message key**
  - Add the key to all relevant locale files in `src/messages/*.json`.
  - Use the same key across locales; only the values differ.
  - Update components to reference the key via the i18n helper rather than hardcoded text.

- **Add a new locale**
  - Create a new `src/messages/<locale>.json` file seeded from an existing locale.
  - Wire it into the i18n configuration in `src/i18n/**` so routes and loaders know about it.
  - Ensure the new locale works with static export (pre-rendered paths, no runtime-only fallbacks).

## Gotchas

- Keep JSON files valid and sorted predictably to minimize noisy diffs.
- Avoid mixing formatting logic into message values; prefer simple strings and handle formatting in code.
- Ensure that missing keys fail loudly in development rather than silently falling back.
