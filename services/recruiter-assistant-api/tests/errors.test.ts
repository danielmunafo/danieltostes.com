import { describe, expect, it, vi } from "vitest";
import * as loggerModule from "../src/logging/logger.js";
import {
  clientErrorResponse,
  internalErrorJsonBody,
} from "../src/http/errors.js";

describe("http errors", () => {
  it("returns JSON client error and logs", async () => {
    const logWarnSpy = vi
      .spyOn(loggerModule, "logWarn")
      .mockImplementation(() => {});

    const res = clientErrorResponse(
      400,
      "invalid_json",
      "https://example.com",
      {
        scope: "test",
        err: new SyntaxError("Unexpected token"),
      }
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
    expect(logWarnSpy).toHaveBeenCalled();
  });

  it("sanitizes internal error body", () => {
    expect(JSON.parse(internalErrorJsonBody())).toEqual({ error: "internal" });
  });
});
