/** Default API base when running `next dev` and no env is set (matches recruiter-assistant-api `PORT`). */
const DEFAULT_LOCAL_RECRUITER_API_BASE_URL = "http://127.0.0.1:3001";

/**
 * Public base URL for the recruiter assistant API (Lambda Function URL or local dev server).
 * In production builds, set `NEXT_PUBLIC_RECRUITER_API_URL` (no trailing slash). In `next dev`,
 * if unset, defaults to the local recruiter-assistant-api dev server.
 */
export function getRecruiterApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_RECRUITER_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const isNextDevelopment = process.env.NODE_ENV === "development";
  if (isNextDevelopment) return DEFAULT_LOCAL_RECRUITER_API_BASE_URL;
  return "";
}
