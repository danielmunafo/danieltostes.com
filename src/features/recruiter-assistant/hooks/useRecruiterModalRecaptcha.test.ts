import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import type ReCAPTCHA from "react-google-recaptcha";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECRUITER_RECAPTCHA_TOKEN_TTL_MS } from "../constants/recruiter-assistant";
import { useRecruiterModalRecaptcha } from "./useRecruiterModalRecaptcha";

describe("useRecruiterModalRecaptcha", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears token and shows expired hint after TTL", () => {
    const termsRecaptchaRef = createRef<ReCAPTCHA | null>();
    const captchaModalRecaptchaRef = createRef<ReCAPTCHA | null>();
    const reset = vi.fn();
    termsRecaptchaRef.current = { reset } as unknown as ReCAPTCHA;

    const { result } = renderHook(() =>
      useRecruiterModalRecaptcha({
        termsRecaptchaRef,
        captchaModalRecaptchaRef,
      })
    );

    act(() => {
      result.current.onChange("token-abc");
    });
    expect(result.current.token).toBe("token-abc");
    expect(result.current.expiredVisible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(RECRUITER_RECAPTCHA_TOKEN_TTL_MS);
    });

    expect(result.current.token).toBeNull();
    expect(result.current.expiredVisible).toBe(true);
    expect(reset).toHaveBeenCalled();
  });

  it("clears expiry timer on reset", () => {
    const termsRecaptchaRef = createRef<ReCAPTCHA | null>();
    const captchaModalRecaptchaRef = createRef<ReCAPTCHA | null>();

    const { result } = renderHook(() =>
      useRecruiterModalRecaptcha({
        termsRecaptchaRef,
        captchaModalRecaptchaRef,
      })
    );

    act(() => {
      result.current.onChange("token-abc");
      result.current.reset();
    });

    act(() => {
      vi.advanceTimersByTime(RECRUITER_RECAPTCHA_TOKEN_TTL_MS);
    });

    expect(result.current.expiredVisible).toBe(false);
    expect(result.current.token).toBeNull();
  });
});
