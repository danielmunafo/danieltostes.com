"use client";

import { useChat } from "@ai-sdk/react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { isValidLocale, type Locale } from "@/i18n/request";
import {
  RECRUITER_BAD_PROMPT_MAX_STRIKES,
  RECRUITER_CHAT_MAX_WIDTH_PX,
  RECRUITER_COMPOSER_BORDER_RADIUS_PX,
  RECRUITER_COMPOSER_COMPACT_INNER_PADDING_PX,
  RECRUITER_COMPOSER_EXPANDED_ROWS,
  RECRUITER_COMPOSER_INNER_PADDING_PX,
  RECRUITER_COMPOSER_INPUT_MAX_HEIGHT_PX,
  RECRUITER_COMPOSER_MAX_WIDTH_PX,
  RECRUITER_MAX_CHAT_HISTORY_JSON_CHARS,
  RECRUITER_PAYLOAD_TOO_LARGE_ERROR,
  RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY,
} from "../constants/recruiter-assistant";
import { wouldExceedRecruiterChatHistoryLimit } from "../lib/chat-payload-size";
import { useRecruiterAssistantUi } from "../context/RecruiterAssistantUiContext";
import { recordBadIntentRejection } from "../lib/bad-prompt-strikes";
import { getRecruiterApiBaseUrl } from "../lib/api-url";
import {
  CHART_DATA_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
  splitThinkingFromBody,
} from "../lib/split-thinking-from-body";
import { logMatchProfileClientDebug } from "../lib/match-profile-debug";
import { AssistantBriefingBody } from "./AssistantBriefingBody";
import { AssistantBriefingProgress } from "./AssistantBriefingProgress";
import { AssistantBriefingStreamingLine } from "./AssistantBriefingStreamingLine";
import { AssistantEvidenceReview } from "./AssistantEvidenceReview";
import { AssistantThinkingIndicator } from "./AssistantThinkingIndicator";

function parseRecruiterApiErrorCode(res: Response, body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }
  return "";
}

async function recruiterAssistantFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 400 && res.status !== 413) {
    return res;
  }
  let body: unknown;
  try {
    body = await res.clone().json();
  } catch {
    return res;
  }
  const errorCode = parseRecruiterApiErrorCode(res, body);
  if (errorCode === "off_topic" || errorCode === "intent_unclear") {
    recordBadIntentRejection();
    throw new Error(errorCode);
  }
  if (errorCode === RECRUITER_PAYLOAD_TOO_LARGE_ERROR) {
    throw new Error(RECRUITER_PAYLOAD_TOO_LARGE_ERROR);
  }
  return res;
}

function getMessagePlainText(message: {
  content?: unknown;
  parts?: readonly { type?: string; text?: string }[];
}): string {
  if (typeof message.content === "string") return message.content;
  const parts = message.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p?.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const didCopy = document.execCommand("copy");
    document.body.removeChild(textarea);
    return didCopy;
  } catch {
    return false;
  }
}

const markdownSx = {
  "& p": { mb: 1.5, "&:last-child": { mb: 0 } },
  "& ul, & ol": { pl: 2.5, my: 1 },
  "& li": { mb: 0.5 },
  "& h1": {
    mt: 2.75,
    mb: 1.25,
    pb: 0.75,
    fontWeight: 700,
    fontSize: "0.9375rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "text.secondary",
    borderBottom: 1,
    borderColor: "divider",
    "&:first-of-type": { mt: 0 },
  },
  "& h2, & h3": { mt: 2, mb: 1, fontWeight: 600, fontSize: "1rem" },
  "& code": {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.875em",
    px: 0.75,
    py: 0.25,
    borderRadius: 1,
    bgcolor: "action.hover",
  },
  "& pre": {
    bgcolor: "action.hover",
    p: 1.5,
    borderRadius: 2,
    overflow: "auto",
    my: 1.5,
    "& code": { bgcolor: "transparent", p: 0 },
  },
  "& a": { color: "primary.main" },
} as const;

function RecruiterChatSession({ apiBaseUrl }: { apiBaseUrl: string }) {
  const theme = useTheme();
  const localeRaw = useLocale();
  const locale = (isValidLocale(localeRaw) ? localeRaw : "en") as Locale;
  const t = useTranslations("RecruiterAssistant");
  const { setHasConversation, badPromptStrikeCount } =
    useRecruiterAssistantUi();
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [termsHydrated, setTermsHydrated] = useState(false);
  const [termsFromStorage, setTermsFromStorage] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [payloadTooLargeFromServer, setPayloadTooLargeFromServer] =
    useState(false);

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: apiBaseUrl,
    maxSteps: 1,
    fetch: recruiterAssistantFetch,
    body: { locale },
    experimental_throttle: 50,
    onError: (err) => {
      if (err.message === RECRUITER_PAYLOAD_TOO_LARGE_ERROR) {
        setPayloadTooLargeFromServer(true);
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
  const isCompactComposer = messages.length > 0;
  const isPayloadTooLarge = useMemo(
    () =>
      isCompactComposer &&
      wouldExceedRecruiterChatHistoryLimit(
        messages,
        input,
        RECRUITER_MAX_CHAT_HISTORY_JSON_CHARS
      ),
    [input, isCompactComposer, messages]
  );

  if (!isPayloadTooLarge && payloadTooLargeFromServer) {
    setPayloadTooLargeFromServer(false);
  }
  const payloadTooLargeWarning = isPayloadTooLarge || payloadTooLargeFromServer;
  const termsHref = `/${locale}/recruiter-assistant/terms`;

  useEffect(() => {
    setHasConversation(messages.length > 0);
  }, [messages.length, setHasConversation]);

  useEffect(() => {
    if (isBusy) return;
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    const rawBody = getMessagePlainText(lastAssistant);
    const split = splitThinkingFromBody(rawBody);
    const hasOpenMarker = rawBody.includes(CHART_DATA_OPEN_MARKER);
    const hasCloseMarker = rawBody.includes(CHART_DATA_CLOSE_MARKER);
    logMatchProfileClientDebug("assistant message parsed", {
      hasThinking: split.hasThinking,
      isThinkingStreaming: split.isThinkingStreaming,
      hasChartMarkerOpen: split.hasChartMarkerOpen,
      hasOpenMarker,
      hasCloseMarker,
      chartDataPresent: split.chartData !== null,
      dimensionCount: split.chartData?.capabilityDimensions.length ?? 0,
      bodyChars: split.body.length,
      rawChars: rawBody.length,
    });
    if (hasOpenMarker && hasCloseMarker && split.chartData === null) {
      logMatchProfileClientDebug(
        "chart markers present but chartData null (parse/validation failed on client)"
      );
    }
  }, [messages, isBusy]);

  useLayoutEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const isWindowUndefined = typeof window === "undefined";
        const storedOk =
          !isWindowUndefined &&
          window.sessionStorage.getItem(
            RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY
          ) === "1";
        setTermsFromStorage(storedOk);
      } catch {
        setTermsFromStorage(false);
      }
      setTermsHydrated(true);
    });
  }, []);

  const openTermsModal = useCallback(() => {
    setTermsModalOpen(true);
  }, []);

  const persistTermsAcceptance = useCallback(() => {
    try {
      window.sessionStorage.setItem(
        RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY,
        "1"
      );
    } catch {
      /* private mode / quota */
    }
    setTermsFromStorage(true);
  }, []);

  const rejectPayloadTooLargeSubmit = useCallback(() => {
    if (
      !isCompactComposer ||
      !wouldExceedRecruiterChatHistoryLimit(
        messages,
        input,
        RECRUITER_MAX_CHAT_HISTORY_JSON_CHARS
      )
    ) {
      return false;
    }
    return true;
  }, [input, isCompactComposer, messages]);

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!termsHydrated) {
      e.preventDefault();
      return;
    }
    if (!termsFromStorage) {
      e.preventDefault();
      openTermsModal();
      return;
    }
    if (rejectPayloadTooLargeSubmit()) {
      e.preventDefault();
      return;
    }
    void handleSubmit(e);
  };

  const onTermsModalAccept = useCallback(() => {
    persistTermsAcceptance();
    setTermsModalOpen(false);
    void handleSubmit();
  }, [handleSubmit, persistTermsAcceptance]);

  const onTermsModalClose = useCallback(() => {
    setTermsModalOpen(false);
  }, []);

  const handleTermsDialogKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("a[href]")) return;
      e.preventDefault();
      e.stopPropagation();
      onTermsModalAccept();
    },
    [onTermsModalAccept]
  );

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isBusy]);

  const handleCopyBriefing = useCallback(
    (messageId: string, markdown: string) => {
      void copyTextToClipboard(markdown).then((didCopy) => {
        if (!didCopy) return;
        setCopiedMessageId(messageId);
        window.setTimeout(() => {
          setCopiedMessageId((current) =>
            current === messageId ? null : current
          );
        }, 2000);
      });
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isSubmitShortcut =
        e.key === "Enter" && (e.ctrlKey || e.metaKey) && input.trim();
      if (!isSubmitShortcut || isBusy || !termsHydrated) return;
      e.preventDefault();
      if (!termsFromStorage) {
        openTermsModal();
        return;
      }
      if (rejectPayloadTooLargeSubmit()) return;
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    },
    [
      handleSubmit,
      input,
      isBusy,
      openTermsModal,
      rejectPayloadTooLargeSubmit,
      termsFromStorage,
      termsHydrated,
    ]
  );

  const composerBorder =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.black, 0.1);

  const composerBg =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.04)
      : alpha(theme.palette.common.black, 0.03);

  const userBubbleBg =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.1)
      : alpha(theme.palette.common.black, 0.06);

  const labelSx = {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "text.secondary",
    lineHeight: 1.2,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
        width: "100%",
        maxWidth: RECRUITER_CHAT_MAX_WIDTH_PX,
        mx: "auto",
        overflow: "hidden",
      }}
    >
      <Box
        ref={messagesScrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 1.5, sm: 2 },
          py: 1,
        }}
        role="log"
        aria-relevant="additions"
        aria-live="polite"
      >
        <Stack spacing={3}>
          {messages.map((m) => {
            const rawBody = getMessagePlainText(m);
            const isUser = m.role === "user";
            const isLastMessage = messages[messages.length - 1]?.id === m.id;
            const isStreamingThisMessage =
              isBusy && isLastMessage && m.role === "assistant";
            const split = isUser ? null : splitThinkingFromBody(rawBody);
            const mainBody = split?.body ?? rawBody;
            const showEvidenceReview = split?.hasThinking ?? false;
            const isEvidenceReviewStreaming =
              split?.isThinkingStreaming ?? false;
            const isPostEvidenceBriefingPhase =
              !isUser &&
              isStreamingThisMessage &&
              showEvidenceReview &&
              !isEvidenceReviewStreaming &&
              mainBody.trim() === "" &&
              !split?.hasChartMarkerOpen &&
              split?.chartData == null;
            const isBuildingMatchProfile =
              !isUser &&
              isStreamingThisMessage &&
              (split?.hasChartMarkerOpen ?? false);
            const isDraftingBriefing =
              !isUser &&
              isStreamingThisMessage &&
              split?.chartData != null &&
              mainBody.trim() === "";
            const showBodySkeleton =
              !isUser &&
              isStreamingThisMessage &&
              mainBody.trim() === "" &&
              !showEvidenceReview;
            const earlyBriefingProgressMessage = isBuildingMatchProfile
              ? t("briefingMatchProfileLabel")
              : null;
            const showStreamedPrepThinking =
              isPostEvidenceBriefingPhase && !isBuildingMatchProfile;
            const hasBriefingToCopy =
              !isUser &&
              mainBody.trim() !== "" &&
              !showBodySkeleton &&
              !isStreamingThisMessage;
            return (
              <Box
                key={m.id}
                sx={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {isUser ? (
                  <Stack
                    spacing={0.75}
                    alignItems="flex-end"
                    sx={{ maxWidth: "min(100%, 88%)" }}
                  >
                    <Typography component="p" sx={labelSx}>
                      {t("jobContextLabel")}
                    </Typography>
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: 2,
                        bgcolor: userBubbleBg,
                        border: 1,
                        borderColor: "divider",
                        width: "100%",
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >
                        {rawBody}
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  <Stack spacing={1} sx={{ width: "100%", maxWidth: "100%" }}>
                    <Typography component="p" sx={labelSx}>
                      {t("briefingLabel")}
                    </Typography>
                    {showEvidenceReview ? (
                      <AssistantEvidenceReview
                        content={split!.thinking}
                        isStreaming={split!.isThinkingStreaming}
                        label={t("evidenceReviewLabel")}
                        streamingLabel={t("evidenceReviewStreamingLabel")}
                        locale={locale}
                      />
                    ) : null}
                    <Box
                      component="div"
                      sx={{
                        width: "100%",
                        color: "text.primary",
                        lineHeight: 1.72,
                      }}
                    >
                      {showStreamedPrepThinking ? (
                        <AssistantBriefingStreamingLine
                          text={split?.briefingPrep ?? ""}
                          isStreaming={
                            (split?.isBriefingPrepStreaming ?? false) ||
                            (split?.briefingPrep?.length ?? 0) === 0
                          }
                        />
                      ) : null}
                      {earlyBriefingProgressMessage ? (
                        <AssistantBriefingProgress
                          message={earlyBriefingProgressMessage}
                        />
                      ) : null}
                      {showBodySkeleton ? (
                        <AssistantThinkingIndicator />
                      ) : mainBody.trim() === "" && !split?.chartData ? null : (
                        <AssistantBriefingBody
                          markdown={mainBody}
                          contentSx={markdownSx}
                          locale={locale}
                          referencesPanelTitle={t("evidenceReferencesLabel")}
                          chartData={split?.chartData ?? null}
                        />
                      )}
                      {isDraftingBriefing ? (
                        <AssistantBriefingProgress
                          message={t("briefingDraftingLabel")}
                        />
                      ) : null}
                    </Box>
                    {hasBriefingToCopy ? (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.25,
                          mt: 0.25,
                        }}
                      >
                        <Tooltip
                          title={
                            copiedMessageId === m.id
                              ? t("copyBriefingCopied")
                              : t("copyBriefing")
                          }
                          placement="top"
                          arrow
                          describeChild
                        >
                          <span>
                            <IconButton
                              type="button"
                              size="small"
                              aria-label={
                                copiedMessageId === m.id
                                  ? t("copyBriefingCopied")
                                  : t("copyBriefing")
                              }
                              onClick={() => handleCopyBriefing(m.id, mainBody)}
                              sx={{
                                color: "text.secondary",
                                borderRadius: 1.5,
                                width: 32,
                                height: 32,
                                "&:hover": {
                                  bgcolor: "action.hover",
                                  color: "text.primary",
                                },
                              }}
                            >
                              <ContentCopyRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    ) : null}
                  </Stack>
                )}
              </Box>
            );
          })}
          {isBusy &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                width: "100%",
              }}
            >
              <Stack spacing={1} sx={{ width: "100%", maxWidth: "100%" }}>
                <Typography component="p" sx={labelSx}>
                  {t("briefingLabel")}
                </Typography>
                <AssistantThinkingIndicator />
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box
        component="form"
        onSubmit={onFormSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          flexShrink: 0,
          pt: isCompactComposer ? 1 : 1.25,
          alignSelf: "center",
          width: `min(100%, ${RECRUITER_COMPOSER_MAX_WIDTH_PX}px)`,
          boxSizing: "border-box",
          px: 0,
        }}
      >
        {payloadTooLargeWarning ? (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {t("payloadTooLargeWarning")}
          </Alert>
        ) : null}
        {badPromptStrikeCount > 0 ? (
          <Typography
            variant="caption"
            component="p"
            color="warning.main"
            sx={{ mb: 1, px: 0.5, fontWeight: 600 }}
          >
            {t("badPromptStrikesCounter", {
              count: badPromptStrikeCount,
              max: RECRUITER_BAD_PROMPT_MAX_STRIKES,
            })}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: "flex",
            flexDirection: isCompactComposer ? "row" : "column",
            alignItems: isCompactComposer ? "center" : "stretch",
            gap: isCompactComposer ? 0.75 : 0,
            p: isCompactComposer
              ? `${RECRUITER_COMPOSER_COMPACT_INNER_PADDING_PX}px`
              : `${RECRUITER_COMPOSER_INNER_PADDING_PX}px`,
            borderRadius: isCompactComposer
              ? `${Math.min(RECRUITER_COMPOSER_BORDER_RADIUS_PX, 18)}px`
              : `${RECRUITER_COMPOSER_BORDER_RADIUS_PX}px`,
            border: `1px solid ${composerBorder}`,
            bgcolor: composerBg,
            overflow: "hidden",
            boxShadow:
              theme.palette.mode === "dark"
                ? `0 0 0 1px ${alpha(theme.palette.common.white, 0.05)} inset`
                : "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <TextField
            key={isCompactComposer ? "compact" : "expanded"}
            fullWidth
            multiline={!isCompactComposer}
            rows={
              isCompactComposer ? undefined : RECRUITER_COMPOSER_EXPANDED_ROWS
            }
            margin="none"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            disabled={isBusy}
            name="prompt"
            variant="standard"
            InputProps={{
              disableUnderline: true,
              ...(!isCompactComposer
                ? { inputComponent: "textarea" as const }
                : {}),
            }}
            sx={{
              width: "100%",
              flex: isCompactComposer ? 1 : undefined,
              minWidth: isCompactComposer ? 0 : undefined,
              m: 0,
              "& .MuiInputBase-root": {
                m: 0,
                p: 0,
                width: "100%",
                alignItems: isCompactComposer ? "center" : "flex-start",
                overflow: "visible",
              },
              ...(isCompactComposer
                ? {
                    "& .MuiInputBase-input": {
                      py: 0.75,
                      px: 0,
                      lineHeight: 1.45,
                      fontSize: "0.9375rem",
                      boxSizing: "border-box",
                    },
                  }
                : {
                    "& .MuiInputBase-inputMultiline": {
                      maxHeight: `${RECRUITER_COMPOSER_INPUT_MAX_HEIGHT_PX}px`,
                      overflowY: "auto",
                      overflowX: "hidden",
                      resize: "none",
                      lineHeight: 1.5,
                      fontSize: "0.9375rem",
                      boxSizing: "border-box",
                      py: 0.375,
                      px: 0,
                    },
                  }),
            }}
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              flexShrink: 0,
              pt: isCompactComposer ? 0 : 0.75,
            }}
          >
            {isBusy ? (
              <Tooltip title={t("sending")} placement="top" arrow describeChild>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress
                    size={22}
                    thickness={5}
                    aria-label={t("sending")}
                  />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title={t("send")} placement="top" arrow describeChild>
                <Box component="span" sx={{ display: "inline-flex" }}>
                  <IconButton
                    type="submit"
                    disabled={
                      !input.trim() || !termsHydrated || isPayloadTooLarge
                    }
                    aria-label={t("send")}
                    sx={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      p: 0,
                      borderRadius: "50%",
                      boxShadow: 1,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? alpha(theme.palette.common.white, 0.92)
                          : alpha(theme.palette.common.black, 0.86),
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.grey[900]
                          : theme.palette.common.white,
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.common.white, 1)
                            : alpha(theme.palette.common.black, 0.92),
                      },
                      "&.Mui-disabled": {
                        bgcolor: "action.disabledBackground",
                        color: "action.disabled",
                        boxShadow: "none",
                      },
                    }}
                  >
                    <SendRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
        <Dialog
          open={termsModalOpen}
          onClose={onTermsModalClose}
          maxWidth="sm"
          fullWidth
          aria-labelledby="recruiter-assistant-terms-dialog-title"
          onKeyDownCapture={handleTermsDialogKeyDownCapture}
        >
          <DialogTitle id="recruiter-assistant-terms-dialog-title">
            {t("termsModalTitle")}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
              {t.rich("termsModalDescription", {
                terms: (chunks) => (
                  <MuiLink
                    component={NextLink}
                    href={termsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="primary"
                    underline="hover"
                  >
                    {chunks}
                  </MuiLink>
                ),
              })}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onTermsModalClose} color="inherit">
              {t("termsModalCancel")}
            </Button>
            <Button onClick={onTermsModalAccept} variant="contained">
              {t("termsModalAccept")}
            </Button>
          </DialogActions>
        </Dialog>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          textAlign="center"
          sx={{
            mt: 1.5,
            px: { xs: 0.5, sm: 0 },
            opacity: 0.85,
          }}
        >
          {t("disclaimer")}
        </Typography>
      </Box>
    </Box>
  );
}

export function RecruiterChat() {
  const t = useTranslations("RecruiterAssistant");
  const { assistantLocked } = useRecruiterAssistantUi();
  const apiBaseUrl = getRecruiterApiBaseUrl();

  if (!apiBaseUrl) {
    return (
      <Alert
        severity="info"
        sx={{ maxWidth: RECRUITER_CHAT_MAX_WIDTH_PX, width: "100%" }}
      >
        {t("unavailable")}
      </Alert>
    );
  }

  if (assistantLocked) {
    return null;
  }

  return <RecruiterChatSession apiBaseUrl={apiBaseUrl} />;
}
