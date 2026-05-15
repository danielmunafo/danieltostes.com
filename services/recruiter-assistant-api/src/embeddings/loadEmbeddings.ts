import { readFile } from "node:fs/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { EmbeddingsFile } from "../rag/retrieve.js";

let cached: EmbeddingsFile | null = null;
let cachedKey = "";

const s3 = new S3Client({});

function parseS3Uri(uri: string): { bucket: string; key: string } | null {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri.trim());
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

/**
 * Loads embeddings JSON from local path, s3:// URI, or bucket+key env (see SETUP.md).
 */
export async function loadEmbeddingsFile(): Promise<EmbeddingsFile> {
  const localPath = process.env.EMBEDDINGS_JSON_PATH;
  const s3Uri = process.env.EMBEDDINGS_S3_URI;
  const bucket = process.env.EMBEDDINGS_S3_BUCKET;
  const key = process.env.EMBEDDINGS_S3_KEY;

  const cacheKey = `${localPath ?? ""}|${s3Uri ?? ""}|${bucket ?? ""}|${key ?? ""}`;
  if (cached && cachedKey === cacheKey) return cached;

  let raw: string;
  if (localPath) {
    raw = await readFile(localPath, "utf8");
  } else if (s3Uri) {
    const parsed = parseS3Uri(s3Uri);
    if (!parsed) {
      throw new Error("Invalid EMBEDDINGS_S3_URI");
    }
    raw = await getObjectText(parsed.bucket, parsed.key);
  } else if (bucket && key) {
    raw = await getObjectText(bucket, key);
  } else {
    throw new Error(
      "Embeddings not configured: set EMBEDDINGS_JSON_PATH or EMBEDDINGS_S3_URI or EMBEDDINGS_S3_BUCKET+EMBEDDINGS_S3_KEY"
    );
  }

  const parsedJson = JSON.parse(raw) as EmbeddingsFile;
  if (!parsedJson.chunks?.length) {
    throw new Error("Embeddings file has no chunks");
  }
  cached = parsedJson;
  cachedKey = cacheKey;
  return parsedJson;
}

async function getObjectText(bucket: string, key: string): Promise<string> {
  const out = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = out.Body;
  if (!body) throw new Error("Empty S3 object body");
  return await body.transformToString();
}

/** Test helper: reset module cache. */
export function resetEmbeddingsCacheForTests(): void {
  cached = null;
  cachedKey = "";
}
