export const RECRUITER_CHAT_RECAPTCHA_BODY_FIELD = "recaptchaToken" as const;

export function mergeRecruiterChatRequestBody(
  rawBody: string,
  recaptchaToken: string | null | undefined
): string {
  if (!recaptchaToken?.trim()) {
    return rawBody;
  }
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  return JSON.stringify({
    ...parsed,
    [RECRUITER_CHAT_RECAPTCHA_BODY_FIELD]: recaptchaToken.trim(),
  });
}
