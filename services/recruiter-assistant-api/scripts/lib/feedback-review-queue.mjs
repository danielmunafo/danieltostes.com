import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

export const FEEDBACK_REVIEW_REPORT_SCHEMA_VERSION = 1;
export const FEEDBACK_REVIEW_FORMATS = ["review-report", "eval-candidates"];

const JSON_FILE_EXTENSION = ".json";
const NEGATIVE_RATING = "negative";
const TEXT_REDACTION_NOTICE =
  "Raw questionText and responseText omitted. Re-run with --include-text only for local review.";
const SOURCE_FILE_FIELD = "__feedbackReviewSourceFile";

const REASON_EVAL_TARGETS = {
  wrong_fit: [
    {
      evalPath: "evals/hard-gates/cases.json",
      useWhen:
        "The model over- or under-stated a hard requirement, recommendation clamp, or practical gate.",
    },
    {
      evalPath: "evals/e2e/cases.json",
      useWhen:
        "The final recommendation or pitch needs a full-pipeline regression case.",
    },
  ],
  off_topic: [
    {
      evalPath: "evals/e2e/cases.json",
      useWhen:
        "The intent gate or off-topic response failed on a recruiter-adjacent query.",
    },
  ],
  missing_context: [
    {
      evalPath: "evals/retrieval/cases.json",
      useWhen:
        "Relevant portfolio evidence exists but did not surface in retrieval.",
    },
    {
      evalPath: "evals/references/cases.json",
      useWhen:
        "The answer missed, mis-cited, or failed to label supporting evidence/gaps.",
    },
  ],
  too_long: [
    {
      evalPath: "evals/e2e/cases.json",
      useWhen:
        "The full answer structure, verbosity, or recruiter-facing pitch needs a regression case.",
    },
  ],
  other: [
    {
      evalPath: "evals/e2e/cases.json",
      useWhen:
        "The issue is recurring but does not isolate cleanly to retrieval, references, or hard gates.",
    },
  ],
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringField(record, fieldName) {
  const value = record[fieldName];
  return typeof value === "string" ? value : undefined;
}

function numberField(record, fieldName) {
  const value = record[fieldName];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function booleanField(record, fieldName) {
  const value = record[fieldName];
  return typeof value === "boolean" ? value : undefined;
}

function cleanObject(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  );
}

function normalizeJsonRecords(value) {
  return Array.isArray(value) ? value : [value];
}

function withSourceFile(record, sourceFile) {
  if (!isPlainObject(record)) return record;
  return { ...record, [SOURCE_FILE_FIELD]: sourceFile };
}

function sourceFileOf(record) {
  return stringField(record, SOURCE_FILE_FIELD);
}

function isFeedbackRecord(record) {
  if (!isPlainObject(record)) return false;
  const hasKnownRating =
    record.rating === "positive" || record.rating === NEGATIVE_RATING;
  const hasRequestId = typeof record.requestId === "string";
  const hasHashes =
    typeof record.questionHash === "string" &&
    typeof record.responseHash === "string";
  return hasRequestId && hasKnownRating && hasHashes;
}

function isTraceRecord(record) {
  if (!isPlainObject(record)) return false;
  const hasRequestId = typeof record.requestId === "string";
  const hasStages = Array.isArray(record.stages);
  return hasRequestId && hasStages;
}

async function listJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(absolutePath);
      if (entry.isFile() && extname(entry.name) === JSON_FILE_EXTENSION) {
        return [absolutePath];
      }
      return [];
    })
  );
  return files.flat().sort();
}

async function readJsonRecords(filePath, inputDirectory) {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const sourceFile = relative(inputDirectory, filePath);
  return normalizeJsonRecords(parsed).map((record) =>
    withSourceFile(record, sourceFile)
  );
}

export async function readFeedbackReviewInputs(inputDirectory) {
  const jsonFiles = await listJsonFiles(inputDirectory);
  const feedbackRecords = [];
  const traceRecords = [];
  let jsonObjectsRead = 0;
  let unclassifiedRecords = 0;

  for (const filePath of jsonFiles) {
    const records = await readJsonRecords(filePath, inputDirectory);
    jsonObjectsRead += records.length;
    for (const record of records) {
      if (isFeedbackRecord(record)) {
        feedbackRecords.push(record);
      } else if (isTraceRecord(record)) {
        traceRecords.push(record);
      } else {
        unclassifiedRecords += 1;
      }
    }
  }

  return {
    feedbackRecords,
    traceRecords,
    loadSummary: {
      jsonFilesRead: jsonFiles.length,
      jsonObjectsRead,
      unclassifiedRecords,
    },
  };
}

function sanitizeFeedback(record, options) {
  const feedback = cleanObject({
    requestId: stringField(record, "requestId"),
    messageId: stringField(record, "messageId"),
    sessionId: stringField(record, "sessionId"),
    timestamp: stringField(record, "timestamp"),
    locale: stringField(record, "locale"),
    rating: stringField(record, "rating"),
    reason: stringField(record, "reason"),
    comment: stringField(record, "comment"),
    schemaVersion: stringField(record, "schemaVersion"),
    sourceFile: sourceFileOf(record),
    hashes: cleanObject({
      questionHash: stringField(record, "questionHash"),
      responseHash: stringField(record, "responseHash"),
    }),
  });

  if (options.includeText) {
    feedback.text = cleanObject({
      questionText: stringField(record, "questionText"),
      responseText: stringField(record, "responseText"),
    });
  } else {
    feedback.text = {
      redacted: true,
      reason: TEXT_REDACTION_NOTICE,
    };
  }

  return feedback;
}

function sanitizeRetrieval(record) {
  if (!isPlainObject(record)) return null;
  return cleanObject({
    provider: stringField(record, "provider"),
    topK: numberField(record, "topK"),
    returnedChunks: numberField(record, "returnedChunks"),
    similarityMin:
      record.similarityMin === null
        ? null
        : numberField(record, "similarityMin"),
    similarityMax:
      record.similarityMax === null
        ? null
        : numberField(record, "similarityMax"),
    latencyMs: numberField(record, "latencyMs"),
  });
}

function sanitizeTotals(record) {
  if (!isPlainObject(record)) return undefined;
  return cleanObject({
    llmCalls: numberField(record, "llmCalls"),
    usageKnownCalls: numberField(record, "usageKnownCalls"),
    usageMissingCalls: numberField(record, "usageMissingCalls"),
    costKnownCalls: numberField(record, "costKnownCalls"),
    costMissingCalls: numberField(record, "costMissingCalls"),
    tokenUsageComplete: booleanField(record, "tokenUsageComplete"),
    costEstimateComplete: booleanField(record, "costEstimateComplete"),
    totalTokens: numberField(record, "totalTokens"),
    estimatedCostUSD:
      record.estimatedCostUSD === null
        ? null
        : numberField(record, "estimatedCostUSD"),
  });
}

function sanitizeStage(record) {
  if (!isPlainObject(record)) return null;
  return cleanObject({
    stage: stringField(record, "stage"),
    status: stringField(record, "status"),
    errorName: stringField(record, "errorName"),
    promptId: stringField(record, "promptId"),
    promptVersion: stringField(record, "promptVersion"),
    model: stringField(record, "model"),
    latencyMs: numberField(record, "latencyMs"),
  });
}

function sanitizeTrace(record) {
  if (!record) return { found: false };
  const stages = Array.isArray(record.stages)
    ? record.stages.map(sanitizeStage).filter(Boolean)
    : [];
  return cleanObject({
    found: true,
    requestId: stringField(record, "requestId"),
    timestamp:
      stringField(record, "timestamp") ??
      stringField(record, "time") ??
      stringField(record, "createdAt"),
    locale: stringField(record, "navLocale") ?? stringField(record, "locale"),
    outcome: stringField(record, "outcome"),
    errorName: stringField(record, "errorName"),
    totalLatencyMs: numberField(record, "totalLatencyMs"),
    retrieval: sanitizeRetrieval(record.retrieval),
    stages,
    totals: sanitizeTotals(record.totals),
    sourceFile: sourceFileOf(record),
  });
}

function traceByRequestId(traceRecords) {
  const indexed = new Map();
  for (const trace of traceRecords) {
    const requestId = stringField(trace, "requestId");
    if (requestId && !indexed.has(requestId)) {
      indexed.set(requestId, trace);
    }
  }
  return indexed;
}

function feedbackTimestampSort(left, right) {
  const leftTimestamp = left.feedback.timestamp ?? "";
  const rightTimestamp = right.feedback.timestamp ?? "";
  if (leftTimestamp === rightTimestamp) {
    return left.requestId.localeCompare(right.requestId);
  }
  return leftTimestamp.localeCompare(rightTimestamp);
}

export function suggestEvalTargets(feedbackRecord, traceRecord) {
  const reason = stringField(feedbackRecord, "reason") ?? "other";
  const reasonTargets =
    REASON_EVAL_TARGETS[reason] ?? REASON_EVAL_TARGETS.other;
  const targets = [...reasonTargets];
  const retrieval = isPlainObject(traceRecord?.retrieval)
    ? traceRecord.retrieval
    : null;
  const returnedChunks = retrieval
    ? numberField(retrieval, "returnedChunks")
    : undefined;
  const missingOrSparseRetrieval =
    returnedChunks !== undefined && returnedChunks < 5;

  if (missingOrSparseRetrieval) {
    targets.push({
      evalPath: "evals/retrieval/cases.json",
      useWhen:
        "Trace retrieval returned very few chunks; add or update a retrieval recall case if this recurs.",
    });
  }

  return targets;
}

export function buildFeedbackReviewReport(params) {
  const {
    feedbackRecords,
    traceRecords,
    inputDirectory = null,
    includeText = false,
    generatedAt = new Date().toISOString(),
    loadSummary = {},
  } = params;
  const traces = traceByRequestId(traceRecords);
  const negativeFeedbackRecords = feedbackRecords.filter(
    (record) => record.rating === NEGATIVE_RATING
  );
  const items = negativeFeedbackRecords
    .map((feedbackRecord) => {
      const requestId = stringField(feedbackRecord, "requestId") ?? "";
      const traceRecord = traces.get(requestId);
      return {
        requestId,
        feedback: sanitizeFeedback(feedbackRecord, { includeText }),
        trace: sanitizeTrace(traceRecord),
        suggestedEvalTargets: suggestEvalTargets(feedbackRecord, traceRecord),
      };
    })
    .sort(feedbackTimestampSort);

  const joinedRecords = items.filter((item) => item.trace.found).length;

  return {
    schemaVersion: FEEDBACK_REVIEW_REPORT_SCHEMA_VERSION,
    generatedAt,
    inputDirectory,
    privacy: {
      includesRawQuestionResponseText: includeText,
      defaultBehavior:
        "Raw questionText and responseText are omitted unless --include-text is set.",
    },
    summary: {
      jsonFilesRead: loadSummary.jsonFilesRead ?? null,
      jsonObjectsRead: loadSummary.jsonObjectsRead ?? null,
      unclassifiedRecords: loadSummary.unclassifiedRecords ?? null,
      feedbackRecords: feedbackRecords.length,
      traceRecords: traceRecords.length,
      negativeFeedbackRecords: negativeFeedbackRecords.length,
      joinedRecords,
      missingTraceRecords: items.length - joinedRecords,
    },
    items,
  };
}

function toEvalCandidate(item) {
  return {
    candidateId: `feedback-${item.requestId}`,
    requestId: item.requestId,
    feedbackTimestamp: item.feedback.timestamp,
    locale: item.feedback.locale ?? item.trace.locale,
    reason: item.feedback.reason,
    comment: item.feedback.comment,
    hashes: item.feedback.hashes,
    traceFound: item.trace.found,
    trace: item.trace,
    evalTargets: item.suggestedEvalTargets,
    localText: item.feedback.text,
  };
}

export function formatFeedbackReviewOutput(report, format = "review-report") {
  if (!FEEDBACK_REVIEW_FORMATS.includes(format)) {
    throw new Error(
      `Unsupported format "${format}". Expected one of: ${FEEDBACK_REVIEW_FORMATS.join(
        ", "
      )}`
    );
  }

  if (format === "review-report") return report;

  return {
    schemaVersion: report.schemaVersion,
    generatedAt: report.generatedAt,
    inputDirectory: report.inputDirectory,
    privacy: report.privacy,
    summary: report.summary,
    candidates: report.items.map(toEvalCandidate),
  };
}
