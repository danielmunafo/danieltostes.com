#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esbuildBundleArgs } from "./esbuild-bundle-args.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(scriptsDir, "..");
const esbuildBin = join(serviceRoot, "node_modules/esbuild/bin/esbuild");
const extraArgs = process.argv.slice(2);

const result = spawnSync(esbuildBin, [...esbuildBundleArgs, ...extraArgs], {
  cwd: serviceRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
