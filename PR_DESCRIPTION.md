## Summary

This PR introduces automated semantic versioning with GitHub Releases and improves the development workflow by adding commit structure guidelines and enforcing formatting checks in the code review process.

## Features

### 1. Automated Semantic Versioning & Releases

- **GitHub Actions Release Workflow** (`.github/workflows/release.yml`)
  - Automatically triggers on merge to main
  - Calculates next semantic version based on conventional commits
  - Updates `package.json` and `package-lock.json` versions
  - Creates git tags (`v<version>`)
  - Builds artifacts and creates GitHub Releases with zip archives
  - Includes PR information and commit messages in release notes

- **Version Calculation Script** (`scripts/calculate-next-version.mjs`)
  - Analyzes commits since last tag
  - Uses conventional commits: `feat:` → minor, `fix:` → patch, `BREAKING CHANGE` → major
  - Filters out version bump commits to prevent loops
  - Prevents duplicate releases

- **Version Update Script** (`scripts/update-package-version.mjs`)
  - Updates `package.json` version
  - Updates `package-lock.json` using npm

- **Documentation** (`docs/release-process.md`)
  - Explains the automated release process
  - Documents commit message format requirements
  - Updated `docs/README.md` and `docs/development.md` with references

### 2. Development Workflow Improvements

- **Commit Structure Guidelines** (`.cursor/rules/commits/RULE.md`)
  - Guidelines for separating concerns (CI/CD, scripts, docs, code)
  - Conventional commit format requirements
  - Commit ordering and grouping best practices
  - Agent-specific commit workflow

- **Enhanced Code Review Process** (`.cursor/rules/code-review/RULE.md`)
  - **MANDATORY** formatting check before committing
  - Commit structure review step
  - References commit guidelines

- **Updated Agent Instructions** (`AGENTS.md`, `.cursor/AI_INDEX.md`)
  - Added formatting check requirements
  - Added commit structure review requirements
  - Added commits rule to AI index

## How Semantic Versioning Works

1. PR merged to main → Release workflow triggers
2. Analyzes commits since last tag using conventional commit format
3. Calculates next version (major/minor/patch)
4. Updates `package.json` and `package-lock.json`
5. Creates git tag and pushes it
6. Builds project and creates GitHub Release with artifacts
7. Includes commit messages and PR links in release notes

## Commit Structure

This PR demonstrates proper commit structure with separate commits for:

- Feature implementation (semantic versioning)
- Formatting fixes
- Documentation (guidelines)
- Process improvements (code review)
- Documentation updates

## Testing

- Scripts tested locally
- Formatting checks pass (`npm run format:check`)
- Lint checks pass (`npm run lint`)
- Tests pass (`npm run test`)
- Follows project conventions (ESM modules, clean code)
- No new dependencies added

## Files Changed

- **CI/CD**: `.github/workflows/release.yml`
- **Scripts**: `scripts/calculate-next-version.mjs`, `scripts/update-package-version.mjs`
- **Rules**: `.cursor/rules/commits/RULE.md`, `.cursor/rules/code-review/RULE.md`
- **Documentation**: `docs/release-process.md`, `docs/commit-guidelines-summary.md`, `docs/README.md`, `docs/development.md`
- **Agent Instructions**: `AGENTS.md`, `.cursor/AI_INDEX.md`

## Next Steps

After merge, the next PR merged to main will automatically create the first release tag (v0.2.0 based on current commits). Future commits will follow the improved structure guidelines, and formatting checks will be enforced before committing.
