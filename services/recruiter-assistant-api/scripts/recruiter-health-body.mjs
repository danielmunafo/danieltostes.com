/** JSON body for `GET /health` (local dev server). */
export function buildRecruiterHealthBody() {
  const isRecaptchaVerificationEnabled = Boolean(
    process.env.RECAPTCHA_SECRET_KEY?.trim()
  );
  return {
    ok: true,
    recaptchaVerification: isRecaptchaVerificationEnabled
      ? "enabled"
      : "disabled",
  };
}
