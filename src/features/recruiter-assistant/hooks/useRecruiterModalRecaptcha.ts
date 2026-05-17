import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type ReCAPTCHA from "react-google-recaptcha";
import { RECRUITER_RECAPTCHA_TOKEN_TTL_MS } from "../constants/recruiter-assistant";

type UseRecruiterModalRecaptchaParams = {
  readonly termsRecaptchaRef: RefObject<ReCAPTCHA | null>;
  readonly captchaModalRecaptchaRef: RefObject<ReCAPTCHA | null>;
};

export function useRecruiterModalRecaptcha({
  termsRecaptchaRef,
  captchaModalRecaptchaRef,
}: UseRecruiterModalRecaptchaParams) {
  const [token, setToken] = useState<string | null>(null);
  const [expiredVisible, setExpiredVisible] = useState(false);
  const expiryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimeoutRef.current) {
      clearTimeout(expiryTimeoutRef.current);
      expiryTimeoutRef.current = null;
    }
  }, []);

  const resetWidget = useCallback(() => {
    termsRecaptchaRef.current?.reset();
    captchaModalRecaptchaRef.current?.reset();
  }, [captchaModalRecaptchaRef, termsRecaptchaRef]);

  const reset = useCallback(() => {
    clearExpiryTimer();
    setToken(null);
    setExpiredVisible(false);
    resetWidget();
  }, [clearExpiryTimer, resetWidget]);

  const onExpired = useCallback(() => {
    clearExpiryTimer();
    setToken(null);
    setExpiredVisible(true);
    resetWidget();
  }, [clearExpiryTimer, resetWidget]);

  const onChange = useCallback(
    (value: string | null) => {
      clearExpiryTimer();
      if (!value) {
        setToken(null);
        return;
      }
      setExpiredVisible(false);
      setToken(value);
      expiryTimeoutRef.current = setTimeout(
        onExpired,
        RECRUITER_RECAPTCHA_TOKEN_TTL_MS
      );
    },
    [clearExpiryTimer, onExpired]
  );

  useEffect(() => clearExpiryTimer, [clearExpiryTimer]);

  return {
    token,
    expiredVisible,
    onChange,
    onExpired,
    reset,
  };
}
