# Release Process

This repository uses automated semantic versioning based on [Conventional Commits](https://www.conventionalcommits.org/).

## How It Works

Every merge to the `main` branch triggers an automated release workflow that:

1. **Calculates the next version** based on commit messages since the last tag:
   - `feat:` or `feat(scope):` → Minor version bump (e.g., 1.2.0 → 1.3.0)
   - `fix:` or `fix(scope):` → Patch version bump (e.g., 1.2.0 → 1.2.1)
   - `feat!:` or `feat(scope)!:` or commits with `BREAKING CHANGE:` footer → Major version bump (e.g., 1.2.0 → 2.0.0)

2. **Updates version files**:
   - Updates `package.json` version
   - Updates `package-lock.json` version

3. **Creates a git tag**:
   - Tags the commit with `v<version>` (e.g., `v1.2.3`)
   - Pushes the tag to the repository

4. **Creates a GitHub Release**:
   - Creates a release with the tag
   - Includes commit messages since the last release
   - Links to the PR that triggered the release (if applicable)
   - Uploads build artifacts as a zip file

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat: add new feature` or `feat(ui): add button` - New feature (minor bump)
- `fix: resolve bug` or `fix(auth): login issue` - Bug fix (patch bump)
- `feat!: breaking change` or `feat(api)!: remove endpoint` - Breaking change in header (major bump)
- `feat: add feature` with `BREAKING CHANGE:` in body - Breaking change in footer (major bump)
- `chore: maintenance` - No version bump (unless it's the only commit type)

## Workflow Files

- `.github/workflows/release.yml` - Handles version calculation, tagging, and release creation
- `scripts/calculate-next-version.mjs` - Calculates the next semantic version
- `scripts/update-package-version.mjs` - Updates package.json and package-lock.json

## Requirements

- GitHub Actions must have `contents: write` permission (configured in workflow)
- The default `GITHUB_TOKEN` is used for creating releases and tags
- Commits must follow conventional commit format for proper versioning

## Manual Override

If you need to manually create a release:

1. Create and push a tag: `git tag v1.2.3 && git push origin v1.2.3`
2. Manually create a GitHub Release with that tag
3. Update `package.json` version manually if needed
