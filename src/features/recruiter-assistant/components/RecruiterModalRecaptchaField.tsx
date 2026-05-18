"use client";

import Box from "@mui/material/Box";
import {
  RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
  RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
} from "../constants/recruiter-assistant";

/** Fixed-size slot so modal layout does not shift while reCAPTCHA mounts. */
export function RecruiterModalRecaptchaField({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        width: "100%",
        height: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        minHeight: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        maxHeight: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: RECRUITER_CHECKBOX_RECAPTCHA_WIDTH_PX,
          maxWidth: "100%",
          height: RECRUITER_CHECKBOX_RECAPTCHA_HEIGHT_PX,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
