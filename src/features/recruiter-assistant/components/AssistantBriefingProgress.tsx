"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

type AssistantBriefingProgressProps = {
  readonly message: string;
};

export function AssistantBriefingProgress({
  message,
}: AssistantBriefingProgressProps) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{
        py: 1.25,
        px: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.03),
      }}
    >
      <CircularProgress size={18} thickness={5} aria-hidden />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  );
}
