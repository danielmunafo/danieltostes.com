## AI Index

This file is a compact map for AI agents. Use it to discover the right rules and docs with minimal navigation.

### Global

- `AGENTS.md` — high-level stack, code style, CSS and architecture pointers.
- `docs/README.md` — documentation index (architecture, design principles, development, deployment).
- `docs/architecture.md` — system goals, constraints, and key decisions.
- `docs/diagrams.md` — CI/CD and AWS infra diagrams.
- `docs/development.md` — local scripts, git hooks, CI summary.

### Code areas

- **Code review (pre-completion)**
  - `.cursor/rules/code-review/RULE.md`
  - Run before finishing: review changes against AGENTS.md and relevant RULEs; enforce guidelines.
- **Documentation (all docs)**
  - `.cursor/rules/documentation/RULE.md`
  - When to update docs; applies to `docs/` and `docs/plans/`.
- **App shell & routing**
  - `.cursor/rules/app/RULE.md`
- **Components & sections**
  - `.cursor/rules/components/RULE.md`
- **Theme & design tokens**
  - `.cursor/rules/theme/RULE.md`
- **Hooks**
  - `.cursor/rules/hooks/RULE.md`
- **i18n & messages**
  - `.cursor/rules/i18n/RULE.md`
- **Search index (sections & content)**
  - `docs/search-index.md` — When adding or updating sections or locale content, ensure they comply with search index requirements (message paths, scroll target IDs, impact messages + markdown, all locales).
- **Recruiter AI assistant (chat + Lambda RAG)**
  - `.cursor/rules/recruiter-assistant/RULE.md`
  - Plan: `docs/plans/recruiter-assistant-plan.md` — AWS runbook: `services/recruiter-assistant-api/SETUP.md`
- **Testing (Vitest, Playwright)**
  - `.cursor/rules/testing/RULE.md`
- **Scripts & tooling**
  - `.cursor/rules/scripts/RULE.md`
- **Dependencies (npm)**
  - `.cursor/rules/dependencies/RULE.md`
- **Plans (implementation / execution)**
  - `.cursor/rules/plans/RULE.md`
  - Plans live in `docs/plans/`; see `docs/plans/README.md`.
- **Commits (structure & organization)**
  - `.cursor/rules/commits/RULE.md`
  - Commit structure, grouping changes, conventional commits format.

### Skills

Skills live in **`.cursor/skills/<name>/`**; each has a `SKILL.md`. **When to use** and **example prompts** are below so you can invoke without opening the full file.

**Invocation:** The agent may apply a skill when your prompt matches the **When** criteria even if you don’t name it, but that is not guaranteed. **To ensure the skill runs, mention it in your prompt** (e.g. “use the portfolio-career-reviewer skill” or paste an example below).

---

**Recruiter assistant (RAG chat + Lambda)**

- **Where:** `.cursor/skills/recruiter-assistant/SKILL.md` (extra context: `reference.md` in same dir).
- **When:** Changing recruiter assistant UI, streaming chat UX, Lambda handler, RAG/prompts/references, guards, rate limits, embeddings build, AWS/CI for `services/recruiter-assistant-api`, or terms/i18n for the feature.
- **Example prompts:**
  - “Use the recruiter-assistant skill to adjust RAG_TOP_K and the evidence brief.”
  - “Using recruiter-assistant, trace why the References block is empty and fix it.”
  - “Apply recruiter-assistant conventions: add a string to all four locales and the terms markdown.”

---

**Portfolio career reviewer**

- **Where:** `.cursor/skills/portfolio-career-reviewer/SKILL.md` (context: `profile-context.md` in same dir).
- **When:** Updating or creating `.md` files and/or `.json` translations related to jobs, projects, or experience; you want a senior/staff engineer voice advocating for Daniel, aligned with LinkedIn and profile context.
- **Example prompts:**
  - “Use the portfolio-career-reviewer skill to review this job entry and suggest improvements.”
  - “Using the portfolio career reviewer, turn these bullets into a full project case study.”
  - “Rewrite this experience section to better target senior/staff frontend or platform roles.”
