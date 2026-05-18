import { createDataStreamResponse } from "ai";
import { corsHeadersFor } from "../http/cors.js";
import { logStreamError } from "../http/errors.js";
import { runRecruiterAssistantPipeline } from "./pipeline/runRecruiterAssistantPipeline.js";
import type {
  RecruiterAssistantDependencies,
  ValidRecruiterRequest,
} from "./types.js";

export function createRecruiterAssistantStreamResponse(params: {
  request: ValidRecruiterRequest;
  dependencies: RecruiterAssistantDependencies;
}): Response {
  const { request, dependencies } = params;

  return createDataStreamResponse({
    headers: corsHeadersFor(request.origin),
    onError: (err) => {
      logStreamError("handleChatRequest.stream", err);
      return "stream_error";
    },
    execute: async (dataStream) => {
      await runRecruiterAssistantPipeline({
        request,
        openai: dependencies.openai,
        dataStream,
      });
    },
  });
}
