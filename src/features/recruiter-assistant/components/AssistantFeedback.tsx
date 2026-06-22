"use client";

import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import {
  submitFeedback,
  type FeedbackReason,
} from "../lib/recruiter-assistant-feedback";

type FeedbackPhase = "idle" | "negative-expand" | "done";

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
  const [submitting, setSubmitting] = useState<"positive" | null>(null);
  const [submittingNegative, setSubmittingNegative] = useState(false);
  const [pendingReason, setPendingReason] = useState<FeedbackReason | null>(
    null
  );
  const [comment, setComment] = useState("");

  const isDisabled = phase !== "idle";
  const isExpanding = phase === "negative-expand";
  const isDone = phase === "done";

  const expandPanelRef = useRef<HTMLDivElement>(null);
  const scrollExpandIntoView = useCallback(() => {
    expandPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const doSubmit = useCallback(
    (r: "positive" | "negative", reason?: FeedbackReason, c?: string) => {
      setPhase("done");
      submitFeedback({
        messageId,
        questionText,
        responseText,
        rating: r,
        reason,
        comment: c?.trim() || undefined,
        locale,
      }).catch(() => {
        setPhase("idle");
        setRating(null);
        setPendingReason(null);
        setComment("");
      });
    },
    [messageId, questionText, responseText, locale]
  );

  const handleThumbUp = useCallback(() => {
    if (isDisabled || submitting) return;
    setSubmitting("positive");
    setTimeout(() => {
      setSubmitting(null);
      setRating("positive");
      doSubmit("positive");
    }, 200);
  }, [isDisabled, submitting, doSubmit]);

  const handleThumbDown = useCallback(() => {
    if (isDisabled || submitting) return;
    setRating("negative");
    setPhase("negative-expand");
  }, [isDisabled, submitting]);

  const handleSubmitNegative = useCallback(() => {
    if (submittingNegative) return;
    setSubmittingNegative(true);
    setTimeout(() => {
      setSubmittingNegative(false);
      doSubmit("negative", pendingReason ?? undefined, comment);
    }, 200);
  }, [submittingNegative, doSubmit, pendingReason, comment]);

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
              {submitting === "positive" ? (
                <CircularProgress
                  size={16}
                  thickness={4}
                  sx={{ color: "success.main" }}
                />
              ) : rating === "positive" ? (
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
                ...(isExpanding ? { color: "error.main" } : {}),
              }}
            >
              {isExpanding ? (
                <ThumbDownRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ThumbDownOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Collapse in={isExpanding} unmountOnExit onEntered={scrollExpandIntoView}>
        <Stack ref={expandPanelRef} spacing={1} sx={{ pt: 0.25 }}>
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

          <Box>
            <Box
              component="button"
              type="button"
              onClick={handleSubmitNegative}
              disabled={submittingNegative}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                border: "none",
                borderRadius: 1,
                bgcolor: "error.main",
                color: "error.contrastText",
                fontSize: "0.8125rem",
                fontWeight: 600,
                lineHeight: 1.5,
                cursor: submittingNegative ? "default" : "pointer",
                "&:hover": { opacity: submittingNegative ? 1 : 0.88 },
              }}
            >
              {submittingNegative && (
                <CircularProgress
                  size={12}
                  thickness={4}
                  sx={{ color: "error.contrastText" }}
                />
              )}
              {t("feedbackSubmit")}
            </Box>
          </Box>
        </Stack>
      </Collapse>
    </Stack>
  );
}
