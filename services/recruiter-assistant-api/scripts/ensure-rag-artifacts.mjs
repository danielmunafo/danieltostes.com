#!/usr/bin/env node
/**
 * Ensures local LlamaIndex corpus/index exists before `npm run dev`.
 * Skips when the file is already present unless FORCE_RAG_REBUILD=1.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const embeddingsDir = join(serviceRoot, "embeddings");

function latestLlamaIndexPath() {
  if (!existsSync(embeddingsDir)) return null;
  const names = readdirSync(embeddingsDir)
    .filter((n) => n.startsWith("llamaindex.v") && n.endsWith(".json"))
    .sort();
  return names.length > 0 ? join(embeddingsDir, names[names.length - 1]) : null;
}

function resolveLlamaIndexPath() {
  const fromEnv = process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return latestLlamaIndexPath();
}

function runNpmScript(scriptName) {
  console.log(`[ensure-rag] running npm run ${scriptName}…`);
  const result = spawnSync("npm", ["run", scriptName], {
    cwd: serviceRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const force = process.env.FORCE_RAG_REBUILD === "1";
  const indexPath = resolveLlamaIndexPath();

  if (!indexPath || force) {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      console.error(
        "[ensure-rag] OPENAI_API_KEY is required to build the LlamaIndex index. Set it in .env or .env.local."
      );
      process.exit(1);
    }
    runNpmScript("build:llamaindex-index");
    loadServiceEnvFiles();
    const built = resolveLlamaIndexPath();
    if (!built) {
      console.error(
        "[ensure-rag] build finished but no llamaindex.v*.json found"
      );
      process.exit(1);
    }
    console.log(`[ensure-rag] LlamaIndex index OK (${built})`);
  } else {
    console.log(`[ensure-rag] LlamaIndex index OK (${indexPath})`);
  }
}

main();
