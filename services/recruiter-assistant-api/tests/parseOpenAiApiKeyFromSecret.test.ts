import { describe, expect, it } from "vitest";
import { parseOpenAiApiKeyFromSecret } from "../src/secrets/parseOpenAiApiKeyFromSecret.js";

describe("parseOpenAiApiKeyFromSecret", () => {
  it("returns a plain string secret unchanged", () => {
    expect(parseOpenAiApiKeyFromSecret("  sk-test-plain  ")).toBe(
      "sk-test-plain"
    );
  });

  it("extracts OPENAI_API_KEY from JSON object secrets", () => {
    expect(
      parseOpenAiApiKeyFromSecret(
        JSON.stringify({ OPENAI_API_KEY: "sk-from-json" })
      )
    ).toBe("sk-from-json");
  });

  it("extracts openai_api_key from alternate JSON field names", () => {
    expect(
      parseOpenAiApiKeyFromSecret(
        JSON.stringify({ openai_api_key: "sk-snake-case" })
      )
    ).toBe("sk-snake-case");
  });

  it("throws when JSON object has no known key field", () => {
    expect(() =>
      parseOpenAiApiKeyFromSecret(JSON.stringify({ unrelated: "value" }))
    ).toThrow(/OPENAI_API_KEY/);
  });
});
