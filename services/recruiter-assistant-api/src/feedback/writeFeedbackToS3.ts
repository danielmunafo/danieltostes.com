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
  const yyyy = ts.getUTCFullYear();
  const mm = String(ts.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ts.getUTCDate()).padStart(2, "0");
  const epoch = ts.getTime();
  const safeId = record.requestId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const key = `${getFeedbackPrefix()}${yyyy}${mm}${dd}_${epoch}_${safeId}.json`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(record),
      ContentType: "application/json",
    })
  );
}
