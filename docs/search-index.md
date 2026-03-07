# Search index

The site search loads `public/search-index.json`, which is **generated at build time** by `scripts/build-search-index.mjs`. The index is keyed by locale and contains one entry per searchable block (section summary or item). Each entry has `sectionId`, `scrollTargetId`, `title`, `text` (concatenated searchable content), and `itemIndex`.

When creating or updating **sections** or **locale content**, ensure they comply with the following so search stays correct and complete.

## How the index is built

1. **Message-driven entries** — For each locale, the script reads `src/messages/<locale>.json` and, using a fixed **SECTION_SPEC**, walks dot-separated paths (e.g. `Summary.hero`, `Experience.roles`) and turns each block into one or more index entries.
2. **Impact detail from markdown** — For the Impact section, the script also reads `public/content/impact/<i>/<locale>.md` (for known indices, currently `0`, `1`, `2`) and adds one entry per file, using the title from `Summary.impact[i]` in messages.

Scroll target IDs follow: `section-<sectionId>-item-<itemIndex>` (e.g. `section-experience-item-2`). Section components must use the same IDs for scroll-into-view to work.

## Section types in SECTION_SPEC

The spec in `scripts/build-search-index.mjs` defines how each section is indexed:

| Type             | Meaning                                                            | Message path example            | Title key            | Notes                                                                                                                 |
| ---------------- | ------------------------------------------------------------------ | ------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **single**       | One block per section; path points to a single object              | `Summary.hero`                  | `title`              | One entry, `itemIndex` 0.                                                                                             |
| **array**        | One entry per array element; path points to an array               | `Experience.roles`, `Me.blocks` | `title` or `company` | Order in JSON = order in index; scroll ID = `section-<id>-item-<i>`. Impact is indexed only via markdown (see below). |
| **objectBlocks** | Object whose “block” keys (suffix e.g. `Block`) are each one entry | `Education`                     | `title`              | Uses `blockOrder` array if present, else keys ending with `blockKeySuffix` (e.g. `Block`), sorted.                    |

When **adding or changing a section** that should be searchable:

- Ensure the **message structure** matches one of these types and the **path** in the script’s SECTION_SPEC points to the right key (e.g. a new array at `Summary.impact` or a new top-level key).
- If you introduce a new **section id**, add a corresponding entry to **SECTION_SPEC** in `scripts/build-search-index.mjs` (sectionId, path, titleKey, type, and if needed blockKeySuffix / blockOrder).
- Ensure the **scroll target IDs** in the section component match the convention `section-<sectionId>-item-<itemIndex>` so search results can scroll to the right place.

## Impact section (markdown only)

Impact is **not** in SECTION_SPEC; it is indexed only by `buildEntriesFromImpactMd` so each scroll target has a single index entry (no duplicate results).

- **Titles** come from `Summary.impact[i]` in messages.
- **Detail text** (full body) comes from markdown files: `public/content/impact/<i>/<locale>.md`.

Requirements:

- **All four locales** must have the same structure: when you add or edit `Summary.impact` in one locale, update all four `src/messages/<locale>.json`. When you add or edit `public/content/impact/<i>/<locale>.md`, add or edit the same path for **en**, **pt-BR**, **es**, and **it** (see `.cursor/rules/i18n/RULE.md`).
- The script currently indexes impact indices **0, 1, 2** only (hardcoded in `build-search-index.mjs`). Adding a new impact item (e.g. index 3) requires:
  - Adding an entry to `Summary.impact` in all locale message files.
  - Adding `public/content/impact/3/<locale>.md` for each locale.
  - Updating the script’s list of impact indices (e.g. `impactIndices`) so the new folder is included in the index.

## Checklist for agents

When creating or updating sections or content that should appear in search:

1. **Messages** — Use the correct path and structure (single object, array, or object with block keys) so SECTION_SPEC can find the block(s). Keep `title` (or the spec’s `titleKey`) on each block so the index has a label.
2. **Scroll targets** — Use IDs `section-<sectionId>-item-<itemIndex>` in the section UI so search can scroll to the right item.
3. **New section** — Add an entry to SECTION_SPEC in `scripts/build-search-index.mjs` with the right `sectionId`, `path`, `titleKey`, and `type`.
4. **Impact** — Keep `Summary.impact` and `public/content/impact/<i>/<locale>.md` in sync across all four locales; if you add a new impact index, update the script’s impact index list.
5. **Locales** — Any new or changed message key or content file must exist (or be updated) for **all** locales: en, pt-BR, es, it.

After changes, run `npm run build` (which runs the search index script) to regenerate `public/search-index.json`. The file is gitignored and must not be committed.
