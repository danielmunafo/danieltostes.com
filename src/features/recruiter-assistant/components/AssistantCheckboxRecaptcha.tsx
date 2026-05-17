"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
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

function isRecaptchaIframePainted(container: HTMLElement | null): boolean {
  const iframe = container?.querySelector("iframe");
  return Boolean(iframe && iframe.offsetHeight > 0);
}

export function AssistantCheckboxRecaptcha(
  props: AssistantCheckboxRecaptchaProps
) {
  return <AssistantCheckboxRecaptchaInner key={props.sitekey} {...props} />;
}

function AssistantCheckboxRecaptchaInner({
  recaptchaRef,
  sitekey,
  onChange,
  onExpired,
  onErrored,
}: AssistantCheckboxRecaptchaProps) {
  const t = useTranslations("RecruiterAssistant");
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const [isWidgetPainted, setIsWidgetPainted] = useState(false);
  const paintPollFrameRef = useRef<number | null>(null);

  const stopPaintPoll = useCallback(() => {
    if (paintPollFrameRef.current !== null) {
      cancelAnimationFrame(paintPollFrameRef.current);
      paintPollFrameRef.current = null;
    }
  }, []);

  const startPaintPoll = useCallback(() => {
    stopPaintPoll();
    const poll = () => {
      if (isRecaptchaIframePainted(captchaContainerRef.current)) {
        setIsWidgetPainted(true);
        stopPaintPoll();
        return;
      }
      paintPollFrameRef.current = requestAnimationFrame(poll);
    };
    paintPollFrameRef.current = requestAnimationFrame(poll);
  }, [stopPaintPoll]);

  useEffect(() => {
    startPaintPoll();
    return stopPaintPoll;
  }, [startPaintPoll, stopPaintPoll]);

  const handleScriptLoad = useCallback(() => {
    startPaintPoll();
  }, [startPaintPoll]);

  const handleErrored = useCallback(() => {
    stopPaintPoll();
    setIsWidgetPainted(true);
    onErrored?.();
  }, [onErrored, stopPaintPoll]);

  return (
    <Box
      sx={{
        position: "relative",
        width: RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
        maxWidth: "100%",
        height: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        flexShrink: 0,
      }}
    >
      {!isWidgetPainted ? (
        <Skeleton
          variant="rounded"
          width="100%"
          height={RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX}
          animation="wave"
          aria-busy
          aria-label={t("captchaLoading")}
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />
      ) : null}
      <Box
        ref={captchaContainerRef}
        sx={{
          width: "100%",
          height: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          visibility: isWidgetPainted ? "visible" : "hidden",
        }}
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
