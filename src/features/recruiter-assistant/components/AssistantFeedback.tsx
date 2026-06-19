"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import {
  submitFeedback,
  type FeedbackReason,
} from "../lib/recruiter-assistant-feedback";

type FeedbackPhase = "idle" | "negative-expand" | "submitting" | "done";

export type AssistantFeedbackProps = {
  messageId: string;
  questionText: string;
  responseText: string;
  locale: string;
  onCopy: () => void;
  copyLabel: string;
  onClean: () => void;
  cleanLabel: string;
};

const ICON_BTN_SX = {
  color: "text.secondary",
  borderRadius: 1.5,
  width: 32,
  height: 32,
  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
} as const;

const ROW_SX = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: 0.25,
  flexShrink: 0,
} as const;

export function AssistantFeedback({
  messageId,
  questionText,
  responseText,
  locale,
  onCopy,
  copyLabel,
  onClean,
  cleanLabel,
}: AssistantFeedbackProps) {
  const t = useTranslations("RecruiterAssistant");

  const [phase, setPhase] = useState<FeedbackPhase>("idle");
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [pendingReason, setPendingReason] = useState<FeedbackReason | null>(
    null
  );
  const [comment, setComment] = useState("");

  const isDisabled = phase !== "idle";
  const isExpanding = phase === "negative-expand";
  const isSubmitting = phase === "submitting";
  const isDone = phase === "done";

  const doSubmit = useCallback(
    async (r: "positive" | "negative", reason?: FeedbackReason, c?: string) => {
      setPhase("submitting");
      try {
        await submitFeedback({
          messageId,
          questionText,
          responseText,
          rating: r,
          reason,
          comment: c?.trim() || undefined,
          locale,
        });
        setPhase("done");
      } catch {
        setPhase("idle");
        setRating(null);
        setPendingReason(null);
        setComment("");
      }
    },
    [messageId, questionText, responseText, locale]
  );

  const handleThumbUp = useCallback(() => {
    if (isDisabled) return;
    setRating("positive");
    void doSubmit("positive");
  }, [isDisabled, doSubmit]);

  const handleThumbDown = useCallback(() => {
    if (isDisabled) return;
    setRating("negative");
    setPhase("negative-expand");
  }, [isDisabled]);

  const handleSubmitNegative = useCallback(() => {
    void doSubmit("negative", pendingReason ?? undefined, comment);
  }, [doSubmit, pendingReason, comment]);

  const handleSkip = useCallback(() => {
    void doSubmit("negative");
  }, [doSubmit]);

  const reasons: { key: FeedbackReason; label: string }[] = [
    { key: "wrong_fit", label: t("feedbackReasonWrongFit") },
    { key: "off_topic", label: t("feedbackReasonOffTopic") },
    { key: "missing_context", label: t("feedbackReasonMissingContext") },
    { key: "too_long", label: t("feedbackReasonTooLong") },
  ];

  const copyButton = (
    <Tooltip title={copyLabel} placement="top" arrow describeChild>
      <span>
        <IconButton
          type="button"
          size="small"
          aria-label={copyLabel}
          onClick={onCopy}
          sx={ICON_BTN_SX}
        >
          <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </span>
    </Tooltip>
  );

  const cleanButton = (
    <Tooltip title={cleanLabel} placement="top" arrow describeChild>
      <span>
        <IconButton
          type="button"
          size="small"
          aria-label={cleanLabel}
          onClick={onClean}
          sx={ICON_BTN_SX}
        >
          <RestartAltRoundedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </span>
    </Tooltip>
  );

  if (isDone) {
    return (
      <Box sx={{ ...ROW_SX, mt: 2 }}>
        {copyButton}
        {cleanButton}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />
        {rating === "positive" ? (
          <ThumbUpRoundedIcon sx={{ fontSize: 16, color: "success.main" }} />
        ) : (
          <ThumbDownRoundedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        )}
        <Typography variant="caption" color="text.disabled" sx={{ ml: 0.75 }}>
          {t("feedbackSent")}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={0.5} sx={{ mt: 2 }}>
      <Box sx={ROW_SX}>
        {copyButton}
        {cleanButton}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />

        <Tooltip
          title={t("feedbackHelpful")}
          placement="top"
          arrow
          describeChild
        >
          <span>
            <IconButton
              type="button"
              size="small"
              aria-label={t("feedbackHelpful")}
              onClick={handleThumbUp}
              disabled={isDisabled}
              sx={{
                ...ICON_BTN_SX,
                ...(rating === "positive" ? { color: "success.main" } : {}),
              }}
            >
              {rating === "positive" ? (
                <ThumbUpRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ThumbUpOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip
          title={t("feedbackNotHelpful")}
          placement="top"
          arrow
          describeChild
        >
          <span>
            <IconButton
              type="button"
              size="small"
              aria-label={t("feedbackNotHelpful")}
              onClick={handleThumbDown}
              disabled={isDisabled}
              sx={{
                ...ICON_BTN_SX,
                ...(isExpanding || (rating === "negative" && isSubmitting)
                  ? { color: "error.main" }
                  : {}),
              }}
            >
              {isExpanding || (rating === "negative" && isSubmitting) ? (
                <ThumbDownRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ThumbDownOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {rating === "positive" && isSubmitting && (
          <Typography variant="caption" color="success.main" sx={{ ml: 0.25 }}>
            {t("feedbackThanks")}
          </Typography>
        )}
      </Box>

      <Collapse in={isExpanding} unmountOnExit>
        <Stack spacing={1} sx={{ pt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            {t("feedbackWhatWentWrong")}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {reasons.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                size="small"
                variant={pendingReason === key ? "filled" : "outlined"}
                color={pendingReason === key ? "error" : "default"}
                onClick={() =>
                  setPendingReason((prev) => (prev === key ? null : key))
                }
                disabled={isSubmitting}
                sx={{ fontSize: "0.75rem", height: 24 }}
              />
            ))}
          </Box>

          <InputBase
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            placeholder={t("feedbackCommentPlaceholder")}
            multiline
            maxRows={3}
            disabled={isSubmitting}
            sx={{
              fontSize: "0.8125rem",
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 1,
              py: 0.5,
              "&:hover": { borderColor: "text.disabled" },
              "&.Mui-focused": { borderColor: "text.secondary" },
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              component="button"
              type="button"
              onClick={handleSubmitNegative}
              disabled={isSubmitting}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                px: 1.5,
                py: 0.5,
                border: "none",
                borderRadius: 1,
                bgcolor: "error.main",
                color: "error.contrastText",
                fontSize: "0.8125rem",
                fontWeight: 600,
                lineHeight: 1.5,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.5 : 1,
                "&:hover": { opacity: isSubmitting ? 0.5 : 0.88 },
              }}
            >
              {t("feedbackSubmit")}
            </Box>

            <Link
              component="button"
              type="button"
              variant="caption"
              color="text.secondary"
              underline="hover"
              onClick={handleSkip}
              disabled={isSubmitting}
              sx={{ cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {t("feedbackSkip")}
            </Link>
          </Box>
        </Stack>
      </Collapse>
    </Stack>
  );
}
