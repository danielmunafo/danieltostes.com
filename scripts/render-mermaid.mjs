#!/usr/bin/env node
/**
 * Pre-build script: renders Mermaid diagrams from markdown content to SVG.
 *
 * Scans public/content/ for .md files containing ```mermaid fenced blocks,
 * generates SVGs into public/content/diagrams/ using a single Puppeteer
 * browser instance, and replaces the blocks with ![diagram](...) references.
 *
 * The .md modifications are build-time artifacts (not committed).
 * In CI this is safe (fresh checkout). Locally, `git restore public/content/`
 * reverts them.
 */

import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_DIR = "public/content";
const DIAGRAMS_DIR = join(CONTENT_DIR, "diagrams");
const MERMAID_BLOCK_RE = /```mermaid\n([\s\S]*?)```/g;
const DIAGRAM_IMG_RE = /!\[[^\]]*\]\(\/content\/diagrams\/[^)]+\)/;

/**
 * Derives a flat SVG filename from the relative .md path and block index.
 * e.g. "impact/0/en.md" + index 1 → "impact-0-en-1.svg"
 */
function svgFileName(relMdPath, index) {
  return (
    relMdPath.replace(/\.md$/i, "").replace(/[/\\]/g, "-") + `-${index}.svg`
  );
}

async function main() {
  const allEntries = readdirSync(CONTENT_DIR, {
    recursive: true,
    encoding: "utf8",
  });
  const mdFiles = allEntries
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(CONTENT_DIR, f));

  const fileResults = [];

  const staleDiagramRefs = [];

  for (const filePath of mdFiles) {
    const original = readFileSync(filePath, "utf8");
    const relPath = relative(CONTENT_DIR, filePath);

    if (DIAGRAM_IMG_RE.test(original) && !MERMAID_BLOCK_RE.test(original)) {
      staleDiagramRefs.push(relPath);
      MERMAID_BLOCK_RE.lastIndex = 0;
      continue;
    }
    MERMAID_BLOCK_RE.lastIndex = 0;
    let index = 0;
    const diagrams = [];

    const updated = original.replace(MERMAID_BLOCK_RE, (_match, source) => {
      const name = svgFileName(relPath, index);
      diagrams.push({ source: source.trim(), name });
      index++;
      return `![diagram](/content/diagrams/${name})`;
    });

    if (diagrams.length > 0) {
      fileResults.push({ filePath, updated, diagrams });
    }
  }

  if (staleDiagramRefs.length > 0) {
    console.error(
      "render-mermaid: markdown has pre-rendered diagram image refs but no ```mermaid blocks."
    );
    console.error(
      "Restore fenced mermaid in source (git should not commit build-time image refs):"
    );
    for (const rel of staleDiagramRefs) {
      console.error(`  - ${join(CONTENT_DIR, rel)}`);
    }
    process.exit(1);
  }

  if (fileResults.length === 0) {
    console.log("render-mermaid: no mermaid blocks found.");
    return;
  }

  const totalDiagrams = fileResults.reduce(
    (sum, f) => sum + f.diagrams.length,
    0
  );
  console.log(
    `render-mermaid: rendering ${totalDiagrams} diagrams from ${fileResults.length} files...`
  );

  mkdirSync(DIAGRAMS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox"],
  });
  try {
    for (const { diagrams } of fileResults) {
      for (const { source, name } of diagrams) {
        const { data } = await renderMermaid(browser, source, "svg");
        writeFileSync(join(DIAGRAMS_DIR, name), data);
        console.log(`  generated ${name}`);
      }
    }

    for (const { filePath, updated } of fileResults) {
      writeFileSync(filePath, updated);
      console.log(`  updated  ${relative(".", filePath)}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`render-mermaid: done (${totalDiagrams} SVGs).`);
}

main().catch((err) => {
  console.error("render-mermaid failed:", err);
  process.exit(1);
});
