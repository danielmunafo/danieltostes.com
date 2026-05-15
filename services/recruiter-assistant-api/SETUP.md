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
3. Upload the JSON to S3 if running in Lambda; set `INTERESTS_PACK_S3_URI` or `INTERESTS_PACK_S3_BUCKET` + `INTERESTS_PACK_S3_KEY`. Locally, set `INTERESTS_PACK_JSON_PATH` to the file path.

For the **JSON shape only** (placeholder criteria, safe to commit), see `private.example/interests-pack.example.json` — you can point `INTERESTS_PACK_JSON_PATH` at it for a smoke test, then switch to your own built pack under `private/`.

If unset or invalid, the API skips the interests stage and behaves as before.

---

## 2. CloudWatch log group

- Log group name: `/aws/lambda/recruiter-assistant-api`
- Retention: **14 days** (or your preference)

---

## 3. Secrets Manager — OpenAI API key

- Create secret (plain string) with the OpenAI key.
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
| `EMBEDDINGS_S3_URI`     | `s3://YOUR_EMBEDDINGS_BUCKET/embeddings.vYOURVERSION.json`                                                                                                                        |
| `INTERESTS_PACK_S3_URI` | Optional: `s3://YOUR_EMBEDDINGS_BUCKET/interests-pack.HASH.json` (see §1b)                                                                                                        |
| `ALLOWED_ORIGIN`        | Comma-separated, **exact** `Origin` match: prod `https://…` hosts plus local dev `http://localhost:3000` **and** `http://127.0.0.1:3000` if you ever open Next on the loopback IP |

Do **not** set `OPENAI_API_KEY` in Lambda env (use the secret only).

---

## 6. Function URL (response streaming)

- Enable **Function URL**, Auth type **NONE** (public URL; protection = CORS + rate limit + reserved concurrency).
- **Invoke mode:** **RESPONSE_STREAM**
- **CORS:** allow the same origins as `ALLOWED_ORIGIN` (no `*` in production).

Copy the **Function URL** (e.g. `https://xxxx.lambda-url.us-east-1.on.aws/`).

---

## 7. GitHub Actions deploy role (`RecruiterApiDeployRole`)

Trust policy (replace `OWNER/REPO`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:*"
        }
      }
    }
  ]
}
```

Inline policy (adjust ARNs):

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
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:recruiter-assistant-api"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::YOUR_EMBEDDINGS_BUCKET",
        "arn:aws:s3:::YOUR_EMBEDDINGS_BUCKET/*"
      ]
    }
  ]
}
```

Add GitHub secret **`AWS_RECRUITER_API_ROLE_ARN`** with this role’s ARN.

---

## 8. GitHub repository variables

- **`RECRUITER_API_URL`** — full Function URL (no trailing slash).  
  The site workflow passes it to the Next build as `NEXT_PUBLIC_RECRUITER_API_URL` (see `.github/workflows/ci.yml`).

---

## 9. Build and upload embeddings

From repo root (requires `OPENAI_API_KEY` in the environment):

```bash
cd services/recruiter-assistant-api
npm ci
export OPENAI_API_KEY=sk-...
node scripts/build-embeddings.mjs
```

This writes `services/recruiter-assistant-api/embeddings/embeddings.v<sha>.json`.

Upload to S3:

```bash
aws s3 cp embeddings/embeddings.v<sha>.json s3://YOUR_EMBEDDINGS_BUCKET/
```

Update the Lambda env var `EMBEDDINGS_S3_URI` to `s3://YOUR_EMBEDDINGS_BUCKET/embeddings.v<sha>.json` (or use `EMBEDDINGS_S3_BUCKET` + `EMBEDDINGS_S3_KEY` instead; the handler supports both styles).

Re-run this whenever portfolio content under `src/messages/**` or `public/content/**` changes.

**Optional interests pack:** after editing `private/interests.source.md`, run `npm run build:interests-pack`, then `aws s3 cp private/interests-pack.<hash>.json s3://YOUR_EMBEDDINGS_BUCKET/` and set `INTERESTS_PACK_S3_URI` on the Lambda. Never commit real rubric text.

---

## 10. Local development

Copy [`.env.example`](./.env.example) to `.env` in this directory and set `OPENAI_API_KEY`, `EMBEDDINGS_JSON_PATH`, and `ALLOWED_ORIGIN` (see comments in the example file). Optionally set `INTERESTS_PACK_JSON_PATH` after `npm run build:interests-pack`.

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
npm run dev
```

---

## CI

- **`.github/workflows/recruiter-api.yml`** — on changes under `services/recruiter-assistant-api/**`: test, bundle, and on `main` push update Lambda code via `aws lambda update-function-code`.
- **`OPENAI_API_KEY`** for the embeddings job should be stored as a GitHub **Actions secret** if you automate `build-embeddings` in CI (optional `workflow_dispatch` job).

---

## References

- Canonical design: [docs/plans/recruiter-assistant-plan.md](../../docs/plans/recruiter-assistant-plan.md)
