import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { logError } from "../logging/logger.js";
import type { FeedbackBody } from "./feedbackSchema.js";

const s3 = new S3Client({});

function getFeedbackBucket(): string | null {
  return process.env.FEEDBACK_S3_BUCKET?.trim() || null;
}

function getFeedbackPrefix(): string {
  const raw = process.env.FEEDBACK_S3_PREFIX?.trim() || "v2";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function safeRequestId(requestId: string): string {
  return requestId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
}

function traceKey(requestId: string): string {
  return `${getFeedbackPrefix()}traces/${safeRequestId(requestId)}.json`;
}

/** Called at chat completion (fire-and-forget). Writes the AI trace so the
 *  feedback handler can read it back when the user submits a rating. */
export function saveChatTrace(
  requestId: string,
  traceData: Record<string, unknown>
): void {
  const bucket = getFeedbackBucket();
  if (!bucket) return;
  s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: traceKey(requestId),
      Body: JSON.stringify(traceData),
      ContentType: "application/json",
    })
  ).catch((err: unknown) => {
    logError("feedback", "failed to save chat trace to S3", err, { requestId });
  });
}

/** Reads the trace written by saveChatTrace, then deletes it (consumed once). */
async function consumeTrace(
  bucket: string,
  requestId: string
): Promise<Record<string, unknown> | null> {
  const key = traceKey(requestId);
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const body = await res.Body?.transformToString();
    if (!body) return null;
    // best-effort cleanup — don't block feedback write on delete
    s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(
      () => {}
    );
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function writeFeedbackToS3(record: FeedbackBody): Promise<void> {
  const bucket = getFeedbackBucket();
  if (!bucket) {
    logError(
      "feedback",
      "FEEDBACK_S3_BUCKET not configured; feedback record dropped",
      undefined,
      { requestId: record.requestId }
    );
    return;
  }

  const aiTrace = await consumeTrace(bucket, record.requestId);

  const ts = new Date(record.timestamp);
  const yyyy = ts.getUTCFullYear();
  const mm = String(ts.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ts.getUTCDate()).padStart(2, "0");
  const epoch = ts.getTime();
  const safeId = safeRequestId(record.requestId).slice(0, 64);
  const key = `${getFeedbackPrefix()}${yyyy}${mm}${dd}_${epoch}_${safeId}.json`;

  const payload = aiTrace ? { ...record, aiTrace } : record;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
    })
  );
}
