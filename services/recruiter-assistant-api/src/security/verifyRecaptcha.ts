const RECAPTCHA_SITE_VERIFY_URL =
  "https://www.google.com/recaptcha/api/siteverify" as const;

export type VerifyRecaptchaResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function isRecaptchaVerificationEnabled(): boolean {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}

function getRecaptchaSecretKey(): string | undefined {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  return secret || undefined;
}

type SiteVerifyResponse = {
  readonly success?: boolean;
  readonly "error-codes"?: string[];
};

export type VerifyRecaptchaParams = {
  readonly token: string | undefined;
  readonly remoteIp: string | undefined;
  readonly fetchImpl?: typeof fetch;
};

/**
 * Verifies a reCAPTCHA v2 response token with Google siteverify.
 * When `RECAPTCHA_SECRET_KEY` is unset, verification is skipped (local dev).
 */
export async function verifyRecaptcha({
  token,
  remoteIp,
  fetchImpl = fetch,
}: VerifyRecaptchaParams): Promise<VerifyRecaptchaResult> {
  const secret = getRecaptchaSecretKey();
  if (!secret) {
    return { ok: true };
  }

  const trimmedToken = token?.trim();
  if (!trimmedToken) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({
    secret,
    response: trimmedToken,
  });
  if (remoteIp?.trim()) {
    body.set("remoteip", remoteIp.trim());
  }

  let response: Response;
  try {
    response = await fetchImpl(RECAPTCHA_SITE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    return { ok: false, reason: "siteverify_unreachable" };
  }

  if (!response.ok) {
    return { ok: false, reason: "siteverify_http_error" };
  }

  let payload: SiteVerifyResponse;
  try {
    payload = (await response.json()) as SiteVerifyResponse;
  } catch {
    return { ok: false, reason: "siteverify_invalid_json" };
  }

  if (payload.success === true) {
    return { ok: true };
  }

  const errorCodes = payload["error-codes"]?.join(",") ?? "unknown";
  return { ok: false, reason: `siteverify_failed:${errorCodes}` };
}
