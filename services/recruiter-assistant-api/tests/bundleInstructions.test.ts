import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serviceRoot = dirname(fileURLToPath(import.meta.url));

describe("Lambda bundle includes agent instructions", () => {
  it("embeds evidence evaluator hard-cap prose in dist/index.cjs", () => {
    execSync("npm run build", {
      cwd: join(serviceRoot, ".."),
      stdio: "pipe",
    });
    const bundle = readFileSync(join(serviceRoot, "../dist/index.cjs"), "utf8");
    expect(bundle).toContain("Hard score caps");
    expect(bundle).toContain("Principal / staff full-stack role");
  });
});
