export const REQUEST_TRACE_ANNOTATION_TYPE = "recruiter_request_trace" as const;

export type RequestTraceAnnotation = {
  readonly type: typeof REQUEST_TRACE_ANNOTATION_TYPE;
  readonly requestId: string;
};

type AnnotatedMessage = {
  readonly id: string;
  readonly annotations?: readonly unknown[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getRequestTraceIdFromAnnotations(
  annotations: readonly unknown[] | undefined
): string | null {
  if (!annotations) return null;

  for (const annotation of annotations) {
    if (!isRecord(annotation)) continue;

    const isRequestTraceAnnotation =
      annotation.type === REQUEST_TRACE_ANNOTATION_TYPE;
    if (!isRequestTraceAnnotation) continue;

    const requestId = annotation.requestId;
    if (typeof requestId !== "string") continue;

    const trimmedRequestId = requestId.trim();
    if (trimmedRequestId.length > 0) {
      return trimmedRequestId;
    }
  }

  return null;
}

export function getFeedbackRequestIdForMessage(
  message: AnnotatedMessage
): string {
  return getRequestTraceIdFromAnnotations(message.annotations) ?? message.id;
}
