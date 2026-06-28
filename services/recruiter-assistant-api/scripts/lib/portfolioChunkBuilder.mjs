/**
 * Shared portfolio logical-chunk builder for the LlamaIndex corpus index build.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const LOCALES = ["en", "pt-BR", "es", "it"];
export const CHUNK_MAX_CHARS = 900;

export const EXPERIENCE_CONTEXT_KEYS = [
  "teamSize",
  "companySize",
  "sector",
  "domain",
  "compliance",
  "regime",
  "workMode",
  "location",
];

export const SECTION_SPEC = [
  {
    sectionId: "summary",
    path: "Summary.hero",
    titleKey: "title",
    type: "single",
  },
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
  { sectionId: "me", path: "Me.blocks", titleKey: "title", type: "array" },
];

export function getAtPath(obj, pathStr) {
  if (!obj || !pathStr) return undefined;
  const parts = pathStr.split(".");
  let cur = obj;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur === undefined) return undefined;
  }
  return cur;
}

export function collectStrings(val, out = []) {
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

export function formatLabeledRoleContext(context, contextLabels) {
  if (!context || typeof context !== "object") return "";
  return EXPERIENCE_CONTEXT_KEYS.map((key) => {
    const value = context[key];
    const label = contextLabels?.[key];
    if (!value || !label) return "";
    return `${label}: ${value}`;
  })
    .filter(Boolean)
    .join(" ");
}

export function experienceRoleEmbeddingText(role, contextLabels) {
  const { context, ...rest } = role;
  const body = collectStrings(rest).filter(Boolean).join(" ");
  const labeledContext = formatLabeledRoleContext(context, contextLabels);
  return [body, labeledContext].filter(Boolean).join(" ");
}

export function stripMarkdownForSearch(md) {
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

export function getMarkdownSections(raw, minLevel = 2, maxLevel = 3) {
  const noCode = raw.replace(/```[\s\S]*?```/g, "\n");
  const lines = noCode.split(/\r?\n/);
  const headingLineIndexes = [];
  const headingRe = new RegExp(`^#{${minLevel},${maxLevel}}\\s+`);
  lines.forEach((line, i) => {
    if (headingRe.test(line)) headingLineIndexes.push(i);
  });
  if (headingLineIndexes.length === 0) {
    const joined = lines.join("\n").trim();
    return joined ? [joined] : [];
  }
  const sections = [];
  if (headingLineIndexes[0] > 0) {
    sections.push(lines.slice(0, headingLineIndexes[0]).join("\n").trim());
  }
  for (let h = 0; h < headingLineIndexes.length; h++) {
    const start = headingLineIndexes[h];
    const end =
      h + 1 < headingLineIndexes.length
        ? headingLineIndexes[h + 1]
        : lines.length;
    sections.push(lines.slice(start, end).join("\n").trim());
  }
  return sections.filter(Boolean);
}

export function titleFromSectionFirstLine(sectionText) {
  const first = sectionText.split(/\r?\n/)[0]?.trim() ?? "";
  const m = /^#{2,3}\s+(.+)$/.exec(first);
  return m ? m[1].trim() : first.replace(/^#+\s*/, "").trim();
}

export function sliceIntoChunksPreferSoftBreak(text, maxChars) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxChars) return [trimmed];
  const chunks = [];
  let start = 0;
  while (start < trimmed.length) {
    const hardEnd = Math.min(start + maxChars, trimmed.length);
    if (hardEnd === trimmed.length) {
      chunks.push(trimmed.slice(start).trim());
      break;
    }
    const backWindowStart = Math.max(
      start,
      hardEnd - Math.floor(maxChars * 0.45)
    );
    let cut = hardEnd;
    const slice = trimmed.slice(backWindowStart, hardEnd);
    const lastSentence = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! ")
    );
    if (lastSentence >= 0) {
      cut = backWindowStart + lastSentence + 1;
    }
    const piece = trimmed.slice(start, cut).trim();
    if (piece) chunks.push(piece);
    let nextStart = cut + (trimmed[cut] === " " ? 1 : 0);
    if (nextStart <= start) nextStart = hardEnd;
    start = nextStart;
  }
  return chunks;
}

export function deriveCategoryFromTitle(title) {
  const beforeDash = title.split(/\s*[—\-]\s*/)[0] || title;
  return beforeDash
    .toLowerCase()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-");
}

export function buildEntriesFromSpec(messages) {
  const entries = [];
  const experienceContextLabels = messages.Experience?.contextLabels;
  for (const spec of SECTION_SPEC) {
    const value = getAtPath(messages, spec.path);
    if (value === undefined) continue;
    const scrollId = (i) => `section-${spec.sectionId}-item-${i}`;
    const titleFrom = (obj) =>
      (spec.titleKey && obj?.[spec.titleKey]) || obj?.title || "";

    if (spec.type === "array" && Array.isArray(value)) {
      value.forEach((item, i) => {
        const text =
          spec.sectionId === "experience"
            ? experienceRoleEmbeddingText(item, experienceContextLabels)
            : collectStrings(item).filter(Boolean).join(" ");
        entries.push({
          sectionId: spec.sectionId,
          scrollTargetId: scrollId(i),
          title: titleFrom(item),
          text,
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
      });
    }
  }
  return entries;
}

export function buildEntriesFromImpactMd(locale, impactItems, contentDir) {
  const entries = [];
  const impactIndices = [0, 1, 2];
  for (const i of impactIndices) {
    const mdPath = join(contentDir, String(i), `${locale}.md`);
    if (!existsSync(mdPath)) continue;
    const raw = readFileSync(mdPath, "utf8");
    const sections = getMarkdownSections(raw);
    const item = Array.isArray(impactItems) ? impactItems[i] : null;
    const fallbackTitle =
      item && typeof item.title === "string" ? item.title : `Impact ${i + 1}`;
    sections.forEach((sectionText, sidx) => {
      const stripped = stripMarkdownForSearch(sectionText);
      if (!stripped) return;
      const headingTitle = titleFromSectionFirstLine(sectionText);
      const title =
        headingTitle && headingTitle.length > 0 ? headingTitle : fallbackTitle;
      entries.push({
        sectionId: "impact",
        scrollTargetId: `section-impact-item-${i}`,
        subSection: sidx,
        title,
        text: stripped,
      });
    });
  }
  return entries;
}

export function buildEntriesFromProfessionalContext(
  locale,
  professionalContextDir
) {
  const mdPath = join(professionalContextDir, `${locale}.md`);
  if (!existsSync(mdPath)) return [];
  const raw = readFileSync(mdPath, "utf8");
  const sections = getMarkdownSections(raw, 2, 2);
  const entries = [];
  let itemIndex = 0;
  for (const sectionText of sections) {
    const firstLine = sectionText.split(/\r?\n/)[0]?.trim() ?? "";
    const isThematicH2 = /^##\s/.test(firstLine);
    if (!isThematicH2) continue;
    const stripped = stripMarkdownForSearch(sectionText);
    if (!stripped) continue;
    const title =
      titleFromSectionFirstLine(sectionText) || "Professional context";
    entries.push({
      sectionId: "professionalContext",
      scrollTargetId: `section-professional-context-item-${itemIndex}`,
      subSection: itemIndex,
      title,
      text: stripped,
      category: deriveCategoryFromTitle(title),
    });
    itemIndex += 1;
  }
  return entries;
}

/**
 * @param {object} params
 * @param {string} params.messagesDir
 * @param {string} params.contentDir
 * @param {string} params.professionalContextDir
 */
export function buildLogicalPortfolioChunks({
  messagesDir,
  contentDir,
  professionalContextDir,
}) {
  const logicalChunks = [];
  for (const locale of LOCALES) {
    const messagesPath = join(messagesDir, `${locale}.json`);
    if (!existsSync(messagesPath)) {
      console.warn(`skip missing ${messagesPath}`);
      continue;
    }
    const messages = JSON.parse(readFileSync(messagesPath, "utf8"));
    const fromSpec = buildEntriesFromSpec(messages);
    const impactItems = messages.Summary?.impact;
    const fromMd = buildEntriesFromImpactMd(locale, impactItems, contentDir);
    const fromProfessionalContext = buildEntriesFromProfessionalContext(
      locale,
      professionalContextDir
    );
    for (const entry of [...fromSpec, ...fromMd, ...fromProfessionalContext]) {
      const combined = `${entry.title}\n${entry.text}`.trim();
      const parts = sliceIntoChunksPreferSoftBreak(combined, CHUNK_MAX_CHARS);
      const sub = entry.subSection ?? 0;
      parts.forEach((text, partIdx) => {
        const metadata = {
          locale,
          sectionId: entry.sectionId,
          scrollTargetId: entry.scrollTargetId,
          title: entry.title,
        };
        if (entry.category) metadata.category = entry.category;
        logicalChunks.push({
          id: `${locale}-${entry.scrollTargetId}-s${sub}-p${partIdx}`,
          text,
          metadata,
        });
      });
    }
  }
  return logicalChunks;
}
