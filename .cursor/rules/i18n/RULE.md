## Scope

This RULE file governs **i18n and messages**, including:

- `src/i18n/**`
- `src/messages/*.json`
- Locale-specific content: `public/content/**/<locale>.md` (e.g. `public/content/impact/0/en.md`)

## Key constraints

- Support **4 locales**: `en`, `pt-BR`, `es`, `it`.
- Keep messages in locale-specific JSON files (e.g. `src/messages/en.json`) and load them on demand.
- Do **not** introduce runtime locale detection that breaks static export; use explicit locale paths (e.g. `/en`, `/pt-BR`).
- Prefer stable, descriptive message keys; avoid embedding whole sentences as keys.
- **Keep all locales in sync**: When adding or editing a key in any `src/messages/<locale>.json`, apply the same change (key + translated value) in all other locale files. When adding or editing a locale-specific content file (e.g. `public/content/.../en.md`), update or add the corresponding file for every other locale (`en`, `pt-BR`, `es`, `it`) so no locale is missing or stale.

## Common tasks

- **Add or edit a message key**
  - Add or change the key in **all four** locale files in `src/messages/*.json` (en, pt-BR, es, it). Same key everywhere; only the values differ per locale.
  - Update components to reference the key via the i18n helper rather than hardcoded text.

- **Add or edit locale-specific content (.md)**
  - When creating or changing a file under `public/content/.../<locale>.md`, create or update the same path for every other locale so all four exist and stay in sync.

- **Add a new locale**
  - Create a new `src/messages/<locale>.json` file seeded from an existing locale.
  - Wire it into the i18n configuration in `src/i18n/**` so routes and loaders know about it.
  - Ensure the new locale works with static export (pre-rendered paths, no runtime-only fallbacks).

## Gotchas

- **Never update only one locale**: If you touch `src/messages/en.json` or any `public/content/.../en.md`, you must touch the corresponding pt-BR, es, and it files in the same change.
- Keep JSON files valid and sorted predictably to minimize noisy diffs.
- Avoid mixing formatting logic into message values; prefer simple strings and handle formatting in code.
- Ensure that missing keys fail loudly in development rather than silently falling back.
