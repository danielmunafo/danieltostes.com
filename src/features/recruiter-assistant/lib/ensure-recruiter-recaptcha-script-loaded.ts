const RECAPTCHA_SCRIPT_READY_POLL_MS = 32;
const RECAPTCHA_SCRIPT_READY_TIMEOUT_MS = 15_000;

type GrecaptchaWindow = Window & {
  grecaptcha?: { render?: unknown };
};

function isRecruiterRecaptchaScriptReady(): boolean {
  const isWindowUndefined = typeof window === "undefined";
  if (isWindowUndefined) {
    return true;
  }
  return typeof (window as GrecaptchaWindow).grecaptcha?.render === "function";
}

/** Resolves when `grecaptcha.render` is available (hidden preload or prior modal). */
export function ensureRecruiterRecaptchaScriptLoaded(): Promise<void> {
  if (isRecruiterRecaptchaScriptReady()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const deadlineMs = Date.now() + RECAPTCHA_SCRIPT_READY_TIMEOUT_MS;

    const poll = () => {
      if (isRecruiterRecaptchaScriptReady() || Date.now() >= deadlineMs) {
        resolve();
        return;
      }
      window.setTimeout(poll, RECAPTCHA_SCRIPT_READY_POLL_MS);
    };

    poll();
  });
}
