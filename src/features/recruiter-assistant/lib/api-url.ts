/** Default API base when running `next dev` and no env is set (matches recruiter-assistant-api `PORT`). */
const DEFAULT_LOCAL_RECRUITER_API_BASE_URL = "http://127.0.0.1:3001";

/**
 * Public base URL for the recruiter assistant API (Lambda Function URL or local dev server).
 *
 * Static export: `NEXT_PUBLIC_RECRUITER_API_URL` is inlined at **build** time. In CI, set GitHub
 * variable `RECRUITER_API_URL` (see `.github/workflows/ci.yml`). Locally: root `.env.local` or
 * `next dev` default `127.0.0.1:3001`.
 */
export function getRecruiterApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_RECRUITER_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const isNextDevelopment = process.env.NODE_ENV === "development";
  if (isNextDevelopment) return DEFAULT_LOCAL_RECRUITER_API_BASE_URL;
  return "";
}
