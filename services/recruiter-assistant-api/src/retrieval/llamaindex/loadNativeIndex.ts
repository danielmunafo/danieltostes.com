import { readFile } from "node:fs/promises";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SimpleVectorStore } from "llamaindex";
import { logError } from "../../logging/logger.js";
import { ensureLlamaIndexSettings } from "./configureLlamaIndexSettings.js";

const s3 = new S3Client({});

let cachedStore: SimpleVectorStore | null = null;
let cachedKey = "";

function parseS3Uri(uri: string): { bucket: string; key: string } | null {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri.trim());
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

function resolveNativeIndexLocation():
  | {
      kind: "local";
      path: string;
    }
  | {
      kind: "s3";
      bucket: string;
      key: string;
    } {
  const localPath = process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim();
  if (localPath) {
    return { kind: "local", path: localPath };
  }

  const s3Uri = process.env.LLAMAINDEX_INDEX_S3_URI?.trim();
  if (s3Uri) {
    const parsed = parseS3Uri(s3Uri);
    if (!parsed) {
      throw new Error("Invalid LLAMAINDEX_INDEX_S3_URI");
    }
    return { kind: "s3", ...parsed };
  }

  const bucket = process.env.LLAMAINDEX_INDEX_S3_BUCKET?.trim();
  const key = process.env.LLAMAINDEX_INDEX_S3_KEY?.trim();
  if (bucket && key) {
    return { kind: "s3", bucket, key };
  }

  throw new Error(
    "LlamaIndex native index not configured: set LLAMAINDEX_INDEX_JSON_PATH or LLAMAINDEX_INDEX_S3_URI or LLAMAINDEX_INDEX_S3_BUCKET+LLAMAINDEX_INDEX_S3_KEY"
  );
}

async function loadNativeIndexFromS3(
  bucket: string,
  key: string
): Promise<SimpleVectorStore> {
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const etag = head.ETag ?? "";
  const cacheKey = `s3://${bucket}/${key}|${etag}`;
  if (cachedStore && cachedKey === cacheKey) {
    return cachedStore;
  }

  const out = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const body = out.Body;
  if (!body) throw new Error("Empty S3 object body for LlamaIndex index");
  const raw = await body.transformToString();
  return parseAndCacheStore(raw, cacheKey);
}

function parseAndCacheStore(raw: string, cacheKey: string): SimpleVectorStore {
  ensureLlamaIndexSettings();
  const dict = JSON.parse(raw) as Parameters<
    typeof SimpleVectorStore.fromDict
  >[0];
  const store = SimpleVectorStore.fromDict(dict);
  cachedStore = store;
  cachedKey = cacheKey;
  return store;
}

export async function loadNativeVectorStore(): Promise<SimpleVectorStore> {
  const location = resolveNativeIndexLocation();
  if (location.kind === "s3") {
    try {
      return await loadNativeIndexFromS3(location.bucket, location.key);
    } catch (err) {
      logError(
        "retrieval.llamaindex",
        "Failed to load native index from S3",
        err,
        {
          bucket: location.bucket,
          key: location.key,
        }
      );
      throw err;
    }
  }

  const cacheKey = `local:${location.path}`;
  if (cachedStore && cachedKey === cacheKey) {
    return cachedStore;
  }

  const raw = await readFile(location.path, "utf8");
  return parseAndCacheStore(raw, cacheKey);
}

export function resetNativeIndexCacheForTests(): void {
  cachedStore = null;
  cachedKey = "";
}
