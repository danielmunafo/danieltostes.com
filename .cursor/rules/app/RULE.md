## Scope

This RULE file governs the **Next.js app shell and routing**, including:

- `src/app/**`
- App Router layouts, pages, and route groups
- Static export configuration (`output: "export"`) and related constraints

## Key constraints

- **Static export only**: No runtime server features (no API routes, server actions, or SSR-only APIs).
- **SPA behavior**: Treat the app as a client-side rendered SPA hosted from static files.
- **Routing**: Use the App Router with simple, SEO-friendly paths; avoid deeply nested, fragile route structures.
- **Bundle discipline**: Keep route-level code lean; avoid importing heavy modules into the root layout.
- **Environment assumptions**: Assume S3 + CloudFront hosting; redirect/404 behavior must work with static hosting.

## Common tasks

- **Add a new route**
  - Place the route under `src/app/<route>/page.tsx`.
  - Keep the page focused; delegate UI to components in `src/components/`.
  - Ensure the route works with static export (no runtime-only dependencies).

- **Update layout or metadata**
  - Edit layout components in `src/app/(...)/layout.tsx`.
  - Keep cross-cutting UI primitives in shared components rather than inlining complex logic in layouts.

## Examples

**Static-export friendly — locale from segment, no server APIs:**

```ts
// getRequestConfig receives locale from the [locale] segment (build-time).
const locale = await getLocale(); // from params or config, not headers()
const messages = (await import(`@/messages/${locale}.json`)).default;
return { messages, locale };
```

**Breaks static export — server-only or runtime detection:**

```ts
// BAD: headers() is undefined at build time; static export fails or skips.
const locale = headers().get("x-next-intl-locale") ?? "en";

// BAD: API route or server action — not available with output: 'export'.
export async function GET() { return Response.json({ ... }); }
```

Use explicit `[locale]` in the path and `generateStaticParams` (or equivalent) so every locale is pre-rendered; do not depend on `headers()`, `cookies()`, or server-only APIs in app router code that runs during the export.

## Gotchas

- Do **not** rely on Node-only or server-only APIs in app router code that participates in static export.
- Avoid runtime locale detection that would break pre-rendered locale paths; use explicit locale segments instead.
- Remember that SPA-style routing still needs to be compatible with S3/CloudFront error and redirect rules.
