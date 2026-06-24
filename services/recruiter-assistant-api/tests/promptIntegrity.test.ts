import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { INTENT_GATE_SYSTEM } from "../src/security/intentGate.js";
import {
  getAgentInstruction,
  listPrompts,
  promptInstructionFiles,
} from "../src/recruiterAssistant/prompt/promptRegistry.js";

/**
 * Layer 1 of the version-bump guard.
 *
 * Each registry entry stores a `contentHash` (sha256) of the prompt text at the
 * time its `version` was set. This test recomputes the hash from live text and
 * fails if they differ. Editing a prompt file without updating `contentHash` →
 * red test. Updating `contentHash` without bumping `version` → layer 3 CI check
 * catches it. Together they make it impossible to deploy a changed prompt without
 * a `version` bump.
 *
 * Hash strategy (must match `build-prompt-manifest.mjs` and `check-prompt-version-bump.mjs`):
 *   - File-backed (single or multiple files): sha256 of all file contents joined with "\n"
 *   - Inline: sha256 of the exported symbol string
 */

function computeHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("promptIntegrity", () => {
  const prompts = listPrompts();

  it("every entry has a 64-char hex contentHash", () => {
    for (const prompt of prompts) {
      expect(
        prompt.contentHash,
        `${prompt.promptId} missing contentHash`
      ).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("stored contentHash matches live prompt text for every entry", () => {
    for (const prompt of prompts) {
      let liveText: string;

      if (prompt.source.kind === "inline") {
        expect(
          prompt.source.symbol,
          `${prompt.promptId}: unexpected inline symbol`
        ).toBe("INTENT_GATE_SYSTEM");
        liveText = INTENT_GATE_SYSTEM;
      } else {
        const files = promptInstructionFiles(prompt);
        liveText = files.map((f) => getAgentInstruction(f)).join("\n");
      }

      const liveHash = computeHash(liveText);
      expect(
        liveHash,
        `${prompt.promptId}: contentHash drifted — edit the prompt text then bump version+contentHash in promptRegistry.ts`
      ).toBe(prompt.contentHash);
    }
  });
});
