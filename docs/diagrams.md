# Diagrams

## 1) CI/CD Deployment (GitHub Actions → AWS)

```mermaid
sequenceDiagram
  autonumber
  participant Dev as Developer
  participant GH as GitHub Repo
  participant GA as GitHub Actions (CI/CD)
  participant S3 as S3 (Static Hosting Bucket)
  participant CF as CloudFront (CDN)
  participant R53 as Route 53 (DNS)
  participant User as End User

  Dev->>GH: Push commits / open PR
  GH->>GA: Trigger workflow (PR / main)
  GA->>GA: Install deps
  GA->>GA: Lint + Format check
  GA->>GA: Unit tests (Vitest)
  GA->>GA: E2E smoke (Playwright)
  GA->>GA: Build + Next export (out/)
  GA->>S3: Upload static output (sync out/ → bucket)
  GA->>CF: Invalidate cache (paths or full)
  R53-->>CF: DNS points domain to CloudFront
  User->>CF: Request https://danieltostes.com
  CF->>S3: Fetch cached/missing assets
  CF-->>User: Serve from edge (cached)
```

## 2) S3 + CloudFront + Route 53

```mermaid
flowchart TD

    User[User Browser]

    Route53[Route 53<br/>DNS]
    CloudFront[CloudFront<br/>CDN Distribution]
    S3[(S3 Bucket<br/>Static Files)]
    ACM[ACM<br/>TLS Certificate]

    User -->|DNS Lookup| Route53
    Route53 -->|Alias Record| CloudFront
    CloudFront -->|Origin (cache miss)| S3
    CloudFront -->|HTTPS (TLS)| ACM
    CloudFront -->|Cached Response| User
```

Benefits by component

S3 (Static hosting bucket)
• Extremely durable object storage for static assets.
• Simple deployment model: upload out/ and you’re done.
• Low cost and minimal operational complexity.

CloudFront (CDN)
• Caches content close to users (faster worldwide).
• HTTPS termination at the edge.
• Better security posture (can add WAF later if needed).
• Handles SPA routing patterns (with the right error/redirect config).

Route 53 (DNS)
• Reliable DNS hosting for the custom domain.
• Alias records integrate cleanly with CloudFront.
• Easy management of subdomains (e.g., www, api, static).

ACM (Certificate Manager)
• Managed TLS certificates for HTTPS (typically used by CloudFront).
• Auto-renewal.
