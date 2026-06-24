#!/usr/bin/env node
/**
 * Layer 3 of the version-bump guard. Run in CI after `npm test` (layers 1 & 2).
 *
 * Diffs prompts.manifest.json between the merge-base with origin/main and HEAD.
 * For any prompt whose contentHash changed, the version must also have changed.
 * Fails with a non-zero exit if any prompt's text changed without a version bump.
 *
 * Requires: fetch-depth: 0 on the CI checkout so the base ref is reachable.
 * Usage:  node scripts/check-prompt-version-bump.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = join(__dirname, "..");
const MANIFEST_PATH = join(SERVICE_ROOT, "prompts.manifest.json");
const MANIFEST_REPO_PATH =
  "services/recruiter-assistant-api/prompts.manifest.json";

function readCurrentManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(
      `Missing ${MANIFEST_PATH}. Run: npm run build:prompt-manifest`
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function readBaseManifest(baseRef) {
  try {
    const raw = execSync(`git show ${baseRef}:${MANIFEST_REPO_PATH}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findMergeBase() {
  try {
    return execSync("git merge-base HEAD origin/main", {
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function indexByPromptId(manifest) {
  const map = {};
  for (const p of manifest.prompts ?? []) {
    map[p.promptId] = p;
  }
  return map;
}

function main() {
  const mergeBase = findMergeBase();
  if (!mergeBase) {
    console.log(
      "[bump-check] Cannot find merge-base with origin/main — skipping."
    );
    process.exit(0);
  }

  const current = readCurrentManifest();
  const base = readBaseManifest(mergeBase);

  if (!base) {
    console.log(
      "[bump-check] No base manifest found (new file or first commit) — skipping."
    );
    process.exit(0);
  }

  const currentById = indexByPromptId(current);
  const baseById = indexByPromptId(base);

  const violations = [];

  for (const [promptId, curr] of Object.entries(currentById)) {
    const prev = baseById[promptId];
    if (!prev) continue; // new prompt — no prior version to compare

    const hashChanged = curr.contentHash !== prev.contentHash;
    const versionChanged = curr.version !== prev.version;

    if (hashChanged && !versionChanged) {
      violations.push(
        `  ${promptId}: contentHash changed (${prev.contentHash.slice(0, 12)}… → ${curr.contentHash.slice(0, 12)}…) but version is still ${curr.version}`
      );
    }
  }

  if (violations.length > 0) {
    console.error(
      "\n[bump-check] FAIL — prompt text changed without a version bump:\n"
    );
    for (const v of violations) console.error(v);
    console.error(
      "\nFix: bump version + contentHash in promptRegistry.ts, then regenerate the manifest.\n" +
        "See services/recruiter-assistant-api/docs/prompt-registry.md for bump guidance."
    );
    process.exit(1);
  }

  console.log(
    `[bump-check] OK — checked ${Object.keys(currentById).length} prompts against base ${mergeBase.slice(0, 8)}`
  );
}

main();
