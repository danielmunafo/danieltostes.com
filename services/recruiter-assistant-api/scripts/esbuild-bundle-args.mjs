import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(scriptsDir, "..");

export const esbuildBundleArgs = [
  "src/handler.ts",
  "--bundle",
  "--platform=node",
  "--target=node20",
  `--outfile=${join(serviceRoot, "dist/index.cjs")}`,
  "--format=cjs",
  "--sourcemap",
  "--loader:.md=text",
  '--banner:js=var import_meta_url=require("node:url").pathToFileURL(__filename).href;',
  "--define:import.meta.url=import_meta_url",
];
