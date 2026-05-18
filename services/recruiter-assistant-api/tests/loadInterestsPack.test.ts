import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  INTERESTS_OUTPUT_SKIP_SENTINEL,
  isRecruiterOffTopicBriefMarkdown,
} from "../src/constants.js";
import {
  loadInterestsPack,
  resetInterestsPackCacheForTests,
  shouldOmitInterestsOutputMarkdown,
} from "../src/interests/loadInterestsPack.js";

const INTERESTS_ENV_KEYS = [
  "INTERESTS_PACK_JSON_PATH",
  "INTERESTS_PACK_S3_URI",
  "INTERESTS_PACK_S3_BUCKET",
  "INTERESTS_PACK_S3_KEY",
] as const;

describe("loadInterestsPack", () => {
  afterEach(() => {
    resetInterestsPackCacheForTests();
    for (const key of INTERESTS_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("returns null when no path or S3 env is set", async () => {
    expect(await loadInterestsPack()).toBeNull();
  });

  it("loads valid local JSON", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interests-pack-"));
    const file = join(dir, "pack.json");
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: 1,
        criteriaMarkdown: "# Test\nPrefer remote.",
      }),
      "utf8"
    );
    process.env.INTERESTS_PACK_JSON_PATH = file;
    const pack = await loadInterestsPack();
    expect(pack?.criteriaMarkdown).toContain("Prefer remote");
    unlinkSync(file);
  });

  it("returns null for invalid JSON schema", async () => {
    const dir = mkdtempSync(join(tmpdir(), "interests-pack-"));
    const file = join(dir, "bad.json");
    writeFileSync(file, JSON.stringify({ schemaVersion: 2 }), "utf8");
    process.env.INTERESTS_PACK_JSON_PATH = file;
    expect(await loadInterestsPack()).toBeNull();
    unlinkSync(file);
  });
});

describe("shouldOmitInterestsOutputMarkdown", () => {
  it("omits empty and sentinel", () => {
    expect(shouldOmitInterestsOutputMarkdown("")).toBe(true);
    expect(shouldOmitInterestsOutputMarkdown("  \n ")).toBe(true);
    expect(
      shouldOmitInterestsOutputMarkdown(INTERESTS_OUTPUT_SKIP_SENTINEL)
    ).toBe(true);
    expect(shouldOmitInterestsOutputMarkdown("# Preference\n|a|")).toBe(false);
  });
});

describe("isRecruiterOffTopicBriefMarkdown", () => {
  it("detects localized off-topic heading at start", () => {
    expect(
      isRecruiterOffTopicBriefMarkdown("# Off-topic input\n\nBody line\n")
    ).toBe(true);
    expect(
      isRecruiterOffTopicBriefMarkdown("# Requirement Coverage\n| a |")
    ).toBe(false);
  });
});
