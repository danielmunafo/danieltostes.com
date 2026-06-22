import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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

function dateParts(ts: Date) {
  const yyyy = ts.getUTCFullYear();
  const mm = String(ts.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ts.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function putJson(
  bucket: string,
  key: string,
  body: unknown,
  context: { requestId: string; scope: string }
): Promise<void> {
  await s3
    .send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(body),
        ContentType: "application/json",
      })
    )
    .catch((err: unknown) => {
      logError(context.scope, `failed to write ${context.scope} to S3`, err, {
        requestId: context.requestId,
      });
    });
}

/** Called at chat completion (fire-and-forget). Writes the AI trace as a
 *  permanent object so it can be correlated with feedback by requestId. */
export function saveChatTrace(
  requestId: string,
  traceData: Record<string, unknown>
): void {
  const bucket = getFeedbackBucket();
  if (!bucket) return;
  const prefix = getFeedbackPrefix();
  const ts = new Date();
  const key = `${prefix}traces/${dateParts(ts)}_${safeRequestId(requestId)}.json`;
  void putJson(bucket, key, traceData, { requestId, scope: "chat-trace" });
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

  const ts = new Date(record.timestamp);
  const epoch = ts.getTime();
  const key = `${getFeedbackPrefix()}${dateParts(ts)}_${epoch}_${safeRequestId(record.requestId).slice(0, 64)}.json`;

  await putJson(bucket, key, record, {
    requestId: record.requestId,
    scope: "feedback",
  });
}
