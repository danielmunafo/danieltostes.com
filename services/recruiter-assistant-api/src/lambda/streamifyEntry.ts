import { Buffer } from "node:buffer";
import type { Writable } from "node:stream";
import { handleChatRequest } from "../handleChatRequest.js";
import {
  internalErrorJsonBody,
  logInternalServerError,
} from "../http/errors.js";
import { logWarn } from "../logging/logger.js";
import type { LambdaHttpEvent } from "../http/lambdaHttpEvent.js";
import { CLIENT_CANCEL_REASON } from "../reliability/requestCancellation.js";

type AwslambdaGlobal = {
  streamifyResponse: (
    fn: (
      event: unknown,
      responseStream: Writable,
      context: unknown
    ) => void | Promise<void>
  ) => unknown;
  HttpResponseStream: {
    from: (
      writable: Writable,
      metadata: Record<string, unknown>
    ) => Writable & { end: (cb?: () => void) => void };
  };
};

function getAwslambda(): AwslambdaGlobal | undefined {
  const candidate = (globalThis as unknown as { awslambda?: unknown })
    .awslambda;
  if (
    candidate &&
    typeof candidate === "object" &&
    "streamifyResponse" in candidate &&
    typeof (candidate as AwslambdaGlobal).streamifyResponse === "function" &&
    "HttpResponseStream" in candidate
  ) {
    return candidate as AwslambdaGlobal;
  }
  return undefined;
}

async function streamifyHandler(
  event: unknown,
  responseStream: Writable,
  context: unknown
): Promise<void> {
  void context;
  const awslambda = getAwslambda();
  if (!awslambda) {
    responseStream.write("awslambda global missing");
    responseStream.end();
    return;
  }

  const cancellationController = new AbortController();
  // Propagate client disconnect → pipeline abort. The responseStream 'close'
  // fires when AWS Lambda's HttpResponseStream detects the client has gone away.
  const abortOnClose = () => cancellationController.abort(CLIENT_CANCEL_REASON);
  responseStream.once("close", abortOnClose);
  responseStream.once("error", abortOnClose);

  let webResponse: Response;
  try {
    webResponse = await handleChatRequest(
      event as LambdaHttpEvent,
      cancellationController
    );
  } catch (err) {
    logInternalServerError("streamifyHandler", err);
    const out = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
    });
    out.write(internalErrorJsonBody());
    out.end();
    return;
  }

  const headersObj: Record<string, string> = {};
  webResponse.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  const out = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: webResponse.status,
    headers: headersObj,
  });

  if (!webResponse.body) {
    out.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        out.write(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
    responseStream.off("close", abortOnClose);
    responseStream.off("error", abortOnClose);
    out.end();
  }
}

const awslambdaRuntime = getAwslambda();
if (!awslambdaRuntime) {
  logWarn(
    "streamifyEntry",
    "awslambda global missing; exporting raw streamify handler (local dev only)"
  );
}
export const handler = awslambdaRuntime
  ? awslambdaRuntime.streamifyResponse(streamifyHandler)
  : streamifyHandler;
