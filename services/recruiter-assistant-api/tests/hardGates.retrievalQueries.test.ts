import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildJdHardGateRetrievalQueries } from "../src/rag/hardGates/buildJdHardGateRetrievalQueries.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("buildJdHardGateRetrievalQueries", () => {
  it("includes metadata and language/stack queries for fiskaly JD", () => {
    const jd = readFileSync(
      join(__dirname, "fixtures", "fiskaly-style-backend-jd.txt"),
      "utf8"
    );
    const queries = buildJdHardGateRetrievalQueries(jd);
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.length).toBeLessThanOrEqual(6);
    expect(queries.some((q) => q.includes("languages"))).toBe(true);
    expect(queries.some((q) => /german|fluent/i.test(q))).toBe(true);
    expect(queries.some((q) => /golang|go/i.test(q))).toBe(true);
  });

  it("caps query count for long JDs", () => {
    const longJd = `${"German Golang hybrid Vienna freelance visa ".repeat(40)}`;
    const queries = buildJdHardGateRetrievalQueries(longJd);
    expect(queries.length).toBeLessThanOrEqual(6);
  });
});
