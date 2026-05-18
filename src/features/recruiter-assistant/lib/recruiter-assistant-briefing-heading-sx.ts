import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import {
  RECRUITER_ASSISTANT_SECTION_BLOCK_GAP,
  RECRUITER_ASSISTANT_SECTION_TITLE_TO_CONTENT_SPACING,
} from "../constants/recruiter-assistant";

/**
 * Styles for `# …` headings in recruiter briefing markdown (`RecruiterChat` → `markdownSx` → `& h1`).
 * Keeps streamed pitch headings visually aligned with chrome section titles (`Typography` below).
 */
export const recruiterAssistantBriefingMarkdownH1Sx: SystemStyleObject<Theme> =
  {
    mt: RECRUITER_ASSISTANT_SECTION_BLOCK_GAP,
    mb: RECRUITER_ASSISTANT_SECTION_TITLE_TO_CONTENT_SPACING,
    pb: 0,
    fontWeight: 700,
    fontSize: "0.9375rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "text.secondary",
    "&:first-of-type": { mt: 0 },
  };

/**
 * Same look as markdown `# …` for standalone headings; set `mt` per placement (`0` column lead, `RECRUITER_ASSISTANT_SECTION_BLOCK_GAP` section break).
 */
export const recruiterAssistantBriefingSectionHeadingSx: SystemStyleObject<Theme> =
  {
    m: 0,
    mb: RECRUITER_ASSISTANT_SECTION_TITLE_TO_CONTENT_SPACING,
    pb: 0,
    fontWeight: 700,
    fontSize: "0.9375rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "text.secondary",
    lineHeight: 1.2,
  };
