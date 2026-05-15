# Deployment Setup Guide

This document describes how to configure GitHub Actions to deploy to both dev and production environments.

## Overview

The CI/CD workflow (`.github/workflows/ci.yml`) automatically deploys to two environments:

- **dev**: Deployed on pull requests for preview and testing
- **production**: Deployed on merge to `main`

## GitHub Environment Configuration

### 1. Create GitHub Environments

Go to **Settings → Environments** in your GitHub repository and create two environments:

1. **dev**
   - No protection rules needed (auto-deploy on PRs)
2. **production**
   - Optional: Add protection rules
   - Example: Require manual approval before deployment
   - Example: Restrict to `main` branch only

### 2. Configure Environment Secrets

For **each environment** (dev and production), add the following secrets:

#### Required Secrets per Environment

Navigate to **Settings → Environments → [environment-name] → Environment secrets**:

| Secret Name                  | Description                                     | Example                                  |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `AWS_S3_BUCKET`              | S3 bucket name for this environment             | `danieltostes-dev` or `danieltostes-com` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID for this environment | `E1234ABCD5678`                          |

#### Repository-Level Secret

Navigate to **Settings → Secrets and variables → Actions → Repository secrets**:

| Secret Name    | Description                          | Example                                            |
| -------------- | ------------------------------------ | -------------------------------------------------- |
| `AWS_ROLE_ARN` | IAM role ARN for OIDC authentication | `arn:aws:iam::123456789012:role/GitHubActionsRole` |

> **Note:** The `AWS_ROLE_ARN` is shared across both environments. If you need separate roles per environment, you can also configure this as an environment secret instead.

### Recruiter assistant (optional)

Add a **repository variable** (Settings → Secrets and variables → Actions → Variables):

| Variable Name       | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `RECRUITER_API_URL` | Lambda Function URL (no trailing slash). Baked into static `out/` as `NEXT_PUBLIC_RECRUITER_API_URL`. |

After adding or changing it, re-run the **CI** workflow (site build + deploy), not only Recruiter API.

For the API deploy workflow and embeddings upload secrets, see [services/recruiter-assistant-api/SETUP.md](../services/recruiter-assistant-api/SETUP.md).

## AWS Infrastructure Requirements

### S3 Buckets

Create two S3 buckets:

1. **Dev bucket** (e.g., `danieltostes-dev`)
   - Configure for static website hosting
   - Either: block public access and use a bucket policy that allows only CloudFront (OAC), or allow public read so objects are publicly readable (e.g. via bucket policy or object ACLs)

2. **Production bucket** (e.g., `danieltostes-com`)
   - Configure for static website hosting
   - Same choice as dev: private bucket + CloudFront-only policy, or public read

**Bucket policy:** To let CloudFront read objects, attach a bucket policy that allows the CloudFront distribution via **Origin Access Control (OAC)**. In the S3 bucket → Permissions → Bucket policy, add a statement that allows `s3:GetObject` for the CloudFront distribution’s OAC **Private bucket (recommended):** use the policy snippet AWS suggests when you create/edit the OAC. **Public objects:** you can instead allow public `s3:GetObject` in the bucket policy; objects do not need an ACL. Without a policy that grants access (to CloudFront or to the public), CloudFront or direct access gets 403.

### CloudFront Distributions

Create two CloudFront distributions:

1. **Dev distribution**
   - Origin: Dev S3 bucket (use **Origin Access Control**, not “Origin access identity (legacy)”)
   - Default root object: `index.html`
   - **Custom error pages (required for SPA/locale paths):** In the distribution, add two custom error responses so paths like `/en` or `/pt-BR` are handled by the app instead of 403/404 from S3: **403 Forbidden** → HTTP 200, response page `/index.html`; **404 Not Found** → HTTP 200, response page `/index.html`.

2. **Production distribution**
   - Origin: Production S3 bucket (use **Origin Access Control**)
   - Custom domain (e.g., `danieltostes.com`)
   - TLS certificate from ACM
   - Default root object: `index.html`
   - Same custom error pages as dev: 403 and 404 → 200 with `/index.html`.

## Testing the Setup

1. **Test dev deployment:**
   - Create a pull request
   - Verify the workflow runs and deploys to dev
   - Check the dev CloudFront URL to see your changes

2. **Test production deployment:**
   - Merge the PR to `main`
   - Verify the workflow runs and deploys to production
   - Check the production URL (your custom domain)

## Troubleshooting

### Deployment fails with "Access Denied"

- Verify the IAM role ARN is correct
- Check the role's trust relationship includes your repository
- Ensure the role has permissions for both S3 buckets and CloudFront distributions

### Changes not visible after deployment

- CloudFront cache may need time to invalidate (typically < 1 minute)
- Check the CloudFront invalidation status in AWS Console
- Try accessing the CloudFront distribution URL directly (bypass Route 53)

### Environment secrets not found

- Ensure secrets are added to the **environment** (dev/production), not just repository secrets
- Check the environment names match exactly: `dev` and `production`

## Future considerations

Deploying the S3 buckets, CloudFront distributions, and related AWS resources via **Terraform** (or another IaC tool) would allow provisioning and updates on demand, version-controlled and repeatable. That approach is not in scope for this project; this guide assumes resources are created and configured manually in the AWS Console.
