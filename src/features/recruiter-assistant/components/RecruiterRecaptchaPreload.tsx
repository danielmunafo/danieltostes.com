"use client";

import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import {
  RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
  RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
} from "../constants/recruiter-assistant";
import { ensureRecruiterRecaptchaScriptLoaded } from "../lib/ensure-recruiter-recaptcha-script-loaded";
import { getRecruiterRecaptchaSiteKey } from "../lib/recaptcha-site-key";

const RECAPTCHA_ORIGINS = [
  "https://www.google.com",
  "https://www.gstatic.com",
] as const;

function ensureRecaptchaPreconnectHints(): void {
  const isDocumentUndefined = typeof document === "undefined";
  if (isDocumentUndefined) {
    return;
  }
  for (const origin of RECAPTCHA_ORIGINS) {
    const selector = `link[data-recruiter-recaptcha-preconnect="${origin}"]`;
    if (document.head.querySelector(selector)) {
      continue;
    }
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    link.setAttribute("data-recruiter-recaptcha-preconnect", origin);
    document.head.appendChild(link);
  }
}

/**
 * Loads the Google reCAPTCHA script and warms the client after the user focuses the
 * composer, so terms/captcha modals open with the widget ready instead of on first open.
 */
export function RecruiterRecaptchaPreload() {
  const sitekey = getRecruiterRecaptchaSiteKey();
  const preloadRef = useRef<ReCAPTCHA | null>(null);

  useEffect(() => {
    ensureRecaptchaPreconnectHints();
    void ensureRecruiterRecaptchaScriptLoaded();
  }, []);

  if (!sitekey) {
    return null;
  }

  return (
    <Box
      aria-hidden
      sx={{
        position: "fixed",
        left: 0,
        bottom: 0,
        width: RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
        height: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      <ReCAPTCHA ref={preloadRef} sitekey={sitekey} onChange={() => {}} />
    </Box>
  );
}
