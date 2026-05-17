import { describe, expect, it } from "vitest";
import {
  parseRecruiterRetrieverProvider,
  readRecruiterRetrieverFallback,
} from "../src/retrieval/retrieverProvider.js";
import { parseRecruiterCorpusProvider } from "../src/retrieval/corpus/corpusProvider.js";

describe("retrieverProvider", () => {
  it("defaults to llamaindex-native", () => {
    expect(parseRecruiterRetrieverProvider(undefined)).toBe(
      "llamaindex-native"
    );
    expect(parseRecruiterRetrieverProvider("")).toBe("llamaindex-native");
  });

  it("parses explicit providers", () => {
    expect(parseRecruiterRetrieverProvider("custom")).toBe("custom");
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

describe("corpusProvider", () => {
  it("defaults to llamaindex and rejects json", () => {
    expect(parseRecruiterCorpusProvider(undefined)).toBe("llamaindex");
    expect(() => parseRecruiterCorpusProvider("json")).toThrow(
      /Only llamaindex/
    );
  });
});
