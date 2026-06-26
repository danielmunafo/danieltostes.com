import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findPromptVersionBumpViolations,
  generatePromptManifest,
  hashPromptText,
  manifestPath,
  PROMPT_HASH_ALGORITHM,
  PROMPT_MANIFEST_SCHEMA_VERSION,
} from "../scripts/lib/prompt-manifest.mjs";
import { listPrompts } from "../src/recruiterAssistant/prompt/promptRegistry.js";

type ManifestPrompt = {
  promptId: string;
  version: string;
  stage: string;
  source: unknown;
  contentHash: string;
  lastUpdated: string;
};

type PromptManifest = {
  schemaVersion: number;
  hashAlgorithm: string;
  hashInput: {
    fileJoiner: string;
    fileBase: string;
  };
  prompts: ManifestPrompt[];
};

const SERVICE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEST_PROMPT_ID = "pitch";
const TEST_STAGE = "pitch";
const TEST_SOURCE = { kind: "file", files: ["agents/pitch/instructions.md"] };
const TEST_HASH_BEFORE = hashPromptText("old prompt text");
const TEST_HASH_AFTER = hashPromptText("new prompt text");
const committedManifest = JSON.parse(
  readFileSync(manifestPath(SERVICE_ROOT), "utf8")
) as PromptManifest;
const generatedManifest = generatePromptManifest(
  SERVICE_ROOT
) as PromptManifest;

describe("prompt manifest", () => {
  it("uses the current schema and hash algorithm", () => {
    expect(committedManifest.schemaVersion).toBe(
      PROMPT_MANIFEST_SCHEMA_VERSION
    );
    expect(committedManifest.hashAlgorithm).toBe(PROMPT_HASH_ALGORITHM);
    expect(committedManifest.hashInput).toEqual({
      fileJoiner: "\n",
      fileBase: "src/recruiterAssistant",
    });
  });

  it("matches the live registry and prompt text", () => {
    expect(committedManifest).toEqual(generatedManifest);
  });

  it("tracks every registry entry in registry order", () => {
    const registryPrompts = listPrompts();

    expect(committedManifest.prompts.map((prompt) => prompt.promptId)).toEqual(
      registryPrompts.map((prompt) => prompt.promptId)
    );

    for (const [index, registryPrompt] of registryPrompts.entries()) {
      const manifestPrompt = committedManifest.prompts[index];
      expect(manifestPrompt.version, registryPrompt.promptId).toBe(
        registryPrompt.version
      );
      expect(manifestPrompt.stage, registryPrompt.promptId).toBe(
        registryPrompt.stage
      );
      expect(manifestPrompt.source, registryPrompt.promptId).toEqual(
        registryPrompt.source
      );
      expect(manifestPrompt.lastUpdated, registryPrompt.promptId).toBe(
        registryPrompt.lastUpdated
      );
    }
  });

  it("stores a sha256 hash for each registered prompt", () => {
    for (const prompt of committedManifest.prompts) {
      expect(prompt.contentHash, prompt.promptId).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe("prompt version-bump drift detection", () => {
  it("flags changed prompt text when version and date stay pinned", () => {
    const baseManifest = manifestFixture({
      contentHash: TEST_HASH_BEFORE,
      lastUpdated: "2026-06-22",
      version: "1.0.0",
    });
    const currentManifest = manifestFixture({
      contentHash: TEST_HASH_AFTER,
      lastUpdated: "2026-06-22",
      version: "1.0.0",
    });

    const violations = findPromptVersionBumpViolations(
      baseManifest,
      currentManifest
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.promptId).toBe(TEST_PROMPT_ID);
    expect(violations[0]?.reasons).toEqual([
      "version must increase from 1.0.0 to a higher semver",
      "lastUpdated must change from 2026-06-22",
    ]);
  });

  it("allows changed prompt text when version and date advance", () => {
    const baseManifest = manifestFixture({
      contentHash: TEST_HASH_BEFORE,
      lastUpdated: "2026-06-22",
      version: "1.0.0",
    });
    const currentManifest = manifestFixture({
      contentHash: TEST_HASH_AFTER,
      lastUpdated: "2026-06-23",
      version: "1.0.1",
    });

    expect(
      findPromptVersionBumpViolations(baseManifest, currentManifest)
    ).toEqual([]);
  });

  it("allows unchanged prompt text without a version bump", () => {
    const baseManifest = manifestFixture({
      contentHash: TEST_HASH_BEFORE,
      lastUpdated: "2026-06-22",
      version: "1.0.0",
    });
    const currentManifest = manifestFixture({
      contentHash: TEST_HASH_BEFORE,
      lastUpdated: "2026-06-22",
      version: "1.0.0",
    });

    expect(
      findPromptVersionBumpViolations(baseManifest, currentManifest)
    ).toEqual([]);
  });
});

function manifestFixture(prompt: {
  contentHash: string;
  lastUpdated: string;
  version: string;
}): PromptManifest {
  return {
    schemaVersion: PROMPT_MANIFEST_SCHEMA_VERSION,
    hashAlgorithm: PROMPT_HASH_ALGORITHM,
    hashInput: {
      fileJoiner: "\n",
      fileBase: "src/recruiterAssistant",
    },
    prompts: [
      {
        promptId: TEST_PROMPT_ID,
        version: prompt.version,
        stage: TEST_STAGE,
        source: TEST_SOURCE,
        contentHash: prompt.contentHash,
        lastUpdated: prompt.lastUpdated,
      },
    ],
  };
}
