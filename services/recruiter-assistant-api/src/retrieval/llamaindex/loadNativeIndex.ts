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

export const LLAMAINDEX_CORPUS_ENVELOPE_FORMAT =
  "recruiter-llamaindex-corpus-v1" as const;

export type LlamaIndexVectorStoreDict = Parameters<
  typeof SimpleVectorStore.fromDict
>[0];

export type LlamaIndexIndexPayload = {
  format?: typeof LLAMAINDEX_CORPUS_ENVELOPE_FORMAT;
  model?: string;
  version?: string;
  vectorStore: LlamaIndexVectorStoreDict;
};

let cachedStore: SimpleVectorStore | null = null;
let cachedPayload: LlamaIndexIndexPayload | null = null;
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

export function parseLlamaIndexIndexJson(raw: string): LlamaIndexIndexPayload {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.vectorStore && typeof parsed.vectorStore === "object") {
    return parsed as LlamaIndexIndexPayload;
  }
  if (parsed.embeddingDict && typeof parsed.embeddingDict === "object") {
    return { vectorStore: parsed as LlamaIndexVectorStoreDict };
  }
  throw new Error("Unrecognized LlamaIndex index JSON shape");
}

function parseAndCachePayload(
  raw: string,
  cacheKey: string
): LlamaIndexIndexPayload {
  ensureLlamaIndexSettings();
  const payload = parseLlamaIndexIndexJson(raw);
  cachedPayload = payload;
  cachedStore = SimpleVectorStore.fromDict(payload.vectorStore);
  cachedKey = cacheKey;
  return payload;
}

export async function getNativeIndexCacheKey(): Promise<string> {
  const location = resolveNativeIndexLocation();
  if (location.kind === "local") {
    return `local:${location.path}`;
  }
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: location.bucket,
      Key: location.key,
    })
  );
  const etag = head.ETag ?? "";
  return `s3://${location.bucket}/${location.key}|${etag}`;
}

async function loadNativeIndexFromS3(
  bucket: string,
  key: string
): Promise<LlamaIndexIndexPayload> {
  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
  const etag = head.ETag ?? "";
  const cacheKey = `s3://${bucket}/${key}|${etag}`;
  if (cachedPayload && cachedKey === cacheKey) {
    return cachedPayload;
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
  return parseAndCachePayload(raw, cacheKey);
}

export async function loadNativeIndexPayload(): Promise<LlamaIndexIndexPayload> {
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
  if (cachedPayload && cachedKey === cacheKey) {
    return cachedPayload;
  }

  const raw = await readFile(location.path, "utf8");
  return parseAndCachePayload(raw, cacheKey);
}

export async function loadNativeVectorStore(): Promise<SimpleVectorStore> {
  if (cachedStore && cachedPayload) {
    return cachedStore;
  }
  await loadNativeIndexPayload();
  if (!cachedStore) {
    throw new Error("LlamaIndex vector store failed to initialize");
  }
  return cachedStore;
}

export function resetNativeIndexCacheForTests(): void {
  cachedStore = null;
  cachedPayload = null;
  cachedKey = "";
}
