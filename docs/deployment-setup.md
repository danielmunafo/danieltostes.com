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

## AWS Infrastructure Requirements

### S3 Buckets

Create two S3 buckets:

1. **Dev bucket** (e.g., `danieltostes-dev`)
   - Configure for static website hosting
   - Block public access (CloudFront will access it)

2. **Production bucket** (e.g., `danieltostes-com`)
   - Configure for static website hosting
   - Block public access (CloudFront will access it)

### CloudFront Distributions

Create two CloudFront distributions:

1. **Dev distribution**
   - Origin: Dev S3 bucket
   - Default root object: `index.html`
   - Error pages configured for SPA routing (404 → /index.html)

2. **Production distribution**
   - Origin: Production S3 bucket
   - Custom domain (e.g., `danieltostes.com`)
   - TLS certificate from ACM
   - Default root object: `index.html`
   - Error pages configured for SPA routing (404 → /index.html)

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
