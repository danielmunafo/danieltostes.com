# Design Principles

Guiding principles for this repository. For technical reasoning (e.g. why Next.js, why MUI), see [architecture.md](./architecture.md).

---

## 1. Static-First

The deployment target is S3 + CloudFront.  
This eliminates runtime infrastructure, reduces operational risk, and keeps cost predictable.

Dynamic capability is intentionally constrained.

## 2. Performance as Baseline

Lighthouse target: **≥ 95**

Performance is treated as a requirement, not an afterthought.

- Small initial JavaScript
- Route-based code splitting
- Minimal dependency surface

## 3. Explicit Trade-offs

Framework and tooling choices are documented.

Complexity must justify itself.

Micro-frontends, SSR servers, and dynamic infrastructure were intentionally excluded.

## 4. Maintainability Over Novelty

The structure favors clarity and conventions over experimentation.

Future growth is possible, but not assumed.
