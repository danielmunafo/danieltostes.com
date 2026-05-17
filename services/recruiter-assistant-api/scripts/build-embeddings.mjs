#!/usr/bin/env node
/**
 * Builds a single embeddings JSON file from locale messages, impact markdown,
 * and professional-context markdown (semantic section chunking + soft-break slicing).
 * Run from repo root: `node services/recruiter-assistant-api/scripts/build-embeddings.mjs`
 * Requires OPENAI_API_KEY.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { buildLogicalPortfolioChunks } from "./lib/portfolioChunkBuilder.mjs";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const MESSAGES_DIR = join(REPO_ROOT, "src", "messages");
const CONTENT_DIR = join(REPO_ROOT, "public", "content", "impact");
const PROFESSIONAL_CONTEXT_DIR = join(
  REPO_ROOT,
  "public",
  "content",
  "recruiter-assistant",
  "professional-context"
);
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDINGS_JSON_PATH_KEY = "EMBEDDINGS_JSON_PATH";

/**
 * Sets EMBEDDINGS_JSON_PATH in services/recruiter-assistant-api/.env.local to the
 * newly built file (absolute path). No-op if .env.local is missing.
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

  const logicalChunks = buildLogicalPortfolioChunks({
    repoRoot: REPO_ROOT,
    messagesDir: MESSAGES_DIR,
    contentDir: CONTENT_DIR,
    professionalContextDir: PROFESSIONAL_CONTEXT_DIR,
  });

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
