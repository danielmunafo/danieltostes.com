import type { RecruiterDataStream } from "../types.js";

export const REQUEST_TRACE_ANNOTATION_TYPE = "recruiter_request_trace" as const;

export type RequestTraceAnnotation = {
  readonly type: typeof REQUEST_TRACE_ANNOTATION_TYPE;
  readonly requestId: string;
};

export function createRequestTraceAnnotation(
  requestId: string
): RequestTraceAnnotation {
  return {
    type: REQUEST_TRACE_ANNOTATION_TYPE,
    requestId,
  };
}

export function writeRequestTraceAnnotation(
  dataStream: RecruiterDataStream,
  requestId: string
): void {
  dataStream.writeMessageAnnotation(createRequestTraceAnnotation(requestId));
}
