import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetPortfolioCorpusValidationForTests } from "../src/retrieval/corpus/loadPortfolioCorpus.js";
import { validateCorpusEnv } from "../src/retrieval/corpus/validateCorpusEnv.js";

describe("validateCorpusEnv", () => {
  const keys = [
    "LLAMAINDEX_INDEX_JSON_PATH",
    "LLAMAINDEX_INDEX_S3_URI",
  ] as const;
  const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of keys) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    resetPortfolioCorpusValidationForTests();
  });

  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("requires a LlamaIndex index path or S3 URI", () => {
    expect(() => validateCorpusEnv()).toThrow(
      /LlamaIndex corpus not configured/i
    );
  });

  it("passes when LLAMAINDEX_INDEX_JSON_PATH is set", () => {
    process.env.LLAMAINDEX_INDEX_JSON_PATH = "/tmp/llamaindex.golden.json";
    expect(() => validateCorpusEnv()).not.toThrow();
  });
});
