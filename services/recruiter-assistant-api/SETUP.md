# Recruiter assistant API — AWS setup (manual)

No Terraform: create resources once in the AWS console or with the AWS CLI, then let GitHub Actions deploy code updates via OIDC.

**Prerequisites:** AWS account, GitHub OIDC provider for Actions (already used by site deploy), OpenAI API key.

---

## 1. Embeddings S3 bucket

- Name example: `danieltostes-recruiter-embeddings`
- Block Public Access: **On**
- Versioning: **On** (recommended)
- Default encryption: **SSE-S3**

---

## 1b. Interests pack (optional)

Private JD-vs-preferences rubric for the optional interests evaluator (not in git). Same bucket as embeddings is fine; use a separate object key.

1. Copy `private.example/interests.source.example.md` to `private/interests.source.md` (gitignored) and edit.
2. From `services/recruiter-assistant-api`: `npm run build:interests-pack` — writes `private/interests-pack.<hash>.json`.
3. Upload to S3 if running in Lambda: publish to **`interests-pack.json`** (stable key; CI overwrites when `private/interests.source.md` is present). Set `INTERESTS_PACK_S3_URI` to `s3://YOUR_EMBEDDINGS_BUCKET/interests-pack.json` once. Locally, set `INTERESTS_PACK_JSON_PATH` to the versioned file under `private/`.

For the **JSON shape only** (placeholder criteria, safe to commit), see `private.example/interests-pack.example.json` — you can point `INTERESTS_PACK_JSON_PATH` at it for a smoke test, then switch to your own built pack under `private/`.

If unset or invalid, the API skips the interests stage and behaves as before.

---

## 2. CloudWatch log group

- Log group name: `/aws/lambda/recruiter-assistant-api`
- Retention: **14 days** (or your preference)

---

## 3. Secrets Manager — OpenAI API key

- Create secret with the OpenAI key as either:
  - **Plain string:** `sk-…` (recommended), or
  - **JSON object:** `{"OPENAI_API_KEY":"sk-…"}` (supported when reusing a site-wide secret).
- Note the **secret ARN** (e.g. `arn:aws:secretsmanager:us-east-1:123456789012:secret:...`).

---

## 4. Lambda execution role (`RecruiterAssistantLambdaRole`)

Trust: AWS service `lambda.amazonaws.com`.

Attach **AWS managed policy**: `AWSLambdaBasicExecutionRole` (CloudWatch Logs).

Add **inline policy** (tighten ARNs to your account):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::YOUR_EMBEDDINGS_BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:YOUR_OPENAI_SECRET*"
    }
  ]
}
```

---

## 5. Create the Lambda function

- **Runtime:** Node.js 20.x
- **Architecture:** x86_64 (or arm64 if you build for it)
- **Handler:** for an uploaded `index.cjs` (CommonJS) at the zip root, use **`index.handler`** (export `handler`). The bundle is CJS so the AWS SDK’s Node `require` paths work inside a single esbuild artifact.
- **Memory:** 512 MB (tune after observing latency)
- **Timeout:** 60 s
- **Reserved concurrency:** `5` (cost / abuse ceiling)
- **Environment variables:**

| Name                    | Example                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENAI_SECRET_ARN`     | Secret ARN from step 3                                                                                                                                                            |
| `EMBEDDINGS_S3_URI`     | `s3://YOUR_EMBEDDINGS_BUCKET/embeddings.json` (stable key; CI overwrites this object — see §9)                                                                                    |
| `INTERESTS_PACK_S3_URI` | Optional: `s3://YOUR_EMBEDDINGS_BUCKET/interests-pack.json` (see §1b)                                                                                                             |
| `RECRUITER_CHAT_MODEL`  | Optional: OpenAI chat model id. Default in code is **`gpt-5.4-mini`** (`CHAT_MODEL` in `src/constants.ts`). Set only to override (e.g. pinning or A/B).                           |
| `ALLOWED_ORIGIN`        | Comma-separated, **exact** `Origin` match: prod `https://…` hosts plus local dev `http://localhost:3000` **and** `http://127.0.0.1:3000` if you ever open Next on the loopback IP |
| `RECAPTCHA_SECRET_KEY`  | reCAPTCHA v2 **secret** key for server-side `siteverify` on chat POST. Omit locally to skip verification. Pair with `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` on the Next build (see §8).  |

Do **not** set `OPENAI_API_KEY` in Lambda env (use the secret only).

---

## 6. Function URL (response streaming)

- Enable **Function URL**, Auth type **NONE** (public URL; protection = `ALLOWED_ORIGIN` check in code + rate limit + reserved concurrency).
- **Invoke mode:** **RESPONSE_STREAM**
- **CORS on the Function URL: required** (handler does **not** emit `Access-Control-*` on Lambda — streaming metadata does not reliably reach browsers). Match **`ALLOWED_ORIGIN`** exactly (no `*` in production). Suggested console / CLI settings:

  | Setting        | Value                                                                                                                                      |
  | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
  | Allow origins  | Same comma-separated list as `ALLOWED_ORIGIN` (e.g. `https://dev.danieltostes.com`, `https://danieltostes.com`, local dev hosts if needed) |
  | Allow methods  | `POST`, `OPTIONS`                                                                                                                          |
  | Allow headers  | `content-type`, `authorization`                                                                                                            |
  | Expose headers | `x-vercel-ai-data-stream`                                                                                                                  |
  | Max age        | `86400` (optional)                                                                                                                         |

  Keep handler `ALLOWED_ORIGIN` in sync with Function URL origins. The handler still enforces the allowlist (`403 forbidden_origin`); Function URL CORS only satisfies the browser.

Copy the **Function URL** (e.g. `https://xxxx.lambda-url.us-east-1.on.aws/`).

---

## 7. GitHub Actions role (same as site deploy)

Recruiter CI uses the repository secret **`AWS_ROLE_ARN`** (same OIDC role as `.github/workflows/ci.yml`). If that role already exists for S3/CloudFront deploy, **add** the statements below to its inline policy — no second role or GitHub secret.

Adjust ARNs (both Lambda functions if you use dev + prod, both embeddings buckets):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction"
      ],
      "Resource": [
        "arn:aws:lambda:REGION:ACCOUNT:function:recruiter-assistant-api",
        "arn:aws:lambda:REGION:ACCOUNT:function:recruiter-assistant-api-dev"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::danieltostes-recruiter-embeddings",
        "arn:aws:s3:::danieltostes-recruiter-embeddings/*",
        "arn:aws:s3:::dev.danieltostes-recruiter-embeddings",
        "arn:aws:s3:::dev.danieltostes-recruiter-embeddings/*"
      ]
    }
  ]
}
```

OIDC trust for the repo is unchanged; see [docs/deployment-setup.md](../../docs/deployment-setup.md).

---

## 8. GitHub repository variables

- **`RECRUITER_API_URL`** — full Function URL (no trailing slash). Set on GitHub **environment** `dev` / `production` (or repository secret/variable); the Frontend **build** job uses the same environment as deploy and passes it as `NEXT_PUBLIC_RECRUITER_API_URL` (see `.github/workflows/ci.yml`).
- **`RECAPTCHA_SITE_KEY`** (optional) — reCAPTCHA v2 **site** key; CI passes it as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` when set. Must match `RECAPTCHA_SECRET_KEY` on Lambda.

---

## 9. Build and upload embeddings

From repo root (requires `OPENAI_API_KEY` in the environment):

```bash
cd services/recruiter-assistant-api
npm ci
export OPENAI_API_KEY=sk-...
node scripts/build-embeddings.mjs
```

This writes `services/recruiter-assistant-api/embeddings/embeddings.v<sha>.json` (the `<sha>` changes when corpus text changes).

**Lambda / CI:** set `EMBEDDINGS_S3_URI` once to `s3://YOUR_EMBEDDINGS_BUCKET/embeddings.json`. CI uploads the built file to that **stable** key (and also keeps a versioned copy `embeddings.v<sha>.json` in the bucket for history). You do **not** need to change Lambda env when the corpus changes.

Manual upload (same stable key):

```bash
aws s3 cp embeddings/embeddings.v<sha>.json s3://YOUR_EMBEDDINGS_BUCKET/embeddings.json
```

Re-run whenever portfolio content under `src/messages/**` or `public/content/**` changes.

**Optional interests pack:** after editing `private/interests.source.md`, run `npm run build:interests-pack`, then `aws s3 cp private/interests-pack.<hash>.json s3://YOUR_EMBEDDINGS_BUCKET/interests-pack.json` (Lambda `INTERESTS_PACK_S3_URI` stays fixed). Never commit real rubric text.

---

## 10. Local development

Copy [`.env.example`](./.env.example) to `.env` in this directory and set `OPENAI_API_KEY`, `EMBEDDINGS_JSON_PATH`, and `ALLOWED_ORIGIN` (see comments in the example file). Optionally set `INTERESTS_PACK_JSON_PATH` after `npm run build:interests-pack`. Chat defaults to **`gpt-5.4-mini`**; set `RECRUITER_CHAT_MODEL` only if you need a different model locally or in Lambda.

Terminal A — API (after `npm run build` in `services/recruiter-assistant-api`):

```bash
cd services/recruiter-assistant-api
export OPENAI_API_KEY=sk-...
export EMBEDDINGS_JSON_PATH="$(pwd)/embeddings/embeddings.v....json"
export ALLOWED_ORIGIN=http://localhost:3000
npm run dev
```

Terminal B — Next site:

```bash
export NEXT_PUBLIC_RECRUITER_API_URL=http://127.0.0.1:3001
# Optional — root `.env.local` for the site key; API `.env.local` for RECAPTCHA_SECRET_KEY
# export NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
# export RECAPTCHA_SECRET_KEY=...
npm run dev
```

---

## CI

- **`.github/workflows/recruiter-api.yml`** — on changes under `services/recruiter-assistant-api/**`: test, bundle; **deploy** and **embeddings** on same-repo PRs (`dev` environment) and `main` (`production`), matching `.github/workflows/ci.yml`.
- Embeddings CI publishes to **`embeddings.json`** (stable) plus a versioned `embeddings.v<sha>.json` in `RECRUITER_EMBEDDINGS_BUCKET` per environment. Interests pack uses **`interests-pack.json`** when `private/interests.source.md` exists in the runner (typically manual upload only; source is gitignored).
- Repository secrets **`AWS_ROLE_ARN`** (shared with site CI), **`OPENAI_API_KEY`**; per-environment secrets **`LAMBDA_FUNCTION_NAME`**, **`RECRUITER_EMBEDDINGS_BUCKET`**.

---

## Troubleshooting

### Browser shows “CORS error” (no headers, blocked request, or duplicate `access-control-allow-origin`)

| Symptom                                 | Fix                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| No `access-control-*` on the response   | **Enable** Function URL CORS (§6). Do not rely on handler headers on Lambda.                                                                 |
| Two `access-control-allow-origin` lines | Redeployed an old bundle that still set handler CORS on Lambda — current code omits them; redeploy latest `recruiter-api` workflow artifact. |
| `403` / `forbidden_origin` in JSON      | Add the exact browser `Origin` to **both** `ALLOWED_ORIGIN` and Function URL allow origins.                                                  |

CloudWatch shows only `START` / `END` (~300–500 ms) with no `recruiter-api` logs: often an **`OPTIONS` preflight** answered at the edge (no handler logs) or a request rejected before OpenAI/RAG. Confirm the failing row in DevTools is **OPTIONS** vs **POST**.

Confirm `ALLOWED_ORIGIN` includes the **exact** browser origin (e.g. `https://dev.danieltostes.com`, not a trailing slash or `www` variant unless you use that host).

### CloudWatch: `interestsPack` / `S3 load failed` / `NotFound`

The interests stage is optional. This happens when `INTERESTS_PACK_S3_URI` (or bucket/key env vars) is set but `interests-pack.json` is missing in that bucket (CI skips upload when `private/interests.source.md` is absent). Either upload the pack (§1b), or **unset** the interests env vars on that Lambda so the API does not call S3. Chat should still complete; only the private interests evaluator is skipped.

---

## References

- Canonical design: [docs/plans/recruiter-assistant-plan.md](../../docs/plans/recruiter-assistant-plan.md)
