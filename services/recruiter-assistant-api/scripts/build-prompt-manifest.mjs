#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generatePromptManifest,
  manifestPath,
  writePromptManifest,
} from "./lib/prompt-manifest.mjs";

const serviceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = generatePromptManifest(serviceRoot);

writePromptManifest(serviceRoot, manifest);

console.log(`[build:prompt-manifest] Wrote ${manifestPath(serviceRoot)}`);
for (const prompt of manifest.prompts) {
  console.log(
    `  ${prompt.promptId}@${prompt.version} ${prompt.contentHash.slice(0, 12)}`
  );
}
