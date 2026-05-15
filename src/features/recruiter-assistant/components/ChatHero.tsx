"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import {
  CHAT_HERO_TOPBAR_OFFSET_MD_PX,
  CHAT_HERO_TOPBAR_OFFSET_XS_PX,
  RECRUITER_BAD_PROMPT_MAX_STRIKES,
  RECRUITER_CHAT_MAX_WIDTH_PX,
} from "../constants/recruiter-assistant";
import {
  RecruiterAssistantUiProvider,
  useRecruiterAssistantUi,
} from "../context/RecruiterAssistantUiContext";
import { useChatFade } from "../hooks/useChatFade";
import { AssistantScrollDownCue } from "./AssistantScrollDownCue";
import { RecruiterChat } from "./RecruiterChat";

function ChatHeroInner() {
  const t = useTranslations("RecruiterAssistant");
  const { hasConversation, assistantLocked, badPromptStrikeCount } =
    useRecruiterAssistantUi();
  const { opacity, translateY } = useChatFade();

  if (assistantLocked) {
    return (
      <Box
        id="section-assistant"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 1.25,
          px: 2,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ textAlign: "center", maxWidth: 360, lineHeight: 1.5 }}
        >
          {t("badPromptStrikesCounter", {
            count: badPromptStrikeCount,
            max: RECRUITER_BAD_PROMPT_MAX_STRIKES,
          })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      id="section-assistant"
      sx={{
        height: {
          xs: `calc(100dvh - ${CHAT_HERO_TOPBAR_OFFSET_XS_PX}px)`,
          md: `calc(100dvh - ${CHAT_HERO_TOPBAR_OFFSET_MD_PX}px)`,
        },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        position: "relative",
        zIndex: 1,
        px: 2,
        pt: hasConversation ? { xs: 1.5, md: 2 } : { xs: 2.5, md: 3.5 },
        pb: 3,
        boxSizing: "border-box",
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: "opacity 0.12s ease-out",
      }}
    >
      {!hasConversation ? (
        <>
          <Typography
            variant="h6"
            component="h1"
            align="center"
            sx={{
              flexShrink: 0,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              mb: 0.75,
            }}
          >
            {t("title")}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              flexShrink: 0,
              maxWidth: 420,
              mb: 2,
              lineHeight: 1.55,
              opacity: 0.9,
            }}
          >
            {t("subtitle")}
          </Typography>
        </>
      ) : null}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          maxWidth: RECRUITER_CHAT_MAX_WIDTH_PX,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <RecruiterChat />
      </Box>
    </Box>
  );
}

export function ChatHero() {
  return (
    <RecruiterAssistantUiProvider>
      <>
        <ChatHeroInner />
        <AssistantScrollDownCue />
      </>
    </RecruiterAssistantUiProvider>
  );
}
