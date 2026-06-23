import { createDataStreamResponse } from "ai";
import { corsHeadersFor } from "../http/cors.js";
import { logStreamError } from "../http/errors.js";
import { runRecruiterAssistantPipeline } from "./pipeline/runRecruiterAssistantPipeline.js";
import {
  logRequestTrace,
  runWithTrace,
  type RequestTrace,
} from "../tracing/requestTrace.js";
import { saveChatTrace } from "../feedback/writeFeedbackToS3.js";
import {
  CLIENT_CANCEL_REASON,
  runWithCancellation,
} from "../reliability/requestCancellation.js";
import type {
  RecruiterAssistantDependencies,
  ValidRecruiterRequest,
} from "./types.js";

export function createRecruiterAssistantStreamResponse(params: {
  request: ValidRecruiterRequest;
  dependencies: RecruiterAssistantDependencies;
  trace: RequestTrace;
  cancellationController?: AbortController;
}): Response {
  const { request, dependencies, trace, cancellationController } = params;
  const cancellationSignal =
    cancellationController?.signal ?? new AbortController().signal;

  return createDataStreamResponse({
    headers: corsHeadersFor(request.origin),
    onError: (err) => {
      logStreamError("handleChatRequest.stream", err);
      return "stream_error";
    },
    execute: async (dataStream) => {
      try {
        await runWithTrace(trace, () =>
          runWithCancellation(cancellationSignal, () =>
            runRecruiterAssistantPipeline({
              request,
              openai: dependencies.openai,
              dataStream,
            })
          )
        );
        const outcome = cancellationSignal.aborted ? "cancelled" : "success";
        trace.setOutcome(outcome);
      } catch (err) {
        const isCancelled =
          cancellationSignal.aborted &&
          (err instanceof Error
            ? err.message === CLIENT_CANCEL_REASON ||
              (err as { reason?: unknown }).reason === CLIENT_CANCEL_REASON
            : false);
        trace.setOutcome(isCancelled ? "cancelled" : "error", err);
        throw err;
      } finally {
        trace.finish();
        logRequestTrace(trace);
        saveChatTrace(trace.requestId, trace.toLog());
      }
    },
  });
}
