import { describe, expect, it } from "vitest";
import { getClientIp } from "../src/http/lambdaHttpEvent.js";

describe("getClientIp", () => {
  it("prefers requestContext sourceIp over X-Forwarded-For", () => {
    const ip = getClientIp({
      requestContext: { http: { sourceIp: "203.0.113.10" } },
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(ip).toBe("203.0.113.10");
  });

  it("falls back to X-Forwarded-For when sourceIp is absent", () => {
    const ip = getClientIp({
      headers: { "x-forwarded-for": "198.51.100.2, 10.0.0.1" },
    });
    expect(ip).toBe("198.51.100.2");
  });
});
