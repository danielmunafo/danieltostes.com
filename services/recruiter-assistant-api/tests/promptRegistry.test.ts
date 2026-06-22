import { describe, expect, it } from "vitest";
import { listAgentInstructionPaths } from "../src/recruiterAssistant/prompt/getAgentInstruction.js";
import {
  getPromptById,
  getPromptByStage,
  getAgentInstruction,
  listPrompts,
  promptInstructionFiles,
  type PromptMetadata,
} from "../src/recruiterAssistant/prompt/promptRegistry.js";

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe("promptRegistry lookup", () => {
  it("returns an entry by promptId", () => {
    const pitch = getPromptById("pitch");
    expect(pitch.stage).toBe("pitch");
    expect(pitch.source.kind).toBe("file");
  });

  it("throws for an unknown promptId", () => {
    expect(() => getPromptById("does-not-exist")).toThrow(/Unknown promptId/);
  });

  it("returns an entry by trace stage (the trace-attach helper)", () => {
    const intent = getPromptByStage("intent_gate");
    expect(intent.promptId).toBe("intent-gate");
    expect(intent.source.kind).toBe("inline");
  });

  it("throws for an unknown stage", () => {
    expect(() =>
      getPromptByStage("missing" as Parameters<typeof getPromptByStage>[0])
    ).toThrow(/Unknown prompt stage/);
  });

  it("lists every registered prompt", () => {
    expect(listPrompts().length).toBe(9);
  });

  it("round-trips id -> stage -> id for every entry", () => {
    for (const prompt of listPrompts()) {
      expect(getPromptByStage(prompt.stage)).toBe(prompt);
      expect(getPromptById(prompt.promptId)).toBe(prompt);
    }
  });
});

describe("promptRegistry metadata consistency", () => {
  const prompts = listPrompts();

  it("has unique promptIds and unique stages", () => {
    const ids = prompts.map((p) => p.promptId);
    const stages = prompts.map((p) => p.stage);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(stages).size).toBe(stages.length);
  });

  it("has well-formed metadata fields on every entry", () => {
    for (const prompt of prompts) {
      expect(prompt.version, prompt.promptId).toMatch(SEMVER_RE);
      expect(prompt.lastUpdated, prompt.promptId).toMatch(ISO_DATE_RE);
      expect(prompt.owner.trim().length, prompt.promptId).toBeGreaterThan(0);
      expect(prompt.description.trim().length, prompt.promptId).toBeGreaterThan(
        0
      );
      assertSourceShape(prompt);
    }
  });

  it("references only instruction files that load with non-empty content", () => {
    for (const prompt of prompts) {
      for (const file of promptInstructionFiles(prompt)) {
        expect(getAgentInstruction(file).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("forms a bijection with the instruction loader (no orphans, no dangling refs)", () => {
    const referenced = new Set(
      prompts.flatMap((p) => promptInstructionFiles(p))
    );
    const loadable = new Set(listAgentInstructionPaths());
    // Every registry-referenced file is loadable.
    for (const file of referenced) {
      expect(loadable.has(file), `dangling reference: ${file}`).toBe(true);
    }
    // Every loadable instruction file is registered (catches "added a prompt, forgot to register").
    for (const file of loadable) {
      expect(referenced.has(file), `orphan instruction file: ${file}`).toBe(
        true
      );
    }
    expect(referenced.size).toBe(loadable.size);
  });
});

function assertSourceShape(prompt: PromptMetadata): void {
  if (prompt.source.kind === "inline") {
    expect(prompt.source.module.trim().length, prompt.promptId).toBeGreaterThan(
      0
    );
    expect(prompt.source.symbol.trim().length, prompt.promptId).toBeGreaterThan(
      0
    );
  } else {
    expect(prompt.source.files.length, prompt.promptId).toBeGreaterThan(0);
  }
}
