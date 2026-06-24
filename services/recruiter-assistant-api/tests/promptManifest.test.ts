import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listPrompts } from "../src/recruiterAssistant/prompt/promptRegistry.js";

/**
 * Layer 2 of the version-bump guard.
 *
 * The committed prompts.manifest.json must exactly mirror listPrompts(). This
 * test fails if someone edits the registry without regenerating the manifest
 * (or vice versa). Together with layer 1 (promptIntegrity.test.ts) and layer 3
 * (check-prompt-version-bump.mjs), it closes the loop:
 *
 *   edit prompt → layer 1 fails (hash drifted)
 *   fix hash, skip version bump → layer 3 fails in CI (hash moved, version didn't)
 *   fix version, skip manifest regen → layer 2 fails here
 */

const SERVICE_ROOT = join(import.meta.dirname, "..");
const MANIFEST_PATH = join(SERVICE_ROOT, "prompts.manifest.json");

type ManifestEntry = {
  promptId: string;
  version: string;
  stage: string;
  contentHash: string;
  lastUpdated: string;
};

type Manifest = {
  schemaVersion: number;
  generatedAt: string;
  prompts: ManifestEntry[];
};

describe("promptManifest", () => {
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const prompts = listPrompts();

  it("manifest has schemaVersion 1", () => {
    expect(manifest.schemaVersion).toBe(1);
  });

  it("manifest prompt count matches registry", () => {
    expect(manifest.prompts).toHaveLength(prompts.length);
  });

  it("every registry entry appears in the manifest with matching fields", () => {
    const byId = new Map(manifest.prompts.map((p) => [p.promptId, p]));
    for (const reg of prompts) {
      const man = byId.get(reg.promptId);
      expect(
        man,
        `${reg.promptId} in registry but not in manifest — run: npm run build:prompt-manifest`
      ).toBeDefined();
      if (!man) continue;
      expect(man.version, `${reg.promptId} version mismatch`).toBe(reg.version);
      expect(man.stage, `${reg.promptId} stage mismatch`).toBe(reg.stage);
      expect(man.contentHash, `${reg.promptId} contentHash mismatch`).toBe(
        reg.contentHash
      );
      expect(man.lastUpdated, `${reg.promptId} lastUpdated mismatch`).toBe(
        reg.lastUpdated
      );
    }
  });

  it("no extra entries in manifest beyond the registry", () => {
    const registryIds = new Set(prompts.map((p) => p.promptId));
    for (const man of manifest.prompts) {
      expect(
        registryIds.has(man.promptId),
        `${man.promptId} in manifest but not in registry`
      ).toBe(true);
    }
  });
});
