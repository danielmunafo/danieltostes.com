# danieltostes.com

[![Build](https://img.shields.io/github/actions/workflow/status/danielmunafo/danieltostes.com/ci.yml?branch=main&label=build)](https://github.com/danielmunafo/danieltostes.com/actions/workflows/ci.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/danielmunafo/danieltostes.com/ci.yml?branch=main&label=CI)](https://github.com/danielmunafo/danieltostes.com/actions/workflows/ci.yml)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-80%2B-green)](https://github.com/danielmunafo/danieltostes.com/actions/workflows/ci.yml)

Personal portfolio site for Daniel Munafó Tostes — Senior Software Engineer focused on scalable product platforms, distributed systems, and cloud-native architecture.

This repository is intentionally engineered as a **static-first, production-grade web application** deployed to **AWS S3 + CloudFront**, with CI/CD via GitHub Actions.

It serves two purposes:

1. Public portfolio.
2. Demonstration of engineering discipline: performance, explicit trade-offs, and maintainable structure.

---

## Live

🌍 https://danieltostes.com

---

## Architecture Summary

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (ESNext)
- **Rendering model:** Static export (`output: 'export'`)
- **Hosting:** AWS S3
- **CDN:** CloudFront
- **DNS:** Route 53
- **Styling:** MUI + Emotion (theme-driven, dark/light toggle), Roboto font
- **i18n:** next-intl, 4 locales (en, pt-BR, es, it), locale in path, on-demand message chunks
- **Testing:** Vitest (unit) + Playwright (E2E)
- **CI/CD:** GitHub Actions

There is no runtime server.  
There are no API routes.  
The site is built once and distributed globally via CDN.

Root layout uses MUI’s `AppRouterCacheProvider` per [MUI Next.js integration](https://mui.com/material-ui/integrations/nextjs/).

For detailed reasoning, see:

- `docs/architecture.md`
- `docs/diagrams.md`
- `docs/scaffolding-implementation-plan.md`
- `docs/deployment-setup.md`

---

## Design Principles

### 1. Static-First

The deployment target is S3 + CloudFront.  
This eliminates runtime infrastructure, reduces operational risk, and keeps cost predictable.

Dynamic capability is intentionally constrained.

### 2. Performance as Baseline

Lighthouse target: **≥ 80**

Performance is treated as a requirement, not an afterthought.

- Small initial JavaScript
- Route-based code splitting
- Minimal dependency surface

### 3. Explicit Trade-offs

Framework and tooling choices are documented.

Complexity must justify itself.

Micro-frontends, SSR servers, and dynamic infrastructure were intentionally excluded.

### 4. Maintainability Over Novelty

The structure favors clarity and conventions over experimentation.

Future growth is possible, but not assumed.

---

## Why This Stack?

### Why Next.js (Static Export)?

- File-based routing
- Built-in code splitting
- Mature ecosystem
- Strong structural conventions

It provides guardrails without requiring server runtime.

### Why Not Pure Vite?

Vite would work for a minimal SPA.  
Next was chosen for its routing model, ecosystem maturity, and extensibility if content expands (blog, case studies, etc.).

### Why MUI Over Tailwind?

- Accessible components out of the box
- Centralized theme tokens
- Predictable dark/light theming
- Fast professional UI delivery

Styling strategy:

- Use theme tokens first
- Use `sx` for most styling
- Use `styled()` for reusable primitives
- Minimal global CSS

### Why Not Micro-Frontends?

Because there is one developer, one deploy target, and one cohesive UI.

Architecture should reflect domain needs, not technical capability display.

---

## Development

```bash
npm install
npm run dev      # Local dev with hot reload (serves on http://localhost:3000)
npm run build    # Production static export → out/
npm start        # Serves out/ locally (preview production build)
```

Other scripts: `npm run lint`, `npm run format:check`, `npm run test`, `npm run test:e2e`.  
Pre-commit hooks (Husky + lint-staged) run lint and format on staged files.

---

## CI/CD

**Workflow:** `.github/workflows/ci.yml`

The top-of-readme badges (Build, CI, Lighthouse) reflect the status of this workflow. Build and CI are dynamic (latest run on `main`); Lighthouse shows the enforced minimum (see [Lighthouse CI](#lighthouse-ci) below).

### Pipeline jobs

| Job                 | Purpose                                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **lint-test-build** | Lint, format check, unit tests (Vitest), build, E2E (Playwright), then upload `out/` as artifact.                                                                                                                 |
| **lighthouseci**    | Runs [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) against the static build; asserts Performance, Accessibility, Best Practices, and SEO ≥ 80. **Required** — workflow fails if assertions fail. |
| **deploy**          | Downloads `out/`, syncs to S3, invalidates CloudFront. Depends only on `lint-test-build`.                                                                                                                         |

`lint-test-build` and `lighthouseci` run in parallel. Deploy runs after `lint-test-build` succeeds.

### Pull requests

On every PR the pipeline runs **lint**, **format check**, **unit tests**, **build**, **E2E tests**, and **Lighthouse CI**. If all pass, it **deploys to the dev environment** for preview (using the artifact from `lint-test-build`).

### Main branch

On merge to `main`, the same checks run and the pipeline **deploys to production**: uploads `out/` to S3 and invalidates the CloudFront cache.

### Lighthouse CI

The **lighthouseci** job runs on every PR and push and **must pass**; the workflow fails if any category score is below 80.

- **Config:** `lighthouserc.cjs` (collect from `./out`, assert category scores ≥ 0.8, optional upload to temporary public storage).
- **Local run:** `npm run test:lighthouse` (after `npm run build`).
- **Optional secret:** To post Lighthouse results as GitHub status checks and report links on PRs, install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) and add the token as `LHCI_GITHUB_APP_TOKEN`. Without it, the job still runs and must pass; it just does not post status checks.

### Environments

The workflow uses GitHub environments with conditional deployment:

- **dev**: Deployed automatically on pull requests for preview and testing
- **production**: Deployed automatically on merge to `main`

**Required GitHub secrets** (see [`docs/deployment-setup.md`](./docs/deployment-setup.md)):

- `AWS_ROLE_ARN`: IAM role for AWS authentication (OIDC-based, used by both environments)
- `AWS_S3_BUCKET`: S3 bucket name (environment-specific, configured in GitHub environment)
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID (environment-specific, configured in GitHub environment)

**Optional:**

- `LHCI_GITHUB_APP_TOKEN`: Token from the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci); enables status checks and report links on PRs.

---

## AWS Deployment Model

The site is deployed using a static-first infrastructure model with two environments:

### Infrastructure Components

- **S3**: Durable storage for static assets (HTML, JS, CSS, images)
- **CloudFront**: Global CDN for edge caching and HTTPS termination
- **Route 53**: DNS management for the custom domain
- **ACM (AWS Certificate Manager)**: Managed TLS certificates

### Environments

- **dev**: Preview environment for testing pull requests before merge
- **production**: Live environment for the main branch

Each environment has its own S3 bucket and CloudFront distribution, configured via GitHub secrets.

### Benefits

- No runtime server
- Minimal operational overhead
- Global edge performance
- Predictable cost model
- Reduced attack surface
- Safe preview/testing workflow before production

---

## i18n

**next-intl** with four locales: **en**, **pt-BR**, **es**, **it**.

- One route per locale: `/en`, `/pt-BR`, `/es`, `/it`. Root `/` redirects to the default locale. These URLs are the source of truth for direct access, sharing, and SEO (each has a stable, indexable URL).
- Message chunks are loaded on demand per locale (no single bundle with all languages).
- Language can be switched in-app without full navigation (client-side re-render). The URL does not change on switch, so the current route stays the same; use a locale-specific URL to open or share a given language.
- Locale and time-zone constants live in `src/i18n/request.ts` and `src/constants/site.ts`.

---

## Future Considerations

Possible future evolutions:

- MDX-based content pipeline (posts or technical case studies)
- Bundle regression checks in CI
- Privacy-conscious web vitals tracking
- Serverless endpoint for contact form if required

Any additional complexity must justify itself against the static-first constraint.

---

## License

This repository is public for transparency and learning purposes.

The content and branding remain the intellectual property of Daniel Munafó Tostes.

---

## Contact

If reviewing this repository as part of a hiring process:

LinkedIn: [Daniel Tostes](https://www.linkedin.com/in/dantostes/)
Email: dann.tostes@gmail.com
