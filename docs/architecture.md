# Architecture

This repository contains my personal portfolio site, engineered as a **static-first web app** deployed to **AWS S3 + CloudFront** behind a custom domain.

The goal is to ship a recruiter-friendly experience while keeping the implementation intentionally “production-grade”: fast, maintainable, and easy to reason about.

---

## Goals

- **Credible senior-signal**: clear conventions, repeatable delivery, disciplined trade-offs.
- **Static-first hosting**: no server runtime required (cheap, reliable, low ops).
- **Performance baseline**: Lighthouse target **≥ 95** on a representative build.
- **Maintainability**: predictable architecture, minimal “framework magic”, small dependency surface.
- **Good UX**: clean design system, accessible components, i18n support, theme toggle.

---

## Key Constraints

- Deployment target is **S3** (static files only).
- CDN edge delivery via **CloudFront**.
- Custom domain via **Route 53**.
- Therefore:
  - **No server-side rendering at runtime**.
  - Any “dynamic” behavior must be done via **build-time generation** or **client-side rendering**.
  - Image optimization is limited (no Next.js on-demand image optimization server).

---

## Why Static Export

**Decision:** Use Next.js with `output: 'export'` to produce a static site.

### Benefits

- **Reliability**: fewer moving parts; no runtime server to fail.
- **Cost efficiency**: S3 + CloudFront is typically much cheaper than always-on compute.
- **Security**: smaller attack surface (no server endpoints).
- **Global performance**: CDN edge caching is the default posture.

### Trade-offs

- No runtime server capabilities (SSR, server actions, API routes).
- Some Next.js features are constrained (server-side image optimization, certain dynamic routes).
- Client-side routing and caching strategy must be configured carefully.

---

## Why Next.js (Static Export) Over Pure Vite

**Decision:** Next.js for structure, routing conventions, and ecosystem—while still deploying as static output.

### Why Next.js fits

- **File-based routing** (App Router) gives an opinionated structure that scales cleanly.
- **Built-in code splitting** by route and sensible defaults.
- **Strong ecosystem**: easy integration for i18n, metadata/SEO primitives, and future growth.
- **A “known shape”**: many interviewers and teams recognize the patterns quickly.

### When Vite would be better

- If the site were strictly a single-page app with minimal routing and no content structure.
- If bundle tooling experimentation was the core goal.

### The trade-off I’m choosing

- Next.js adds framework overhead compared to Vite, but the _structure and conventions_ are worth it for a portfolio that should scale with more content (projects, posts, case studies).

---

## Why MUI Over Tailwind

**Decision:** Use **MUI** as the component system, with **Emotion** and theme tokens.

### Why MUI fits this project

- **Accessible components** out of the box (less DIY for a polished baseline).
- **Theme tokens** as a first-class primitive (dark/light mode becomes coherent).
- **Consistent UI velocity**: build professional UI quickly without inventing a design system from scratch.
- **Maintainable styling**: `sx` for most cases; `styled()` for reusable building blocks.

### Trade-offs

- MUI can increase bundle size if used carelessly.
- Requires discipline to avoid importing “the entire UI universe”.

### Mitigations

- Prefer **lean component usage** and avoid rarely used heavy components early.
- Keep design tokens centralized (typography scale, spacing, palette, radii).
- Monitor bundle size continuously (see Bundle Size Goals).

---

## Why Not Micro-Frontends

**Decision:** This is a single cohesive web app. Micro-frontends would be performative complexity.

Micro-frontends make sense when you have:

- Multiple independent teams shipping separate parts of a product.
- Organizational scaling constraints.
- Strict independent deployability requirements.

This site has the opposite constraints:

- One developer.
- One UX.
- One deploy target.
- One performance budget.

**The “senior move” here is restraint**: keep architecture as simple as the domain allows.

---

## Bundle Size and Performance Budgets

Performance is treated as a baseline requirement, not a post-launch optimization.

### Targets

- Lighthouse: **≥ 95** (Performance) on a representative build.
- Keep initial JS small:
  - Avoid heavy dependencies without clear value.
  - Prefer code splitting by route; lazy-load non-critical components.

### Practical approaches

- Use Next.js defaults for code splitting.
- Keep UI library usage disciplined (no “component sprawl”).

---

## i18n Strategy

**Decision:** Support multiple locales with message files loaded per locale to avoid bundling every language into the initial payload.

### Constraints with static export

- Either:
  - Pre-render locale paths (e.g. `/en`, `/pt-BR`, `/es`, `/it`), **or**
  - Pre-render a default locale and switch client-side (less ideal for SEO per locale).

The implementation aims to keep locale loading **predictable and minimal**.

---

## Security & Reliability Posture

- Static hosting reduces runtime risk.
- HTTPS enforced via CloudFront.
- Cache invalidation is part of the delivery workflow.
- Least-privilege IAM for deploy credentials (GitHub Actions).

---

## Observability (Optional / Future)

This repo can evolve to include:

- Web vitals tracking (privacy-conscious)
- Error monitoring
- Lightweight analytics

But those are deliberately not required for the “scaffolding” milestone.

---

## Recruiter AI assistant (Lambda)

The portfolio remains **static-first** (S3 + CloudFront). The recruiter-facing **AI chat** is optional compute on **AWS Lambda** (Function URL with response streaming):

- **Frontend:** `src/features/recruiter-assistant/` — Vercel AI SDK `useChat`; build-time env `NEXT_PUBLIC_RECRUITER_API_URL` (from GitHub Actions variable `RECRUITER_API_URL` in CI).
- **Backend:** `services/recruiter-assistant-api/` — cosine **RAG** over an embeddings JSON index, then **staged chat**: **evidence evaluator** and **evidence analyst** stream inside API **thinking markers**; an optional **interests alignment** step (when a private pack is loaded) runs **server-side only** and is not merged into the stream or pitch; **recruiter pitch** streams after the thinking block closes; **post-stream** structured claim extraction plus embedding match appends `## References`. Embeddings live in **private S3** (or a local path); the OpenAI key comes from **Secrets Manager** (or env locally); AWS bootstrap is **manual** (see `services/recruiter-assistant-api/SETUP.md`).
- **Plan:** [docs/plans/recruiter-assistant-plan.md](./plans/recruiter-assistant-plan.md).

---

## Future Refactor Considerations

Likely future changes as the site grows:

- Extract UI primitives into a small `ui/` layer for reuse (Hero, Section, Container, etc.).
- Add content pipelines (MDX) for posts/case studies if writing becomes a primary channel.
- Introduce bundle regression checks in CI if the dependency surface grows.
- If dynamic content becomes necessary (e.g., contact form with server-side validation):
  - Add a serverless endpoint (Lambda/API Gateway) or external service,
  - Keep the main site static.

---

## Appendix: High-Level System View

See `/docs/diagrams.md` for diagrams:

- CI/CD workflow
- AWS deployment components and benefits
