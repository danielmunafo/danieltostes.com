#!/usr/bin/env node
/**
 * Generates prompts.manifest.json from the TypeScript prompt registry.
 *
 * Strategy: esbuild-bundle promptRegistry.ts (with --loader:.md=text so inline
 * imports resolve) to a temp ESM file, dynamically import it, then write the
 * manifest. The manifest is committed to the repo so CI can diff it without
 * running TypeScript — and so layer 2 (promptManifest.test.ts) can assert the
 * committed copy matches the live registry.
 *
 * Usage:  node scripts/build-prompt-manifest.mjs
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = join(__dirname, "..");
const REGISTRY_ENTRY = join(
  SERVICE_ROOT,
  "src/recruiterAssistant/prompt/promptRegistry.ts"
);
const INTENT_GATE_ENTRY = join(SERVICE_ROOT, "src/security/intentGate.ts");
const TMP_DIR = join(SERVICE_ROOT, ".tmp-manifest-build");
const TMP_OUT = join(TMP_DIR, "registry.mjs");
const MANIFEST_OUT = join(SERVICE_ROOT, "prompts.manifest.json");

async function buildRegistry() {
  if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

  // Bundle the registry (and its transitive imports, including intentGate.ts
  // for INTENT_GATE_SYSTEM) into a single ESM file. loader:.md=text so the
  // agents/*.md imports resolve to their string content — same as the prod build.
  await build({
    entryPoints: [REGISTRY_ENTRY],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    outfile: TMP_OUT,
    loader: { ".md": "text", ".ts": "ts" },
    // Suppress the intentGate runtime deps (openai SDK etc.) — we only need the
    // exported const and the registry data; they have no side-effects at import.
    packages: "external",
  });
}

function computeHash(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function main() {
  await buildRegistry();

  // Dynamic import of the bundled ESM registry
  const registry = await import(`${TMP_OUT}?t=${Date.now()}`);

  const prompts = registry.listPrompts();
  const getAgentInstruction = registry.getAgentInstruction;
  const promptInstructionFiles = registry.promptInstructionFiles;

  // Verify hash strategy matches promptIntegrity.test.ts:
  //   file-backed: sha256(all files joined with "\n")
  //   inline:      sha256(INTENT_GATE_SYSTEM text)
  //
  // For the inline entry we re-read the source file directly (the bundled ESM
  // exports INTENT_GATE_SYSTEM, but importing it through the registry bundle
  // would pull in the full openai SDK. We read the raw TS instead.)
  const intentGateSrc = readFileSync(INTENT_GATE_ENTRY, "utf8");
  const inlineMatch = intentGateSrc.match(
    /export const INTENT_GATE_SYSTEM = `([\s\S]*?)`/
  );
  if (!inlineMatch) {
    console.error(
      "Cannot find `export const INTENT_GATE_SYSTEM` in intentGate.ts"
    );
    process.exit(1);
  }
  const intentGateText = inlineMatch[1];

  const manifestPrompts = prompts.map((p) => {
    let liveHash;
    if (p.source.kind === "inline") {
      liveHash = computeHash(intentGateText);
    } else {
      const files = promptInstructionFiles(p);
      const text = files.map((f) => getAgentInstruction(f)).join("\n");
      liveHash = computeHash(text);
    }

    if (liveHash !== p.contentHash) {
      console.error(
        `\nHash mismatch for ${p.promptId}:\n` +
          `  registry: ${p.contentHash}\n` +
          `  live:     ${liveHash}\n` +
          "Run npm test to diagnose (promptIntegrity will tell you which file drifted)."
      );
      process.exit(1);
    }

    return {
      promptId: p.promptId,
      version: p.version,
      stage: p.stage,
      contentHash: p.contentHash,
      lastUpdated: p.lastUpdated,
    };
  });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    prompts: manifestPrompts,
  };

  writeFileSync(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[build:prompt-manifest] Wrote ${MANIFEST_OUT}`);
  console.log(`  ${manifestPrompts.length} prompts`);
  for (const p of manifestPrompts) {
    console.log(`  ${p.promptId}@${p.version}  ${p.contentHash.slice(0, 12)}…`);
  }
}

main()
  .catch((err) => {
    console.error("[build:prompt-manifest] Fatal:", err);
    process.exit(1);
  })
  .finally(() => {
    if (existsSync(TMP_DIR)) rmSync(TMP_DIR, { recursive: true, force: true });
  });
