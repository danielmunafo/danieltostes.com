import { describe, expect, it } from "vitest";
import {
  parseRecruiterRetrieverProvider,
  readRecruiterRetrieverFallback,
} from "../src/retrieval/retrieverProvider.js";

describe("retrieverProvider", () => {
  it("defaults to custom", () => {
    expect(parseRecruiterRetrieverProvider(undefined)).toBe("custom");
    expect(parseRecruiterRetrieverProvider("")).toBe("custom");
  });

  it("parses explicit providers", () => {
    expect(parseRecruiterRetrieverProvider("llamaindex-hydrated")).toBe(
      "llamaindex-hydrated"
    );
    expect(parseRecruiterRetrieverProvider("compare")).toBe("compare");
  });

  it("fallback is only custom when set", () => {
    const prev = process.env.RECRUITER_RETRIEVER_FALLBACK;
    delete process.env.RECRUITER_RETRIEVER_FALLBACK;
    expect(readRecruiterRetrieverFallback()).toBeNull();
    process.env.RECRUITER_RETRIEVER_FALLBACK = "custom";
    expect(readRecruiterRetrieverFallback()).toBe("custom");
    if (prev === undefined) delete process.env.RECRUITER_RETRIEVER_FALLBACK;
    else process.env.RECRUITER_RETRIEVER_FALLBACK = prev;
  });
});
