import { corsHeadersFor, isOriginAllowed } from "./http/cors.js";
import {
  clientErrorResponse,
  internalErrorResponse,
  logInternalServerError,
} from "./http/errors.js";
import {
  decodeLambdaHttpBody,
  getClientIp,
  getMethod,
  getRequestOrigin,
  type LambdaHttpEvent,
} from "./http/lambdaHttpEvent.js";
import { checkRateLimit } from "./security/rateLimit.js";
import { feedbackBodySchema } from "./feedback/feedbackSchema.js";
import { writeFeedbackToS3 } from "./feedback/writeFeedbackToS3.js";

export async function handleFeedbackRequest(
  event: LambdaHttpEvent
): Promise<Response> {
  const origin = getRequestOrigin(event);
  const method = getMethod(event);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
  }

  if (!isOriginAllowed(origin)) {
    return clientErrorResponse(403, "forbidden_origin", origin);
  }

  if (method !== "POST") {
    return clientErrorResponse(405, "method_not_allowed", origin);
  }

  const clientIp = getClientIp(event);
  if (!checkRateLimit(clientIp, Date.now())) {
    return clientErrorResponse(429, "rate_limited", origin);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(decodeLambdaHttpBody(event));
  } catch {
    return clientErrorResponse(400, "invalid_json", origin);
  }

  const parsed = feedbackBodySchema.safeParse(parsedBody);
  if (!parsed.success) {
    return clientErrorResponse(400, "invalid_body", origin);
  }

  try {
    await writeFeedbackToS3(parsed.data);
  } catch (err) {
    logInternalServerError("handleFeedbackRequest", err);
    return internalErrorResponse(origin);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...corsHeadersFor(origin),
    },
  });
}
