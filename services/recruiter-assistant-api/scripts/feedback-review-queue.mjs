#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import {
  buildFeedbackReviewReport,
  FEEDBACK_REVIEW_FORMATS,
  formatFeedbackReviewOutput,
  readFeedbackReviewInputs,
} from "./lib/feedback-review-queue.mjs";

const DEFAULT_FORMAT = "review-report";

const USAGE = `Usage:
  npm run feedback:review -- --input <export-dir> [--output review.json]
  npm run feedback:review -- --input <export-dir> --format eval-candidates
  npm run feedback:review -- --input <export-dir> --include-text --output local-review.json

Options:
  --input, -i        Directory containing exported feedback and trace JSON.
  --output, -o       Optional output file. Defaults to stdout.
  --format           ${FEEDBACK_REVIEW_FORMATS.join(" | ")}. Defaults to ${DEFAULT_FORMAT}.
  --include-text     Include raw questionText/responseText for local-only review.
  --help, -h         Show this help.
`;

function readOptionValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(args) {
  const options = {
    inputDirectory: null,
    outputPath: null,
    format: DEFAULT_FORMAT,
    includeText: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--input" || arg === "-i") {
      options.inputDirectory = readOptionValue(args, index, arg);
      index += 1;
    } else if (arg === "--output" || arg === "-o") {
      options.outputPath = readOptionValue(args, index, arg);
      index += 1;
    } else if (arg === "--format") {
      options.format = readOptionValue(args, index, arg);
      index += 1;
    } else if (arg === "--include-text") {
      options.includeText = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!FEEDBACK_REVIEW_FORMATS.includes(options.format)) {
    throw new Error(
      `Unsupported --format "${options.format}". Expected one of: ${FEEDBACK_REVIEW_FORMATS.join(
        ", "
      )}`
    );
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }
  if (!options.inputDirectory) {
    throw new Error("--input <export-dir> is required");
  }

  const loaded = await readFeedbackReviewInputs(options.inputDirectory);
  const report = buildFeedbackReviewReport({
    ...loaded,
    inputDirectory: options.inputDirectory,
    includeText: options.includeText,
  });
  const output = formatFeedbackReviewOutput(report, options.format);
  const json = `${JSON.stringify(output, null, 2)}\n`;

  if (options.outputPath) {
    await writeFile(options.outputPath, json);
  } else {
    process.stdout.write(json);
  }

  process.stderr.write(
    `[feedback-review] ${report.summary.negativeFeedbackRecords} negative feedback records; ${report.summary.joinedRecords} joined with traces; ${report.summary.missingTraceRecords} missing traces.\n`
  );
}

main().catch((err) => {
  process.stderr.write(`[feedback-review] ${err.message}\n\n${USAGE}`);
  process.exit(1);
});
