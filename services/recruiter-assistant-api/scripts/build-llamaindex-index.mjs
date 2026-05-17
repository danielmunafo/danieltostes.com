#!/usr/bin/env node
/**
 * Builds a persisted SimpleVectorStore JSON for the LlamaIndex native retriever.
 * Uses the same portfolio chunking as build-embeddings.mjs.
 */
import { createHash } from "node:crypto";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { SimpleVectorStore, TextNode } from "llamaindex";
import { ensureLlamaIndexSettings } from "./lib/configureLlamaIndexSettings.mjs";
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
const LLAMAINDEX_INDEX_JSON_PATH_KEY = "LLAMAINDEX_INDEX_JSON_PATH";

function syncIndexPathToEnvLocal(serviceRoot, absoluteIndexPath) {
  const envLocalPath = join(serviceRoot, ".env.local");
  if (!existsSync(envLocalPath)) {
    console.log(
      `Skipped ${LLAMAINDEX_INDEX_JSON_PATH_KEY}: ${envLocalPath} not found`
    );
    return;
  }
  const raw = readFileSync(envLocalPath, "utf8");
  const newline = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const keyLineRe = new RegExp(`^\\s*${LLAMAINDEX_INDEX_JSON_PATH_KEY}=`);
  const assignment = `${LLAMAINDEX_INDEX_JSON_PATH_KEY}=${absoluteIndexPath}`;
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
  console.log(`Updated ${LLAMAINDEX_INDEX_JSON_PATH_KEY} in ${envLocalPath}`);
}

function resolveEmbeddingsInputPath() {
  const fromFlag = process.argv.includes("--from-embeddings");
  const fromEnv = process.env.LLAMAINDEX_BUILD_FROM_EMBEDDINGS?.trim();
  if (!fromFlag && fromEnv !== "1") return null;
  const path = process.env.EMBEDDINGS_JSON_PATH?.trim();
  return path && existsSync(path) ? path : null;
}

function nodesFromEmbeddingsFile(embeddingsPath) {
  const payload = JSON.parse(readFileSync(embeddingsPath, "utf8"));
  const chunks = payload.chunks ?? [];
  return chunks.map(
    (chunk) =>
      new TextNode({
        id_: chunk.id,
        text: chunk.text,
        embedding: chunk.embedding,
        metadata: { ...(chunk.metadata ?? {}), chunkId: chunk.id },
      })
  );
}

async function embedBatch(openai, inputs) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}

async function main() {
  ensureLlamaIndexSettings(process.env.OPENAI_API_KEY);

  const embeddingsPath = resolveEmbeddingsInputPath();
  let nodes;
  let version;

  if (embeddingsPath) {
    console.log(`Hydrating LlamaIndex store from ${embeddingsPath}`);
    nodes = nodesFromEmbeddingsFile(embeddingsPath);
    const payload = JSON.parse(readFileSync(embeddingsPath, "utf8"));
    version =
      payload.version ??
      createHash("sha256").update(embeddingsPath).digest("hex").slice(0, 16);
  } else {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      console.error(
        "OPENAI_API_KEY is required (or pass --from-embeddings with EMBEDDINGS_JSON_PATH)"
      );
      process.exit(1);
    }
    const openai = new OpenAI({ apiKey });
    ensureLlamaIndexSettings(apiKey);

    const logicalChunks = buildLogicalPortfolioChunks({
      repoRoot: REPO_ROOT,
      messagesDir: MESSAGES_DIR,
      contentDir: CONTENT_DIR,
      professionalContextDir: PROFESSIONAL_CONTEXT_DIR,
    });

    version = createHash("sha256")
      .update(logicalChunks.map((c) => c.text).join("\0"))
      .digest("hex")
      .slice(0, 16);

    const BATCH = 64;
    nodes = [];
    for (let i = 0; i < logicalChunks.length; i += BATCH) {
      const batch = logicalChunks.slice(i, i + BATCH);
      const vectors = await embedBatch(
        openai,
        batch.map((b) => b.text)
      );
      batch.forEach((chunk, j) => {
        nodes.push(
          new TextNode({
            id_: chunk.id,
            text: chunk.text,
            embedding: vectors[j],
            metadata: { ...chunk.metadata, chunkId: chunk.id },
          })
        );
      });
      process.stdout.write(
        `embedded ${Math.min(i + BATCH, logicalChunks.length)}/${logicalChunks.length}\n`
      );
    }
  }

  const store = new SimpleVectorStore();
  if (nodes.length > 0) {
    await store.add(nodes);
  }

  const outDir = join(__dirname, "..", "embeddings");
  mkdirSync(outDir, { recursive: true });
  const outName = `llamaindex.v${version}.json`;
  const outPath = join(outDir, outName);
  writeFileSync(outPath, JSON.stringify(store.toDict()), "utf8");
  console.log(`Wrote ${outPath} (${nodes.length} nodes, version ${version})`);

  const serviceRoot = join(__dirname, "..");
  syncIndexPathToEnvLocal(serviceRoot, resolve(outPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
