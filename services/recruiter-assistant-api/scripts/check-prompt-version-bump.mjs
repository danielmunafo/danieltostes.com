#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findMergeBase,
  findPromptVersionBumpViolations,
  formatPromptVersionBumpViolation,
  generatePromptManifest,
  readManifestFromGit,
} from "./lib/prompt-manifest.mjs";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseRef = process.env.PROMPT_MANIFEST_BASE_REF || "origin/main";

function main() {
  const mergeBase = findMergeBase(baseRef);
  if (!mergeBase) {
    console.log(`[prompt-bump-check] No merge-base with ${baseRef}; skipping.`);
    return;
  }

  const baseManifest = readManifestFromGit(mergeBase);
  if (!baseManifest) {
    console.log(
      `[prompt-bump-check] No base prompt manifest at ${mergeBase.slice(
        0,
        8
      )}; skipping first-manifest comparison.`
    );
    return;
  }

  const currentManifest = generatePromptManifest(serviceRoot);
  const violations = findPromptVersionBumpViolations(
    baseManifest,
    currentManifest
  );

  if (violations.length > 0) {
    console.error(
      "\n[prompt-bump-check] FAIL: prompt text changed without a registry version/date bump.\n"
    );
    for (const violation of violations) {
      console.error(formatPromptVersionBumpViolation(violation));
    }
    console.error(
      "\nFix: bump version and lastUpdated in promptRegistry.ts, then run npm run build:prompt-manifest.\n"
    );
    process.exit(1);
  }

  console.log(
    `[prompt-bump-check] OK: checked ${currentManifest.prompts.length} prompts against ${mergeBase.slice(
      0,
      8
    )}.`
  );
}

main();
