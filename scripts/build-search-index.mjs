#!/usr/bin/env node
/**
 * Build-time script: generates public/search-index.json for the site search tool.
 *
 * Reads src/messages (locale JSON) and public/content markdown for impact items and
 * optional experience role details, flattens content into searchable entries with
 * scrollTargetId for navigation.
 * flattens content into searchable entries with scrollTargetId for navigation.
 * Index structure is driven by INDEX_SPEC; new sections/keys only require a spec entry.
 * Run before next build (e.g. in the build script).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "pt-BR", "es", "it"];
const MESSAGES_DIR = "src/messages";
const CONTENT_DIR = "public/content/impact";
const OUTPUT_FILE = "public/search-index.json";

/** Get value at dot-separated path (e.g. "Summary.impact" -> messages.Summary.impact). */
function getAtPath(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split(".");
  let cur = obj;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** Recursively collect all string values from a value (objects, arrays, primitives). */
function collectStrings(val, out = []) {
  if (typeof val === "string") {
    out.push(val);
    return out;
  }
  if (Array.isArray(val)) {
    val.forEach((item) => collectStrings(item, out));
    return out;
  }
  if (val && typeof val === "object") {
    Object.values(val).forEach((v) => collectStrings(v, out));
    return out;
  }
  return out;
}

/**
 * One entry per section. Blocks are discovered from message structure:
 * - single: path points to one object → one index entry
 * - array: path points to array → one entry per element (scrollTargetId section-{id}-item-{{i}})
 * - objectBlocks: path points to object; keys ending with blockKeySuffix (e.g. "Block") are
 *   collected, sorted, and each value becomes an entry (section-{id}-item-0,1,2…).
 * Adding a new block (e.g. Education.fooBlock) requires no script change.
 */
const SECTION_SPEC = [
  {
    sectionId: "summary",
    path: "Summary.hero",
    titleKey: "title",
    type: "single",
  },
  // Impact: indexed only via buildEntriesFromImpactMd (message title + markdown body) so each scroll target has one entry.
  {
    sectionId: "experience",
    path: "Experience.roles",
    titleKey: "company",
    type: "array",
  },
  {
    sectionId: "education",
    path: "Education",
    titleKey: "title",
    type: "objectBlocks",
    blockKeySuffix: "Block",
  },
  {
    sectionId: "me",
    path: "Me.blocks",
    titleKey: "title",
    type: "array",
  },
];

function buildEntriesFromSpec(messages) {
  const entries = [];

  for (const spec of SECTION_SPEC) {
    const value = getAtPath(messages, spec.path);
    if (value === undefined) continue;

    const scrollId = (i) => `section-${spec.sectionId}-item-${i}`;
    const titleFrom = (obj) =>
      (spec.titleKey && obj?.[spec.titleKey]) || obj?.title || "";

    if (spec.type === "array" && Array.isArray(value)) {
      value.forEach((item, i) => {
        entries.push({
          sectionId: spec.sectionId,
          scrollTargetId: scrollId(i),
          title: titleFrom(item),
          text: collectStrings(item).filter(Boolean).join(" "),
          itemIndex: i,
        });
      });
      continue;
    }

    if (spec.type === "objectBlocks" && value && typeof value === "object") {
      const blockKeys =
        Array.isArray(value.blockOrder) && value.blockOrder.length > 0
          ? value.blockOrder
          : Object.keys(value)
              .filter((k) => k.endsWith(spec.blockKeySuffix))
              .sort();
      blockKeys.forEach((key, i) => {
        const block = value[key];
        if (block == null || typeof block !== "object") return;
        entries.push({
          sectionId: spec.sectionId,
          scrollTargetId: scrollId(i),
          title: titleFrom(block),
          text: collectStrings(block).filter(Boolean).join(" "),
          itemIndex: i,
        });
      });
      continue;
    }

    if (spec.type === "single" && value && typeof value === "object") {
      entries.push({
        sectionId: spec.sectionId,
        scrollTargetId: scrollId(0),
        title: titleFrom(value),
        text: collectStrings(value).filter(Boolean).join(" "),
        itemIndex: 0,
      });
    }
  }

  return entries;
}

/** Strip mermaid and code blocks from markdown for plain-text indexing. */
function stripMarkdownForSearch(md) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/```mermaid[\s\S]*?```/gi, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*]\s/gm, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function buildEntriesFromImpactMd(locale, impactItems) {
  const entries = [];
  const impactIndices = [0, 1, 2];
  for (const i of impactIndices) {
    const mdPath = join(CONTENT_DIR, String(i), `${locale}.md`);
    if (!existsSync(mdPath)) continue;
    const raw = readFileSync(mdPath, "utf8");
    const text = stripMarkdownForSearch(raw);
    if (!text) continue;
    const item = Array.isArray(impactItems) ? impactItems[i] : null;
    const title =
      item && typeof item.title === "string" ? item.title : `Impact ${i + 1}`;
    entries.push({
      sectionId: "impact",
      scrollTargetId: `section-impact-item-${i}`,
      title,
      text,
      itemIndex: i,
    });
  }
  return entries;
}

function mergeExperienceDetailMarkdown(locale, entries, messages) {
  const roles = messages?.Experience?.roles;
  if (!Array.isArray(roles)) return entries;
  return entries.map((entry) => {
    if (entry.sectionId !== "experience") return entry;
    const role = roles[entry.itemIndex];
    const bodyPath =
      typeof role?.detailBodyPath === "string"
        ? role.detailBodyPath.trim()
        : "";
    if (!bodyPath) return entry;
    const mdRelative = join(
      ...bodyPath.split("/").filter(Boolean),
      `${locale}.md`
    );
    const mdPath = join("public/content", mdRelative);
    if (!existsSync(mdPath)) return entry;
    const raw = readFileSync(mdPath, "utf8");
    const stripped = stripMarkdownForSearch(raw);
    if (!stripped) return entry;
    return { ...entry, text: `${entry.text} ${stripped}`.trim() };
  });
}

function main() {
  const indexByLocale = {};

  for (const locale of LOCALES) {
    const messagesPath = join(MESSAGES_DIR, `${locale}.json`);
    if (!existsSync(messagesPath)) {
      console.warn(
        `build-search-index: missing ${messagesPath}, skipping locale ${locale}`
      );
      continue;
    }
    const messages = JSON.parse(readFileSync(messagesPath, "utf8"));
    let entries = buildEntriesFromSpec(messages);
    entries = mergeExperienceDetailMarkdown(locale, entries, messages);
    const impactItems = messages.Summary?.impact;
    const mdEntries = buildEntriesFromImpactMd(locale, impactItems);
    indexByLocale[locale] = [...entries, ...mdEntries];
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(indexByLocale, null, 0), "utf8");
  const total = Object.values(indexByLocale).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  console.log(
    `build-search-index: wrote ${OUTPUT_FILE} (${total} entries across ${LOCALES.length} locales).`
  );
}

main();
