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
import LinearProgress from "@mui/material/LinearProgress";
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
  RECRUITER_ASSISTANT_BOTTOM_DOCK_MIN_HEIGHT_PX,
  RECRUITER_ASSISTANT_SECTION_BLOCK_GAP,
  RECRUITER_BAD_PROMPT_MAX_STRIKES,
  RECRUITER_CHAT_MAX_WIDTH_PX,
  RECRUITER_COMPOSER_BORDER_RADIUS_PX,
  RECRUITER_COMPOSER_EXIT_DURATION_MS,
  RECRUITER_COMPOSER_EXIT_TRANSLATE_Y_PX,
  RECRUITER_COMPOSER_EXPANDED_ROWS,
  RECRUITER_COMPOSER_INNER_PADDING_PX,
  RECRUITER_COMPOSER_INPUT_MAX_HEIGHT_PX,
  RECRUITER_COMPOSER_MAX_WIDTH_PX,
  RECRUITER_JOB_CONTEXT_PANEL_MAX_WIDTH_PERCENT,
  RECRUITER_TERMS_ACCEPTANCE_STORAGE_KEY,
} from "../constants/recruiter-assistant";
import { useRecruiterAssistantUi } from "../context/RecruiterAssistantUiContext";
import { recordBadIntentRejection } from "../lib/bad-prompt-strikes";
import { getRecruiterApiBaseUrl } from "../lib/api-url";
import { shouldRequestJobContextCollapse } from "../lib/should-request-job-context-collapse";
import { getRecruiterAssistantMessagePlainText } from "../lib/getRecruiterAssistantMessagePlainText";
import { stripMatchScoreGuidanceFromEvidenceReview } from "../lib/strip-match-score-guidance-from-evidence-review";
import {
  mergedThinkingMarkdownForEvidence,
  shouldMountEvidenceReviewPanel,
} from "../lib/sync-recruiter-assistant-thinking-cache";
import {
  CHART_DATA_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
  splitThinkingFromBody,
} from "../lib/split-thinking-from-body";
import {
  recruiterAssistantBriefingMarkdownH1Sx,
  recruiterAssistantBriefingSectionHeadingSx,
} from "../lib/recruiter-assistant-briefing-heading-sx";
import { logMatchProfileClientDebug } from "../lib/match-profile-debug";
import { AssistantBriefingBody } from "./AssistantBriefingBody";
import { AssistantBriefingProgress } from "./AssistantBriefingProgress";
import { AssistantBriefingStreamingLine } from "./AssistantBriefingStreamingLine";
import { AssistantEvidenceReview } from "./AssistantEvidenceReview";
import { AssistantJobContextPanel } from "./AssistantJobContextPanel";
import { AssistantMatchProfileSkeleton } from "./AssistantMatchProfileSkeleton";
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
  return res;
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
  "& h1": recruiterAssistantBriefingMarkdownH1Sx,
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
  const wasChatBusyRef = useRef(false);
  const [termsHydrated, setTermsHydrated] = useState(false);
  const [termsFromStorage, setTermsFromStorage] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [latestEvidencePanelOpen, setLatestEvidencePanelOpen] = useState(true);
  const [
    thinkingEvidenceMarkdownByMessageId,
    setThinkingEvidenceMarkdownByMessageId,
  ] = useState(() => new Map<string, string>());

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: apiBaseUrl,
    maxSteps: 1,
    fetch: recruiterAssistantFetch,
    body: { locale },
    experimental_throttle: 50,
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    queueMicrotask(() => {
      setThinkingEvidenceMarkdownByMessageId((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const msg of messages) {
          if (msg.role !== "assistant") continue;
          const split = splitThinkingFromBody(
            getRecruiterAssistantMessagePlainText(msg)
          );
          if (!split.thinking.trim()) continue;
          const prior = next.get(msg.id);
          if (prior !== split.thinking) {
            next.set(msg.id, split.thinking);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
  }, [messages]);

  const isAssistantEvidenceStreaming = useMemo(() => {
    if (!isBusy) return false;
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return false;
    const raw = getRecruiterAssistantMessagePlainText(last);
    const split = splitThinkingFromBody(raw);
    return split.hasThinking && split.isThinkingStreaming;
  }, [isBusy, messages]);

  const latestUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const [isLatestJobContextPanelOpen, setIsLatestJobContextPanelOpen] =
    useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLatestJobContextPanelOpen(true);
      if (latestUserMessageId !== null) {
        setLatestEvidencePanelOpen(true);
      }
    });
  }, [latestUserMessageId]);

  const handleLatestJobContextOpenChange = useCallback((open: boolean) => {
    setIsLatestJobContextPanelOpen(open);
  }, []);

  const shouldHideComposer = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") return false;

    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return false;
    const raw = getRecruiterAssistantMessagePlainText(lastAssistant);
    const split = splitThinkingFromBody(raw);
    if (split.hasThinking && !split.isThinkingStreaming) return true;
    if (!split.hasThinking && !isBusy && raw.trim().length > 0) return true;
    return false;
  }, [messages, isBusy]);

  type ComposerExitPhase = "visible" | "exiting" | "hidden";
  const [composerExitPhase, setComposerExitPhase] =
    useState<ComposerExitPhase>("visible");
  const composerExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!shouldHideComposer) {
      if (composerExitTimeoutRef.current) {
        clearTimeout(composerExitTimeoutRef.current);
        composerExitTimeoutRef.current = null;
      }
      queueMicrotask(() => {
        setComposerExitPhase("visible");
      });
      return;
    }

    queueMicrotask(() => {
      setComposerExitPhase((prev) => {
        if (prev === "hidden" || prev === "exiting") return prev;
        return "exiting";
      });
    });
  }, [shouldHideComposer]);

  useEffect(() => {
    if (composerExitPhase !== "exiting") return;
    composerExitTimeoutRef.current = setTimeout(() => {
      setComposerExitPhase("hidden");
      composerExitTimeoutRef.current = null;
    }, RECRUITER_COMPOSER_EXIT_DURATION_MS);
    return () => {
      if (composerExitTimeoutRef.current) {
        clearTimeout(composerExitTimeoutRef.current);
        composerExitTimeoutRef.current = null;
      }
    };
  }, [composerExitPhase]);

  const isComposerInteractive = composerExitPhase === "visible";
  const briefingComposerDismissed =
    shouldHideComposer && composerExitPhase === "hidden";
  const showComposerChrome =
    messages.length === 0 ||
    (!isAssistantEvidenceStreaming &&
      isLatestJobContextPanelOpen &&
      !briefingComposerDismissed);

  const showComposerJobDescriptionHeading = input.trim().length > 0;

  const reserveTallBottomDock = messages.length > 0 && showComposerChrome;

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
    const rawBody = getRecruiterAssistantMessagePlainText(lastAssistant);
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

  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!termsHydrated) {
      e.preventDefault();
      return;
    }
    if (!isComposerInteractive) {
      e.preventDefault();
      return;
    }
    if (!termsFromStorage) {
      e.preventDefault();
      openTermsModal();
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

    const wasBusy = wasChatBusyRef.current;
    wasChatBusyRef.current = isBusy;

    const assistantJustFinishedSuccessfully =
      wasBusy && !isBusy && status === "ready";

    if (assistantJustFinishedSuccessfully) {
      el.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (isBusy) {
      if (status === "submitted") {
        return;
      }
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isBusy, status]);

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
      if (
        !isSubmitShortcut ||
        isBusy ||
        !termsHydrated ||
        !isComposerInteractive
      )
        return;
      e.preventDefault();
      if (!termsFromStorage) {
        openTermsModal();
        return;
      }
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    },
    [
      handleSubmit,
      input,
      isBusy,
      isComposerInteractive,
      openTermsModal,
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
          display: "flex",
          flexDirection: "column",
          px: { xs: 1.5, sm: 2 },
          py: 1,
        }}
        role="log"
        aria-relevant="additions"
        aria-live="polite"
      >
        <Stack
          spacing={3}
          sx={{
            flex: "1 1 0",
            minHeight: 0,
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {messages.map((m, messageIndex) => {
            const rawBody = getRecruiterAssistantMessagePlainText(m);
            const isUser = m.role === "user";
            const followingAssistantPlainText =
              isUser && messages[messageIndex + 1]?.role === "assistant"
                ? getRecruiterAssistantMessagePlainText(
                    messages[messageIndex + 1]
                  )
                : null;
            const isLastMessage = messages[messages.length - 1]?.id === m.id;
            const isStreamingThisMessage =
              isBusy && isLastMessage && m.role === "assistant";
            const split = isUser ? null : splitThinkingFromBody(rawBody);
            const mergedThinkingMarkdown =
              !isUser && split
                ? mergedThinkingMarkdownForEvidence(
                    m.id,
                    split,
                    thinkingEvidenceMarkdownByMessageId
                  )
                : "";
            const showEvidenceReview =
              !isUser && split !== null
                ? shouldMountEvidenceReviewPanel(split, mergedThinkingMarkdown)
                : false;
            const evidenceReviewDisplayMarkdown =
              mergedThinkingMarkdown.trim() === ""
                ? ""
                : stripMatchScoreGuidanceFromEvidenceReview(
                    mergedThinkingMarkdown
                  );
            const mainBody = split?.body ?? rawBody;
            const isEvidenceReviewStreaming =
              split?.isThinkingStreaming ?? false;
            const isBriefingPipelineActive =
              !isUser &&
              isStreamingThisMessage &&
              showEvidenceReview &&
              !isEvidenceReviewStreaming &&
              mainBody.trim() === "";
            const isPostEvidenceBriefingPhase = isBriefingPipelineActive;
            const showMatchProfileSkeleton =
              isBriefingPipelineActive && split?.chartData == null;
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
            const hasBriefingRenderableBelowEvidence =
              Boolean(split?.chartData) ||
              (mainBody.trim() !== "" &&
                !showBodySkeleton &&
                !showMatchProfileSkeleton);
            const evidenceStretchRemainingColumn =
              isLastMessage &&
              showEvidenceReview &&
              latestEvidencePanelOpen &&
              !hasBriefingRenderableBelowEvidence;
            const assistantBriefingCompactHeight =
              isLastMessage && showEvidenceReview && !latestEvidencePanelOpen;
            const showStreamedPrepThinking =
              isPostEvidenceBriefingPhase && !showMatchProfileSkeleton;
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
                  ...(isLastMessage
                    ? {
                        flexGrow: 1,
                        minHeight: 0,
                      }
                    : { flexShrink: 0 }),
                }}
              >
                {isUser ? (
                  <Stack
                    spacing={0}
                    sx={{
                      width: "100%",
                      maxWidth: `${RECRUITER_JOB_CONTEXT_PANEL_MAX_WIDTH_PERCENT}%`,
                      ...(isLastMessage
                        ? {
                            flex: "1 1 0",
                            minHeight: 0,
                            minWidth: 0,
                          }
                        : {}),
                    }}
                  >
                    {rawBody.trim().length > 0 ? (
                      <Typography
                        component="h1"
                        variant="body1"
                        sx={{
                          ...recruiterAssistantBriefingSectionHeadingSx,
                          mt: 0,
                        }}
                      >
                        {t("jobDescriptionSectionLabel")}
                      </Typography>
                    ) : null}
                    <Box
                      sx={
                        isLastMessage
                          ? {
                              flex: "1 1 0",
                              minHeight: 0,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                            }
                          : {}
                      }
                    >
                      <AssistantJobContextPanel
                        content={rawBody}
                        label={t("jobContextLabel")}
                        collapseRequested={shouldRequestJobContextCollapse(
                          messages,
                          m.id,
                          status,
                          followingAssistantPlainText
                        )}
                        onOpenChange={
                          m.id === latestUserMessageId
                            ? handleLatestJobContextOpenChange
                            : undefined
                        }
                      />
                    </Box>
                  </Stack>
                ) : (
                  <Stack
                    spacing={1}
                    sx={{
                      width: "100%",
                      maxWidth: "100%",
                      ...(isLastMessage
                        ? {
                            flex: "1 1 0",
                            minHeight: 0,
                            minWidth: 0,
                          }
                        : {}),
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 0,
                        ...(isLastMessage
                          ? assistantBriefingCompactHeight
                            ? {
                                flex: "0 0 auto",
                                minWidth: 0,
                              }
                            : {
                                flex: "1 1 0",
                                minHeight: 0,
                                minWidth: 0,
                              }
                          : {}),
                      }}
                    >
                      <Typography
                        component="h1"
                        variant="body1"
                        sx={{
                          ...recruiterAssistantBriefingSectionHeadingSx,
                          mt: 0,
                          flexShrink: 0,
                        }}
                      >
                        {t("briefingLabel")}
                      </Typography>
                      {showEvidenceReview ? (
                        <Box
                          sx={{
                            flex: evidenceStretchRemainingColumn
                              ? "1 1 0"
                              : "0 0 auto",
                            minHeight: evidenceStretchRemainingColumn
                              ? 0
                              : undefined,
                            minWidth: 0,
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <AssistantEvidenceReview
                            content={evidenceReviewDisplayMarkdown}
                            isStreaming={split!.isThinkingStreaming}
                            collapseRequested={
                              isStreamingThisMessage &&
                              showEvidenceReview &&
                              !isEvidenceReviewStreaming
                            }
                            label={t("evidenceReviewLabel")}
                            streamingLabel={t("evidenceReviewStreamingLabel")}
                            locale={locale}
                            onOpenChange={
                              isLastMessage
                                ? setLatestEvidencePanelOpen
                                : undefined
                            }
                            fillColumn={evidenceStretchRemainingColumn}
                          />
                        </Box>
                      ) : null}
                      <Box
                        component="div"
                        sx={{
                          width: "100%",
                          color: "text.primary",
                          lineHeight: 1.72,
                          flexShrink: 0,
                          ...(showEvidenceReview
                            ? { mt: RECRUITER_ASSISTANT_SECTION_BLOCK_GAP }
                            : {}),
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
                        {showMatchProfileSkeleton ? (
                          <AssistantMatchProfileSkeleton />
                        ) : null}
                        {showBodySkeleton ? (
                          <AssistantThinkingIndicator />
                        ) : mainBody.trim() === "" &&
                          !split?.chartData ? null : (
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
                            justifyContent: "flex-start",
                            alignItems: "center",
                            gap: 0.25,
                            mt: 0.25,
                            flexShrink: 0,
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
                                onClick={() =>
                                  handleCopyBriefing(m.id, mainBody)
                                }
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
                    </Box>
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
                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  {t("briefingPreparingLabel")}
                </Typography>
                <AssistantThinkingIndicator />
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          alignSelf: "center",
          width: `min(100%, ${RECRUITER_COMPOSER_MAX_WIDTH_PX}px)`,
          boxSizing: "border-box",
          px: 0,
          pt: 1.25,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            gap: 1.5,
            ...(reserveTallBottomDock
              ? {
                  minHeight: RECRUITER_ASSISTANT_BOTTOM_DOCK_MIN_HEIGHT_PX,
                }
              : {}),
          }}
        >
          {isAssistantEvidenceStreaming ? (
            <LinearProgress
              aria-busy
              aria-label={t("evidenceReviewStreamingLabel")}
              sx={{
                width: "100%",
                height: 3,
                borderRadius: 999,
                overflow: "hidden",
                flexShrink: 0,
              }}
              color="primary"
            />
          ) : null}
          {showComposerChrome ? (
            <Stack
              spacing={0}
              sx={{
                flexShrink: 0,
                opacity: isComposerInteractive ? 1 : 0,
                transform: isComposerInteractive
                  ? "none"
                  : `translateY(${RECRUITER_COMPOSER_EXIT_TRANSLATE_Y_PX}px)`,
                transition: theme.transitions.create(["opacity", "transform"], {
                  duration: RECRUITER_COMPOSER_EXIT_DURATION_MS,
                  easing: theme.transitions.easing.easeOut,
                }),
                pointerEvents: isComposerInteractive ? "auto" : "none",
              }}
            >
              {showComposerJobDescriptionHeading ? (
                <Typography
                  component="h1"
                  variant="body1"
                  sx={{
                    ...recruiterAssistantBriefingSectionHeadingSx,
                    mt: 0,
                  }}
                >
                  {t("jobDescriptionSectionLabel")}
                </Typography>
              ) : null}
              <Box
                component="form"
                onSubmit={onFormSubmit}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  width: "100%",
                }}
              >
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
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 0,
                    p: `${RECRUITER_COMPOSER_INNER_PADDING_PX}px`,
                    borderRadius: `${RECRUITER_COMPOSER_BORDER_RADIUS_PX}px`,
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
                    fullWidth
                    multiline
                    rows={RECRUITER_COMPOSER_EXPANDED_ROWS}
                    margin="none"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={t("placeholder")}
                    disabled={isBusy || !isComposerInteractive}
                    name="prompt"
                    variant="standard"
                    InputProps={{
                      disableUnderline: true,
                      inputComponent: "textarea" as const,
                    }}
                    sx={{
                      width: "100%",
                      m: 0,
                      "& .MuiInputBase-root": {
                        m: 0,
                        p: 0,
                        width: "100%",
                        alignItems: "flex-start",
                        overflow: "visible",
                      },
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
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      flexShrink: 0,
                      pt: 0.75,
                    }}
                  >
                    {isBusy ? (
                      <Tooltip
                        title={t("sending")}
                        placement="top"
                        arrow
                        describeChild
                      >
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
                      <Tooltip
                        title={t("send")}
                        placement="top"
                        arrow
                        describeChild
                      >
                        <Box component="span" sx={{ display: "inline-flex" }}>
                          <IconButton
                            type="submit"
                            disabled={
                              !input.trim() ||
                              !termsHydrated ||
                              !isComposerInteractive
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
              </Box>
            </Stack>
          ) : null}
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
            flexShrink: 0,
            px: { xs: 0.5, sm: 0 },
            opacity: 0.85,
            fontSize: (theme) =>
              `calc(${theme.typography.caption.fontSize} - 2px)`,
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
