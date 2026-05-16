import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import {
  RECRUITER_ASSISTANT_COLLAPSIBLE_BODY_MAX_HEIGHT_PX,
  RECRUITER_ASSISTANT_PANEL_BODY_FONT_REM,
  RECRUITER_ASSISTANT_PANEL_BODY_LINE_HEIGHT,
} from "../constants/recruiter-assistant";

/**
 * Typography + scrolling (`overflowY`) for collapsible bodies.
 * No `maxHeight` so nested flex (`fillColumn` on `AssistantCollapsiblePanel`)
 * can grow the scroll region to the briefing column viewport.
 */
export const recruiterAssistantPanelBodyTypographyScrollSx: SystemStyleObject<Theme> =
  {
    fontSize: `${RECRUITER_ASSISTANT_PANEL_BODY_FONT_REM}rem`,
    lineHeight: RECRUITER_ASSISTANT_PANEL_BODY_LINE_HEIGHT,
    overflowY: "auto",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
  };

/**
 * Clamp scroll height when panels are not in a flex-grown column (`fillColumn`).
 */
export const recruiterAssistantPanelBodyMaxHeightClampSx: SystemStyleObject<Theme> =
  {
    maxHeight: RECRUITER_ASSISTANT_COLLAPSIBLE_BODY_MAX_HEIGHT_PX,
  };

/** Typography + capped max height — use when panels are outside a filling flex chain. */
export const recruiterAssistantPanelBodyScrollSx: SystemStyleObject<Theme> = {
  ...recruiterAssistantPanelBodyTypographyScrollSx,
  ...recruiterAssistantPanelBodyMaxHeightClampSx,
};
