"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";

const pulseAnimation = keyframes`
  0% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.35; transform: scale(0.85); }
`;

type AssistantBriefingStreamingLineProps = {
  readonly text: string;
  readonly isStreaming: boolean;
};

export function AssistantBriefingStreamingLine({
  text,
  isStreaming,
}: AssistantBriefingStreamingLineProps) {
  const displayText = text.trim();
  const showPulse = isStreaming;

  if (!showPulse && displayText === "") {
    return null;
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy={isStreaming}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        py: 0.75,
        minHeight: 28,
      }}
    >
      {showPulse ? (
        <Box
          aria-hidden
          sx={{
            width: 7,
            height: 7,
            mt: 0.75,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: "primary.main",
            animation: `${pulseAnimation} 1.4s ease-in-out infinite`,
          }}
        />
      ) : null}
      {displayText ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontStyle: "italic",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {displayText}
        </Typography>
      ) : null}
    </Box>
  );
}
