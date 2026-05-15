import { readFile } from "node:fs/promises";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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
 * S3 loads are cached per object ETag so a stable key (e.g. `embeddings.json`) can be
 * overwritten in CI without redeploying Lambda.
 */
export async function loadEmbeddingsFile(): Promise<EmbeddingsFile> {
  const localPath = process.env.EMBEDDINGS_JSON_PATH;
  const s3Uri = process.env.EMBEDDINGS_S3_URI;
  const bucket = process.env.EMBEDDINGS_S3_BUCKET;
  const key = process.env.EMBEDDINGS_S3_KEY;

  if (localPath) {
    const cacheKey = `local:${localPath}`;
    if (cached && cachedKey === cacheKey) return cached;
    const raw = await readFile(localPath, "utf8");
    return parseAndCache(raw, cacheKey);
  }

  if (s3Uri) {
    const parsed = parseS3Uri(s3Uri);
    if (!parsed) {
      throw new Error("Invalid EMBEDDINGS_S3_URI");
    }
    return loadEmbeddingsFromS3(parsed.bucket, parsed.key);
  }

  if (bucket && key) {
    return loadEmbeddingsFromS3(bucket, key);
  }

  throw new Error(
    "Embeddings not configured: set EMBEDDINGS_JSON_PATH or EMBEDDINGS_S3_URI or EMBEDDINGS_S3_BUCKET+EMBEDDINGS_S3_KEY"
  );
}

async function loadEmbeddingsFromS3(
  bucket: string,
  key: string
): Promise<EmbeddingsFile> {
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const etag = head.ETag ?? "";
  const cacheKey = `s3://${bucket}/${key}|${etag}`;
  if (cached && cachedKey === cacheKey) return cached;

  const out = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = out.Body;
  if (!body) throw new Error("Empty S3 object body");
  const raw = await body.transformToString();
  return parseAndCache(raw, cacheKey);
}

function parseAndCache(raw: string, cacheKey: string): EmbeddingsFile {
  const parsedJson = JSON.parse(raw) as EmbeddingsFile;
  if (!parsedJson.chunks?.length) {
    throw new Error("Embeddings file has no chunks");
  }
  cached = parsedJson;
  cachedKey = cacheKey;
  return parsedJson;
}

/** Test helper: reset module cache. */
export function resetEmbeddingsCacheForTests(): void {
  cached = null;
  cachedKey = "";
}
