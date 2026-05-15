import { afterEach, describe, expect, it, vi } from "vitest";
import { corsHeadersFor, isOriginAllowed } from "../src/http/cors.js";

describe("isOriginAllowed", () => {
  const prevAllowedOrigin = process.env.ALLOWED_ORIGIN;
  const prevLambda = process.env.AWS_LAMBDA_FUNCTION_NAME;

  afterEach(() => {
    if (prevAllowedOrigin === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = prevAllowedOrigin;
    if (prevLambda === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    else process.env.AWS_LAMBDA_FUNCTION_NAME = prevLambda;
    vi.restoreAllMocks();
  });

  it("allows any origin in local dev when allowlist is unset", () => {
    delete process.env.ALLOWED_ORIGIN;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(isOriginAllowed("https://any.example")).toBe(true);
  });

  it("denies cross-origin requests in Lambda when allowlist is unset", () => {
    delete process.env.ALLOWED_ORIGIN;
    process.env.AWS_LAMBDA_FUNCTION_NAME = "recruiter-assistant-api";
    expect(isOriginAllowed("https://danieltostes.com")).toBe(false);
  });
});

describe("corsHeadersFor", () => {
  const prevAllowedOrigin = process.env.ALLOWED_ORIGIN;
  const prevLambda = process.env.AWS_LAMBDA_FUNCTION_NAME;

  afterEach(() => {
    if (prevAllowedOrigin === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = prevAllowedOrigin;
    if (prevLambda === undefined) delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    else process.env.AWS_LAMBDA_FUNCTION_NAME = prevLambda;
  });

  it("returns no headers on Lambda (Function URL CORS)", () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = "recruiter-assistant-api";
    process.env.ALLOWED_ORIGIN = "https://dev.example";
    expect(corsHeadersFor("https://dev.example")).toEqual({});
  });

  it("reflects allowlisted origin in local dev", () => {
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    process.env.ALLOWED_ORIGIN = "https://dev.example";
    const headers = corsHeadersFor("https://dev.example") as Record<
      string,
      string
    >;
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://dev.example");
  });
});
