"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type MutableRefObject } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
  RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
} from "../constants/recruiter-assistant";

interface AssistantCheckboxRecaptchaProps {
  readonly recaptchaRef: MutableRefObject<ReCAPTCHA | null>;
  readonly sitekey: string;
  readonly onChange: (token: string | null) => void;
  readonly onExpired?: () => void;
  readonly onErrored?: () => void;
}

export function AssistantCheckboxRecaptcha({
  recaptchaRef,
  sitekey,
  onChange,
  onExpired,
  onErrored,
}: AssistantCheckboxRecaptchaProps) {
  const t = useTranslations("RecruiterAssistant");
  const [isWidgetLoading, setIsWidgetLoading] = useState(true);

  const markWidgetReady = useCallback(() => {
    requestAnimationFrame(() => {
      setIsWidgetLoading(false);
    });
  }, []);

  const handleScriptLoad = useCallback(() => {
    markWidgetReady();
  }, [markWidgetReady]);

  const handleErrored = useCallback(() => {
    setIsWidgetLoading(false);
    onErrored?.();
  }, [onErrored]);

  useEffect(() => {
    const isWindowUndefined = typeof window === "undefined";
    if (isWindowUndefined) {
      return;
    }
    const grecaptcha = (window as { grecaptcha?: { render?: unknown } })
      .grecaptcha;
    if (typeof grecaptcha?.render === "function") {
      markWidgetReady();
    }
  }, [markWidgetReady, sitekey]);

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        py: 1,
      }}
    >
      {isWidgetLoading ? (
        <Skeleton
          variant="rounded"
          width={RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX}
          height={RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX}
          animation="wave"
          aria-busy
          aria-label={t("captchaLoading")}
          sx={{
            borderRadius: 1,
            maxWidth: "100%",
          }}
        />
      ) : null}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          ...(isWidgetLoading
            ? {
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
              }
            : {}),
        }}
        aria-hidden={isWidgetLoading}
      >
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={sitekey}
          onChange={onChange}
          onExpired={onExpired}
          onErrored={handleErrored}
          asyncScriptOnLoad={handleScriptLoad}
        />
      </Box>
    </Box>
  );
}
