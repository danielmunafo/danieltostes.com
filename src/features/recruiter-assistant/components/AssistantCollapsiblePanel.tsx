"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha, useTheme } from "@mui/material/styles";
import type { ReactNode, Ref } from "react";

export const RECRUITER_COLLAPSIBLE_PANEL_BORDER_RADIUS_PX = 10;
export const RECRUITER_COLLAPSIBLE_PANEL_CHEVRON_DURATION_MS = 200;

export type AssistantCollapsiblePanelProps = {
  readonly title: string;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
  /** Optional node before the title (e.g. streaming pulse). */
  readonly headerStartSlot?: ReactNode;
  readonly bodySx?: SxProps<Theme>;
  readonly bodyRef?: Ref<HTMLDivElement>;
  readonly rootSx?: SxProps<Theme>;
  readonly titleSx?: SxProps<Theme>;
  /** Right-align title text inside the header (e.g. user-submitted context). */
  readonly alignTitleEnd?: boolean;
  /**
   * When true, `Collapse` uses `timeout={0}` so height is not animated. Use
   * while body content changes rapidly (e.g. streaming markdown) to avoid
   * transition/layout feedback loops with react-transition-group.
   */
  readonly disableCollapseAnimation?: boolean;
  readonly collapseTimeout?: number | { enter?: number; exit?: number };
  /**
   * Grow to fill a flex parent (column) and keep the body in a scroll region.
   * Use inside a flex chain with `flex: 1` / `minHeight: 0` ancestors.
   */
  readonly fillColumn?: boolean;
  /** Merged into the header `ButtonBase` (e.g. min tap target when collapsed). */
  readonly headerButtonSx?: SxProps<Theme>;
};

export function AssistantCollapsiblePanel({
  title,
  open,
  onToggle,
  children,
  headerStartSlot,
  bodySx,
  bodyRef,
  rootSx,
  titleSx,
  alignTitleEnd = false,
  disableCollapseAnimation = false,
  collapseTimeout,
  fillColumn = false,
  headerButtonSx,
}: AssistantCollapsiblePanelProps) {
  const theme = useTheme();
  const borderColor =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.12)
      : alpha(theme.palette.common.black, 0.1);
  const bgColor =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.03)
      : alpha(theme.palette.common.black, 0.02);
  const resolvedCollapseTimeout = disableCollapseAnimation
    ? 0
    : (collapseTimeout ?? "auto");

  return (
    <Box
      sx={[
        {
          border: 1,
          borderColor,
          borderRadius: `${RECRUITER_COLLAPSIBLE_PANEL_BORDER_RADIUS_PX}px`,
          bgcolor: bgColor,
          overflow: "hidden",
          ...(fillColumn
            ? {
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                ...(open
                  ? { flex: "1 1 0", minHeight: 0 }
                  : { flex: "0 0 auto" }),
              }
            : {}),
        },
        ...(rootSx === undefined
          ? []
          : Array.isArray(rootSx)
            ? rootSx
            : [rootSx]),
      ]}
    >
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        sx={[
          {
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 1,
            px: 1.5,
            py: 1,
            textAlign: "left",
            "&:hover": {
              bgcolor: alpha(
                theme.palette.mode === "dark"
                  ? theme.palette.common.white
                  : theme.palette.common.black,
                0.04
              ),
            },
          },
          ...(headerButtonSx === undefined
            ? []
            : Array.isArray(headerButtonSx)
              ? headerButtonSx
              : [headerButtonSx]),
        ]}
      >
        {headerStartSlot}
        <Typography
          variant="caption"
          sx={[
            {
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "text.secondary",
              flex: 1,
              textAlign: alignTitleEnd ? "right" : "left",
            },
            ...(titleSx === undefined
              ? []
              : Array.isArray(titleSx)
                ? titleSx
                : [titleSx]),
          ]}
        >
          {title}
        </Typography>
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: `transform ${RECRUITER_COLLAPSIBLE_PANEL_CHEVRON_DURATION_MS}ms`,
          }}
        />
      </ButtonBase>
      <Collapse
        in={open}
        unmountOnExit
        timeout={resolvedCollapseTimeout}
        sx={
          fillColumn && open
            ? {
                flex: "1 1 0",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                "& .MuiCollapse-wrapper": { flex: "1 1 0", minHeight: 0 },
                "& .MuiCollapse-wrapperInner": {
                  flex: "1 1 0",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                },
              }
            : fillColumn && !open
              ? { flex: "0 0 auto", minHeight: 0, flexShrink: 0 }
              : {
                  flex: "none",
                  flexGrow: 0,
                  flexShrink: 0,
                  minHeight: 0,
                  alignSelf: "stretch",
                }
        }
      >
        <Box
          ref={bodyRef}
          sx={[
            {
              px: 1.5,
              pb: 1.25,
              pt: 1,
              color: "text.secondary",
            },
            ...(fillColumn && open
              ? [
                  {
                    flex: "1 1 0",
                    minHeight: 0,
                    minWidth: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                  },
                ]
              : []),
            ...(bodySx === undefined
              ? []
              : Array.isArray(bodySx)
                ? bodySx
                : [bodySx]),
          ]}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
