import { readFile } from "node:fs/promises";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
import { INTERESTS_OUTPUT_SKIP_SENTINEL } from "../constants.js";

const s3 = new S3Client({});

const interestsPackSchema = z.object({
  schemaVersion: z.literal(1),
  criteriaMarkdown: z.string().min(1),
  sourceSha256: z.string().optional(),
  generatedAt: z.string().optional(),
});

export type InterestsPack = z.infer<typeof interestsPackSchema>;

let cached: InterestsPack | null = null;
let cachedKey = "";

function parseS3Uri(uri: string): { bucket: string; key: string } | null {
  const match = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri.trim());
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

function logInterestsLoadError(message: string): void {
  console.error(`[interests-pack] ${message}`);
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

/**
 * Loads optional interests JSON from local path or S3 (see SETUP.md).
 * Returns null when unset, invalid, or on recoverable errors — assistant still works.
 */
export async function loadInterestsPack(): Promise<InterestsPack | null> {
  const localPath = process.env.INTERESTS_PACK_JSON_PATH;
  const s3Uri = process.env.INTERESTS_PACK_S3_URI;
  const bucket = process.env.INTERESTS_PACK_S3_BUCKET;
  const key = process.env.INTERESTS_PACK_S3_KEY;

  const cacheKey = `${localPath ?? ""}|${s3Uri ?? ""}|${bucket ?? ""}|${key ?? ""}`;
  const hasConfiguredSource = Boolean(
    localPath?.trim() || s3Uri?.trim() || (bucket?.trim() && key?.trim())
  );
  if (!hasConfiguredSource) {
    return null;
  }

  if (cached && cachedKey === cacheKey) {
    return cached;
  }

  let raw: string;
  try {
    if (localPath) {
      raw = await readFile(localPath, "utf8");
    } else if (s3Uri) {
      const parsed = parseS3Uri(s3Uri);
      if (!parsed) {
        logInterestsLoadError("Invalid INTERESTS_PACK_S3_URI");
        return null;
      }
      raw = await getObjectText(parsed.bucket, parsed.key);
    } else if (bucket && key) {
      raw = await getObjectText(bucket, key);
    } else {
      return null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    logInterestsLoadError(`load failed: ${msg}`);
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    logInterestsLoadError("invalid JSON");
    return null;
  }

  const parsed = interestsPackSchema.safeParse(parsedJson);
  if (!parsed.success) {
    logInterestsLoadError("schema validation failed");
    return null;
  }

  cached = parsed.data;
  cachedKey = cacheKey;
  return parsed.data;
}

/** True when interests evaluator output should be ignored (empty or `[[INTERESTS_SKIP]]`). */
export function shouldOmitInterestsOutputMarkdown(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t === INTERESTS_OUTPUT_SKIP_SENTINEL) return true;
  return false;
}

/** Test helper: reset module cache. */
export function resetInterestsPackCacheForTests(): void {
  cached = null;
  cachedKey = "";
}
