import { createDataStreamResponse } from "ai";
import { corsHeadersFor } from "../http/cors.js";
import { logStreamError } from "../http/errors.js";
import { runRecruiterAssistantPipeline } from "./pipeline/runRecruiterAssistantPipeline.js";
import { writeRequestTraceAnnotation } from "./stream/requestTraceAnnotation.js";
import {
  logRequestTrace,
  runWithTrace,
  type RequestTrace,
} from "../tracing/requestTrace.js";
import { saveChatTrace } from "../feedback/writeFeedbackToS3.js";
import type {
  RecruiterAssistantDependencies,
  ValidRecruiterRequest,
} from "./types.js";

export function createRecruiterAssistantStreamResponse(params: {
  request: ValidRecruiterRequest;
  dependencies: RecruiterAssistantDependencies;
  trace: RequestTrace;
}): Response {
  const { request, dependencies, trace } = params;

  return createDataStreamResponse({
    headers: corsHeadersFor(request.origin),
    onError: (err) => {
      logStreamError("handleChatRequest.stream", err);
      return "stream_error";
    },
    execute: async (dataStream) => {
      writeRequestTraceAnnotation(dataStream, trace.requestId);
      try {
        await runWithTrace(trace, () =>
          runRecruiterAssistantPipeline({
            request,
            openai: dependencies.openai,
            dataStream,
          })
        );
        trace.setOutcome("success");
      } catch (err) {
        trace.setOutcome("error", err);
        throw err;
      } finally {
        trace.finish();
        logRequestTrace(trace);
        saveChatTrace(trace.requestId, trace.toLog());
      }
    },
  });
}
