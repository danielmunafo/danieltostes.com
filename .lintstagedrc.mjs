import { lstatSync } from "node:fs";

// Skip symlinks: this repo aliases cross-tool agent instructions via symlinks
// (e.g. .github/copilot-instructions.md -> AGENTS.md, .claude/skills/* ->
// .cursor/skills/*). Prettier exits non-zero when an explicit path is a
// symlink, which would break the pre-commit hook. Formatters/linters should
// run on the canonical target, not the alias.
const isRegularFile = (file) => {
  try {
    return lstatSync(file).isFile();
  } catch {
    return false;
  }
};

const config = {
  "*.{js,mjs,ts,tsx,json,css,md}": (files) => {
    const real = files.filter(isRegularFile);
    if (real.length === 0) return [];
    const list = real.map((file) => JSON.stringify(file)).join(" ");
    return [`prettier --write ${list}`, `eslint --fix ${list}`];
  },
};

export default config;
