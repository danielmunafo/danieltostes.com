## Scope

This RULE file governs **commit structure and organization** for all changes made by agents and humans.

## Key principles

- **One logical change per commit**: Each commit should represent a single, cohesive change that can be understood and reviewed independently.
- **Separate concerns**: Different types of changes (code, config, docs, CI/CD) should be in separate commits when possible.
- **Atomic commits**: Commits should be self-contained and not break the build or tests.

## Commit structure guidelines

### When to split into multiple commits

Split changes into separate commits when they represent **different concerns**:

1. **Infrastructure vs. Implementation**
   - CI/CD workflows → separate commit
   - Scripts/tooling → separate commit
   - Actual feature implementation → separate commit

2. **Documentation vs. Code**
   - Documentation updates → separate commit
   - Code changes → separate commit
   - Exception: Small doc fixes that are part of the same logical change can be combined

3. **Configuration vs. Code**
   - Config file changes (e.g., `.github/workflows/`, `.eslintrc`) → separate commit
   - Code changes → separate commit

4. **Different features**
   - Each feature → separate commit
   - Related refactoring can be in the same commit as the feature

### Commit message format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, tooling, CI/CD)
- `ci`: CI/CD changes
- `build`: Build system or external dependencies

**Examples of good commit structure:**

```
feat: add automated semantic versioning workflow
ci: add GitHub Actions release workflow
docs: document release process
chore: add version calculation scripts
```

Instead of:

```
feat: add automated semantic versioning and release workflow
- Add GitHub Actions workflow
- Create version calculation scripts
- Add documentation
```

### Commit ordering

When making multiple commits:

1. **Foundation first**: Infrastructure, tooling, config
2. **Implementation second**: Actual feature code
3. **Documentation last**: Docs that describe the changes

Example:

```
ci: add release workflow
chore: add version calculation scripts
feat: integrate semantic versioning
docs: document release process
```

## Agent-specific guidelines

### Before committing

1. **Group changes by concern**: Review all changes and group them logically
2. **Check formatting**: Run `npm run format:check` and fix issues before committing
3. **Verify tests**: Ensure tests pass (or note why they don't)
4. **Review scope**: If a single commit would mix concerns, split it

### Commit workflow

1. **Stage related files**: Use `git add` with specific paths, not `git add .`
2. **Commit with clear message**: Use conventional commit format
3. **Repeat**: Continue until all changes are committed
4. **Verify**: Run `git log` to review commit structure

### Example: Multi-commit workflow

```bash
# 1. Infrastructure first
git add .github/workflows/release.yml
git commit -m "ci: add automated release workflow"

# 2. Scripts/tooling
git add scripts/calculate-next-version.mjs scripts/update-package-version.mjs
git commit -m "chore: add version calculation and update scripts"

# 3. Documentation
git add docs/release-process.md docs/README.md docs/development.md
git commit -m "docs: document release process and update index"

# 4. If there were code changes
git add src/...
git commit -m "feat: integrate semantic versioning"
```

## Gotchas

- **Don't mix**: CI/CD config with code, docs with implementation, different features
- **Don't use `git add .`**: Be explicit about what goes in each commit
- **Don't skip formatting**: Always run `npm run format:check` before committing
- **Don't force atomicity**: If changes are tightly coupled and can't be separated, one commit is acceptable
- **Don't over-split**: Don't create commits for every single file if they're part of the same logical change

## Review checklist

Before finalizing commits:

- [ ] Each commit represents a single logical change
- [ ] Different concerns are in separate commits
- [ ] Commit messages follow conventional commit format
- [ ] Formatting has been checked (`npm run format:check`)
- [ ] Tests pass (or reason noted)
- [ ] Commit order makes sense (foundation → implementation → docs)
