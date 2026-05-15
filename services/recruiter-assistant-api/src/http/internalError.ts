import { corsHeadersFor } from "./cors.js";

export const INTERNAL_ERROR_CODE = "internal" as const;

/** JSON body for unexpected server failures (no operational detail for clients). */
export function internalErrorJsonBody(): string {
  return JSON.stringify({ error: INTERNAL_ERROR_CODE });
}

export function logInternalServerError(scope: string, err: unknown): void {
  console.error(`[recruiter-api] ${scope}`, err);
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
