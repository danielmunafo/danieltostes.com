import { corsHeadersFor } from "./cors.js";
import {
  logError,
  logInfo,
  logWarn,
  type LogFields,
} from "../logging/logger.js";

export const INTERNAL_ERROR_CODE = "internal" as const;

export type ClientErrorLogLevel = "info" | "warn" | "error";

export type ClientErrorLogOptions = {
  scope: string;
  level?: ClientErrorLogLevel;
  err?: unknown;
  fields?: LogFields;
};

/** JSON body for unexpected server failures (no operational detail for clients). */
export function internalErrorJsonBody(): string {
  return JSON.stringify({ error: INTERNAL_ERROR_CODE });
}

export function logClientError(
  errorCode: string,
  { scope, level = "warn", err, fields }: ClientErrorLogOptions
): void {
  const payload = { scope, errorCode, ...fields };
  if (level === "error") {
    logError(scope, "request rejected", err, { errorCode, ...fields });
    return;
  }
  if (level === "info") {
    logInfo(scope, "request rejected", payload);
    return;
  }
  if (err !== undefined) {
    logWarn(scope, "request rejected", { ...payload, err });
    return;
  }
  logWarn(scope, "request rejected", payload);
}

export function logInternalServerError(scope: string, err: unknown): void {
  logError(scope, "internal error", err);
}

export function logStreamError(scope: string, err: unknown): void {
  logError(scope, "stream error", err);
}

export function clientErrorResponse(
  status: number,
  errorCode: string,
  origin: string | undefined,
  log?: ClientErrorLogOptions
): Response {
  if (log) {
    logClientError(errorCode, log);
  }
  return new Response(JSON.stringify({ error: errorCode }), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeadersFor(origin),
    },
  });
}

export function internalErrorResponse(origin: string | undefined): Response {
  return new Response(internalErrorJsonBody(), {
    status: 500,
    headers: {
      "content-type": "application/json",
      ...corsHeadersFor(origin),
    },
  });
}
