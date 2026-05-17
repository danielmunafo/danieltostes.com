#!/usr/bin/env node
/**
 * Ensures local RAG artifacts exist before `npm run dev`.
 * Skips when files are already present unless FORCE_RAG_REBUILD=1.
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

function latestMatching(prefix) {
  if (!existsSync(embeddingsDir)) return null;
  const names = readdirSync(embeddingsDir)
    .filter((n) => n.startsWith(prefix) && n.endsWith(".json"))
    .sort();
  return names.length > 0 ? join(embeddingsDir, names[names.length - 1]) : null;
}

function resolveEmbeddingsPath() {
  const fromEnv = process.env.EMBEDDINGS_JSON_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return latestMatching("embeddings.v");
}

function resolveLlamaIndexPath() {
  const fromEnv = process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return latestMatching("llamaindex.v");
}

function runNpmScript(scriptName, extraEnv = {}) {
  console.log(`[ensure-rag] running npm run ${scriptName}…`);
  const result = spawnSync("npm", ["run", scriptName], {
    cwd: serviceRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNodeScript(scriptName, args = [], extraEnv = {}) {
  console.log(`[ensure-rag] running node scripts/${scriptName}…`);
  const result = spawnSync(
    process.execPath,
    [join(__dirname, scriptName), ...args],
    {
      cwd: serviceRoot,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function requireOpenAiKey(label) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error(
      `[ensure-rag] OPENAI_API_KEY is required to ${label}. Set it in .env or .env.local.`
    );
    process.exit(1);
  }
}

function main() {
  const force = process.env.FORCE_RAG_REBUILD === "1";
  let embeddingsPath = resolveEmbeddingsPath();

  if (!embeddingsPath || force) {
    requireOpenAiKey("build embeddings");
    runNpmScript("build:embeddings");
    loadServiceEnvFiles();
    embeddingsPath = resolveEmbeddingsPath();
  } else {
    console.log(`[ensure-rag] embeddings OK (${embeddingsPath})`);
  }

  const indexPath = resolveLlamaIndexPath();
  if (!indexPath || force) {
    if (embeddingsPath && existsSync(embeddingsPath)) {
      runNodeScript("build-llamaindex-index.mjs", ["--from-embeddings"], {
        EMBEDDINGS_JSON_PATH: embeddingsPath,
      });
    } else {
      requireOpenAiKey("build LlamaIndex index");
      runNpmScript("build:llamaindex-index");
    }
    loadServiceEnvFiles();
  } else {
    console.log(`[ensure-rag] LlamaIndex index OK (${indexPath})`);
  }
}

main();
