import { Buffer } from "node:buffer";

export type LambdaHttpEvent = {
  rawPath?: string;
  requestContext?: {
    http?: { method?: string; path?: string; sourceIp?: string };
  };
  headers?: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
};

export function getPath(event: LambdaHttpEvent): string {
  if (typeof event.rawPath === "string" && event.rawPath.length > 0) {
    return event.rawPath;
  }
  const httpPath = event.requestContext?.http?.path;
  if (typeof httpPath === "string" && httpPath.length > 0) return httpPath;
  return "/";
}

export function getMethod(event: LambdaHttpEvent): string {
  const fromV2 = event.requestContext?.http?.method;
  if (fromV2) return fromV2;
  const legacy = (event as { httpMethod?: string }).httpMethod;
  return legacy ?? "GET";
}

export function getClientIp(event: LambdaHttpEvent): string {
  const sourceIp = event.requestContext?.http?.sourceIp;
  if (typeof sourceIp === "string" && sourceIp.length > 0) {
    return sourceIp;
  }
  const headers = event.headers ?? {};
  const xff = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  return "unknown";
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
