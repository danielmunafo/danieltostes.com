/** Mutable slot for the next chat POST reCAPTCHA token (read by the shared fetch wrapper). */
export const recruiterRecaptchaTokenSlot: { current: string | null } = {
  current: null,
};

let captchaFailedHandler: (() => void) | undefined;

export function setRecruiterCaptchaFailedHandler(
  handler: (() => void) | undefined
): void {
  captchaFailedHandler = handler;
}

export function notifyRecruiterCaptchaFailed(): void {
  captchaFailedHandler?.();
}
