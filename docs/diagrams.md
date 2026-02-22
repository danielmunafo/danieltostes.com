# Diagrams

## 1) CI/CD Deployment (GitHub Actions → AWS)

```mermaid
sequenceDiagram
  autonumber
  participant Dev as Developer
  participant GH as GitHub Repo
  participant GA as GitHub Actions (CI/CD)
  participant S3Dev as S3 Dev Bucket
  participant S3Prod as S3 Production Bucket
  participant CFDev as CloudFront Dev
  participant CFProd as CloudFront Production
  participant R53 as Route 53 (DNS)
  participant User as End User

  Dev->>GH: Open PR
  GH->>GA: Trigger workflow (PR)
  GA->>GA: Install deps
  GA->>GA: Lint + Format check
  GA->>GA: Unit tests (Vitest)
  GA->>GA: Build + Next export (out/)
  GA->>GA: E2E smoke (Playwright)
  GA->>GA: Upload out/ artifact
  Note over GA: Lighthouse CI job runs in parallel (build, then assert ≥95)
  GA->>S3Dev: Upload to dev (sync out/ → dev bucket)
  GA->>CFDev: Invalidate dev cache

  Dev->>GH: Merge PR to main
  GH->>GA: Trigger workflow (main)
  GA->>GA: Install deps
  GA->>GA: Lint + Format check
  GA->>GA: Unit tests (Vitest)
  GA->>GA: Build + Next export (out/)
  GA->>GA: E2E smoke (Playwright)
  GA->>GA: Upload out/ artifact
  Note over GA: Lighthouse CI job runs in parallel (build, then assert ≥95)
  GA->>S3Prod: Upload to production (sync out/ → prod bucket)
  GA->>CFProd: Invalidate production cache

  R53-->>CFProd: DNS points domain to CloudFront
  User->>CFProd: Request https://danieltostes.com
  CFProd->>S3Prod: Fetch cached/missing assets
  CFProd-->>User: Serve from edge (cached)
```

## 2) S3 + CloudFront + Route 53 (Multi-Environment)

```mermaid
flowchart TD

    User[User Browser]
    DevUser[Developer/Reviewer]

    subgraph DNS
        Route53[Route 53]
    end

    subgraph Production
        CloudFrontProd[CloudFront Production]
        S3Prod[(S3 Production Bucket)]
    end

    subgraph Development
        CloudFrontDev[CloudFront Dev]
        S3Dev[(S3 Dev Bucket)]
    end

    ACM[AWS Certificate Manager]

    User -->|DNS Lookup| Route53
    Route53 -->|Alias Record| CloudFrontProd
    CloudFrontProd -->|Origin Fetch| S3Prod
    CloudFrontProd -->|TLS Certificate| ACM
    CloudFrontProd -->|Cached Response| User

    DevUser -->|Preview URL| CloudFrontDev
    CloudFrontDev -->|Origin Fetch| S3Dev
    CloudFrontDev -->|TLS Certificate| ACM
    CloudFrontDev -->|Cached Response| DevUser
```

### Deployment Environments

**Production**

- Deployed on merge to `main`
- Custom domain via Route 53
- Production S3 bucket and CloudFront distribution

**Development**

- Deployed on pull requests
- Preview URL for testing before merge
- Separate dev S3 bucket and CloudFront distribution

### Benefits by component

**S3 (Static hosting bucket)**
• Extremely durable object storage for static assets.
• Simple deployment model: upload out/ and you're done.
• Low cost and minimal operational complexity.
• Isolated buckets per environment for safe testing.

**CloudFront (CDN)**
• Caches content close to users (faster worldwide).
• HTTPS termination at the edge.
• Better security posture (can add WAF later if needed).
• Handles SPA routing patterns (with the right error/redirect config).
• Separate distributions per environment for independent cache control.

**Route 53 (DNS)**
• Reliable DNS hosting for the custom domain.
• Alias records integrate cleanly with CloudFront.
• Easy management of subdomains (e.g., www, api, static).
• Production domain points to production CloudFront only.

**ACM (Certificate Manager)**
• Managed TLS certificates for HTTPS (typically used by CloudFront).
• Auto-renewal.
• Used by both dev and production distributions.
