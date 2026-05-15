import { Buffer } from "node:buffer";

export type LambdaHttpEvent = {
  requestContext?: { http?: { method?: string; sourceIp?: string } };
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
};

export function getMethod(event: LambdaHttpEvent): string {
  const fromV2 = event.requestContext?.http?.method;
  if (fromV2) return fromV2;
  const legacy = (event as { httpMethod?: string }).httpMethod;
  return legacy ?? "GET";
}

export function getClientIp(event: LambdaHttpEvent): string {
  const headers = event.headers ?? {};
  const xff = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return event.requestContext?.http?.sourceIp ?? "unknown";
}

export function getRequestOrigin(event: LambdaHttpEvent): string | undefined {
  const headers = event.headers ?? {};
  return headers.origin ?? headers.Origin;
}

export function decodeLambdaHttpBody(event: LambdaHttpEvent): string {
  const body = event.body ?? "";
  if (!body) return "";
  if (event.isBase64Encoded) {
    return Buffer.from(body, "base64").toString("utf8");
  }
  return body;
}
