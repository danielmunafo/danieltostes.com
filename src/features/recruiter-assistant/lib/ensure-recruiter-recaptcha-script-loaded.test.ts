import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureRecruiterRecaptchaScriptLoaded } from "./ensure-recruiter-recaptcha-script-loaded";

describe("ensureRecruiterRecaptchaScriptLoaded", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as { grecaptcha?: { render?: unknown } }).grecaptcha;
  });

  it("resolves immediately when grecaptcha is ready", async () => {
    (window as { grecaptcha?: { render?: unknown } }).grecaptcha = {
      render: () => 0,
    };

    await expect(
      ensureRecruiterRecaptchaScriptLoaded()
    ).resolves.toBeUndefined();
  });

  it("resolves after grecaptcha becomes available", async () => {
    const promise = ensureRecruiterRecaptchaScriptLoaded();

    vi.advanceTimersByTime(100);
    (window as { grecaptcha?: { render?: unknown } }).grecaptcha = {
      render: () => 0,
    };
    vi.advanceTimersByTime(100);

    await expect(promise).resolves.toBeUndefined();
  });
});
