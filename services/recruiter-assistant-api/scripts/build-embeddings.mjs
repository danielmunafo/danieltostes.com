#!/usr/bin/env node
/**
 * Builds a single embeddings JSON file from locale messages, impact markdown,
 * and rag-evidence markdown (semantic section chunking + soft-break slicing).
 * Run from repo root: `node services/recruiter-assistant-api/scripts/build-embeddings.mjs`
 * Requires OPENAI_API_KEY.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const LOCALES = ["en", "pt-BR", "es", "it"];
const MESSAGES_DIR = join(REPO_ROOT, "src", "messages");
const CONTENT_DIR = join(REPO_ROOT, "public", "content", "impact");
const RAG_EVIDENCE_DIR = join(REPO_ROOT, "public", "content", "rag-evidence");
const CHUNK_MAX_CHARS = 900;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDINGS_JSON_PATH_KEY = "EMBEDDINGS_JSON_PATH";

/**
 * Sets EMBEDDINGS_JSON_PATH in services/recruiter-assistant-api/.env.local to the
 * newly built file (absolute path). No-op if .env.local is missing.
 * @param {string} serviceRoot
 * @param {string} absoluteEmbeddingsPath
 */
function syncEmbeddingsPathToEnvLocal(serviceRoot, absoluteEmbeddingsPath) {
  const envLocalPath = join(serviceRoot, ".env.local");
  if (!existsSync(envLocalPath)) {
    console.log(
      `Skipped ${EMBEDDINGS_JSON_PATH_KEY}: ${envLocalPath} not found`
    );
    return;
  }
  const raw = readFileSync(envLocalPath, "utf8");
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const keyLineRe = new RegExp(`^\\s*${EMBEDDINGS_JSON_PATH_KEY}=`);
  const assignment = `${EMBEDDINGS_JSON_PATH_KEY}=${absoluteEmbeddingsPath}`;
  let replaced = false;
  const next = [];
  for (const line of lines) {
    if (keyLineRe.test(line)) {
      if (!replaced) {
        next.push(assignment);
        replaced = true;
      }
      continue;
    }
    next.push(line);
  }
  if (!replaced) next.push(assignment);
  writeFileSync(envLocalPath, next.join(newline), "utf8");
  console.log(`Updated ${EMBEDDINGS_JSON_PATH_KEY} in ${envLocalPath}`);
}

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

const SECTION_SPEC = [
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

/**
 * Splits markdown on ATX headings so each chunk stays semantically scoped.
 * Code fences are stripped before heading detection.
 * @param {string} raw
 * @param {number} minLevel Minimum heading level to split on (default 2).
 * @param {number} maxLevel Maximum heading level to split on (default 3).
 */
function getMarkdownSections(raw, minLevel = 2, maxLevel = 3) {
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

function titleFromSectionFirstLine(sectionText) {
  const first = sectionText.split(/\r?\n/)[0]?.trim() ?? "";
  const m = /^#{2,3}\s+(.+)$/.exec(first);
  return m ? m[1].trim() : first.replace(/^#+\s*/, "").trim();
}

/** Prefer splitting at sentence boundaries inside a back window before maxChars. */
function sliceIntoChunksPreferSoftBreak(text, maxChars) {
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

function buildEntriesFromImpactMd(locale, impactItems) {
  const entries = [];
  const impactIndices = [0, 1, 2];
  for (const i of impactIndices) {
    const mdPath = join(CONTENT_DIR, String(i), `${locale}.md`);
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

/**
 * Derives a kebab-case category slug from a heading title.
 * Takes the portion before an em-dash or en-dash separator.
 */
function deriveCategoryFromTitle(title) {
  const beforeDash = title.split(/\s*[—-]\s*/)[0] || title;
  return beforeDash
    .toLowerCase()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-");
}

function buildEntriesFromRagEvidence(locale) {
  const mdPath = join(RAG_EVIDENCE_DIR, `${locale}.md`);
  if (!existsSync(mdPath)) return [];
  const raw = readFileSync(mdPath, "utf8");
  const sections = getMarkdownSections(raw, 2, 2);
  const entries = [];
  sections.forEach((sectionText, sidx) => {
    const stripped = stripMarkdownForSearch(sectionText);
    if (!stripped) return;
    const title =
      titleFromSectionFirstLine(sectionText) || "Portfolio AI workflow";
    entries.push({
      sectionId: "ragEvidence",
      scrollTargetId: `section-rag-evidence-${locale}`,
      subSection: sidx,
      title,
      text: stripped,
      category: deriveCategoryFromTitle(title),
    });
  });
  return entries;
}

async function embedBatch(openai, inputs) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  const logicalChunks = [];
  for (const locale of LOCALES) {
    const messagesPath = join(MESSAGES_DIR, `${locale}.json`);
    if (!existsSync(messagesPath)) {
      console.warn(`skip missing ${messagesPath}`);
      continue;
    }
    const messages = JSON.parse(readFileSync(messagesPath, "utf8"));
    const fromSpec = buildEntriesFromSpec(messages);
    const impactItems = messages.Summary?.impact;
    const fromMd = buildEntriesFromImpactMd(locale, impactItems);
    const fromRag = buildEntriesFromRagEvidence(locale);
    for (const entry of [...fromSpec, ...fromMd, ...fromRag]) {
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

  const version = createHash("sha256")
    .update(logicalChunks.map((c) => c.text).join("\0"))
    .digest("hex")
    .slice(0, 16);

  const BATCH = 64;
  const embeddings = [];
  for (let i = 0; i < logicalChunks.length; i += BATCH) {
    const batch = logicalChunks.slice(i, i + BATCH);
    const vectors = await embedBatch(
      openai,
      batch.map((b) => b.text)
    );
    batch.forEach((b, j) => {
      embeddings.push({
        id: b.id,
        text: b.text,
        metadata: b.metadata,
        embedding: vectors[j],
      });
    });
    process.stdout.write(
      `embedded ${Math.min(i + BATCH, logicalChunks.length)}/${logicalChunks.length}\n`
    );
  }

  const outDir = join(__dirname, "..", "embeddings");
  mkdirSync(outDir, { recursive: true });
  const outName = `embeddings.v${version}.json`;
  const outPath = join(outDir, outName);
  const payload = {
    model: EMBEDDING_MODEL,
    version,
    chunks: embeddings,
  };
  writeFileSync(outPath, JSON.stringify(payload), "utf8");
  console.log(`Wrote ${outPath} (${embeddings.length} vectors)`);

  const serviceRoot = join(__dirname, "..");
  syncEmbeddingsPathToEnvLocal(serviceRoot, resolve(outPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
