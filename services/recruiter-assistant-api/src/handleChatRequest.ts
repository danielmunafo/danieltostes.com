import { corsHeadersFor } from "./http/cors.js";
import {
  clientErrorResponse,
  internalErrorResponse,
  logInternalServerError,
} from "./http/errors.js";
import {
  getMethod,
  getPath,
  getRequestOrigin,
  type LambdaHttpEvent,
} from "./http/lambdaHttpEvent.js";
import { handleFeedbackRequest } from "./handleFeedbackRequest.js";
import { createRecruiterAssistantDependencies } from "./recruiterAssistant/createRecruiterAssistantDependencies.js";
import { createRecruiterAssistantStreamResponse } from "./recruiterAssistant/createRecruiterAssistantStreamResponse.js";
import { parseAndValidateRecruiterRequest } from "./recruiterAssistant/request/parseAndValidateRecruiterRequest.js";
import { runIntentGate } from "./security/intentGate.js";
import { randomUUID } from "node:crypto";
import { createRequestTrace, runWithTrace } from "./tracing/requestTrace.js";

/**
 * Core HTTP handler: returns a Web `Response` (streaming body for POST / chat).
 */
export async function handleChatRequest(
  event: LambdaHttpEvent
): Promise<Response> {
  const path = getPath(event);
  if (path === "/feedback" || path === "/feedback/") {
    return handleFeedbackRequest(event);
  }

  const method = getMethod(event);
  const origin = getRequestOrigin(event);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
  }

  const parsedRequest = await parseAndValidateRecruiterRequest(event);
  if (!parsedRequest.ok) {
    return parsedRequest.response;
  }

  try {
    const dependencies = await createRecruiterAssistantDependencies();
    const trace = createRequestTrace(randomUUID(), {
      navLocale: parsedRequest.value.navLocale,
    });
    const intent = await runWithTrace(trace, () =>
      runIntentGate(dependencies.openai, parsedRequest.value.guardedText)
    );
    if (!intent.ok) {
      return clientErrorResponse(
        400,
        intent.reason,
        parsedRequest.value.origin
      );
    }

    return createRecruiterAssistantStreamResponse({
      request: parsedRequest.value,
      dependencies,
      trace,
    });
  } catch (err) {
    logInternalServerError("handleChatRequest", err);
    return internalErrorResponse(origin);
  }
}
