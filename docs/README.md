# Documentation index

| Document                                                                                                                 | Description                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [architecture.md](./architecture.md)                                                                                     | Goals, constraints, static export, Next.js vs Vite, MUI, i18n, bundle budget          |
| [diagrams.md](./diagrams.md)                                                                                             | CI/CD sequence, S3 + CloudFront + Route 53                                            |
| [design-principles.md](./design-principles.md)                                                                           | Static-first, performance, trade-offs, maintainability                                |
| [development.md](./development.md)                                                                                       | Local scripts, git hooks, CI/CD summary                                               |
| [deployment-setup.md](./deployment-setup.md)                                                                             | GitHub Actions, environments, AWS (S3, CloudFront), secrets                           |
| [release-process.md](./release-process.md)                                                                               | Semantic versioning, automated releases, git tags, GitHub Releases                    |
| [search-index.md](./search-index.md)                                                                                     | How the search index is built; section/content requirements for search                |
| [plans/README.md](./plans/README.md)                                                                                     | Implementation and execution plans (scaffolding, parallax, recruiter assistant, etc.) |
| [plans/recruiter-assistant-plan.md](./plans/recruiter-assistant-plan.md)                                                 | Recruiter AI chat: RAG, Lambda streaming, security, CI                                |
| [plans/recruiter-assistant-production-readiness-roadmap.md](./plans/recruiter-assistant-production-readiness-roadmap.md) | v0.15.0 recruiter assistant operations roadmap and next gaps                          |

When code, config, or behavior changes in a way that affects a doc, update that doc. See `.cursor/rules/documentation.mdc` for conventions.
