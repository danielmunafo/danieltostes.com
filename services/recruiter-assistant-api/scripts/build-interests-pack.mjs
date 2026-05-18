#!/usr/bin/env node
/**
 * Builds a private interests-pack JSON from a local markdown source file.
 * Run from repo root or service dir: `node scripts/build-interests-pack.mjs`
 * Does not call OpenAI unless --enrich is implemented later.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = resolve(__dirname, "..");
const DEFAULT_SOURCE = join(SERVICE_ROOT, "private", "interests.source.md");
const OUT_DIR = join(SERVICE_ROOT, "private");

function main() {
  const sourcePath = process.env.INTERESTS_SOURCE_PATH
    ? resolve(process.cwd(), process.env.INTERESTS_SOURCE_PATH)
    : DEFAULT_SOURCE;

  if (!existsSync(sourcePath)) {
    console.error(
      `Source not found: ${sourcePath}\nCreate it or set INTERESTS_SOURCE_PATH.`
    );
    process.exit(1);
  }

  const raw = readFileSync(sourcePath, "utf8");
  const criteriaMarkdown = raw.replace(/^\uFEFF/, "").trim();
  if (!criteriaMarkdown) {
    console.error("Source file is empty.");
    process.exit(1);
  }

  const hash = createHash("sha256")
    .update(raw, "utf8")
    .digest("hex")
    .slice(0, 16);
  const sourceSha256 = createHash("sha256").update(raw, "utf8").digest("hex");
  const generatedAt = new Date().toISOString();

  const pack = {
    schemaVersion: 1,
    criteriaMarkdown,
    sourceSha256,
    generatedAt,
  };

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const outFile = join(OUT_DIR, `interests-pack.${hash}.json`);
  writeFileSync(outFile, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outFile}`);
  console.log(
    `Set INTERESTS_PACK_JSON_PATH=${outFile} (relative to service dir or absolute).`
  );
}

main();
