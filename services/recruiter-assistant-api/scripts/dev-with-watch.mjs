#!/usr/bin/env node
/**
 * Local dev: esbuild --watch + HTTP server restarted on each bundle write.
 * Node caches require() of dist/index.cjs, so the server must restart after rebuilds.
 */
import { spawn } from "node:child_process";
import { mkdirSync, statSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esbuildBundleArgs } from "./esbuild-bundle-args.mjs";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(scriptsDir, "..");
const distDir = join(serviceRoot, "dist");
const bundlePath = join(distDir, "index.cjs");
const esbuildBin = join(serviceRoot, "node_modules/esbuild/bin/esbuild");

const esbuildArgs = [
  ...esbuildBundleArgs,
  // CI / Playwright webServer background the process and close stdin; default watch exits.
  "--watch=forever",
];

const restartDebounceMs = 200;

let serverChild = null;
let hasStartedServer = false;
let lastServedBundleMtimeMs = 0;
let restartTimer;

function stopServer() {
  if (!serverChild) return;
  serverChild.kill("SIGTERM");
  serverChild = null;
}

function startServer() {
  stopServer();
  serverChild = spawn(
    process.execPath,
    ["--enable-source-maps", join(scriptsDir, "dev-server.mjs")],
    { cwd: serviceRoot, stdio: "inherit", env: process.env }
  );
  serverChild.on("exit", (code, signal) => {
    if (signal === "SIGTERM") return;
    if (code !== 0 && code !== null) {
      process.exitCode = code;
    }
  });
}

function scheduleServerStart() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    let bundleMtimeMs;
    try {
      bundleMtimeMs = statSync(bundlePath).mtimeMs;
    } catch {
      return;
    }
    if (bundleMtimeMs === lastServedBundleMtimeMs) return;
    lastServedBundleMtimeMs = bundleMtimeMs;

    const isRestart = hasStartedServer;
    hasStartedServer = true;
    if (isRestart) {
      console.log("[dev] bundle updated — restarting server");
    }
    startServer();
  }, restartDebounceMs);
}

const esbuildChild = spawn(esbuildBin, esbuildArgs, {
  cwd: serviceRoot,
  stdio: "inherit",
});

mkdirSync(distDir, { recursive: true });
watch(distDir, { persistent: true }, (_, filename) => {
  if (filename !== "index.cjs") return;
  scheduleServerStart();
});

function shutdown(signal) {
  clearTimeout(restartTimer);
  stopServer();
  esbuildChild.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

esbuildChild.on("exit", (code) => {
  clearTimeout(restartTimer);
  stopServer();
  process.exit(code ?? 0);
});
