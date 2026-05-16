/** Build-time site key for reCAPTCHA v2 (checkbox + invisible). Empty = captcha disabled. */
export function getRecruiterRecaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
}

export function isRecruiterRecaptchaConfigured(): boolean {
  return getRecruiterRecaptchaSiteKey().length > 0;
}
