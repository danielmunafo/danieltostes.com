"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { styled, useTheme } from "@mui/material/styles";
import { BORDER_BY_MODE } from "@/constants/site";
import {
  CONTENT_COLUMN_PADDING_X,
  ICON_POSITION_OFFSET,
  ICON_SIDE_PADDING,
  SECTION_COLORS,
  SECTION_ICON_BORDER_WIDTH,
  SECTION_ICON_SIZE,
  SECTION_ITEM_MIN_HEIGHT,
  SECTION_ITEM_PADDING_Y,
  type ParallaxContentSectionId,
} from "@/constants/sections";

const MOBILE_PADDING_X = CONTENT_COLUMN_PADDING_X / 2;
const MOBILE_PADDING_Y = SECTION_ITEM_PADDING_Y / 2;

const ICON_HOVER_SCALE = 1.05;

interface SectionItemProps {
  sectionId: ParallaxContentSectionId;
  side: "left" | "right";
  /** Optional image path for the icon; falls back to a colored placeholder. */
  iconSrc?: string;
  /** Alt text for the icon image when iconSrc is set (required for accessibility). */
  iconAlt?: string;
  /** Optional scale multiplier for the icon image (e.g. 1.2 = 20% zoom in). */
  iconScale?: number;
  /** When true with onClick, item is clickable with pointer cursor and icon scales 10% on hover. */
  interactive?: boolean;
  /** When true and interactive, icon stays in the expanded (scaled) state (e.g. while a related modal is open). */
  expanded?: boolean;
  /** When true, uses half the usual min height and vertical padding for a denser layout. */
  compact?: boolean;
  /** Click handler; used with interactive for keyboard and click activation. */
  onClick?: () => void;
  /** Optional hover handler; e.g. for prefetching content when user hovers. */
  onMouseEnter?: () => void;
  children: React.ReactNode;
}

/**
 * Wraps a titled content block with a circular icon vertically centered
 * on the specified side, overflowing the content column edge.
 * Content is vertically centered within a guaranteed minimum height.
 */
function handleItemKeyDown(e: React.KeyboardEvent, onClick: () => void): void {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onClick();
  }
}

export function SectionItem({
  sectionId,
  side,
  iconSrc,
  iconAlt,
  iconScale,
  interactive = false,
  expanded = false,
  compact = false,
  onClick,
  onMouseEnter,
  children,
}: SectionItemProps) {
  const theme = useTheme();
  const color = SECTION_COLORS[theme.palette.mode][sectionId];
  const isLight = theme.palette.mode === "light";
  const isLeft = side === "left";
  const hasIcon = Boolean(iconSrc);
  const isInteractive = Boolean(interactive && onClick);

  const wrapperSx = {
    pl: {
      xs: `${MOBILE_PADDING_X}px`,
      md: `${CONTENT_COLUMN_PADDING_X + (hasIcon && isLeft ? ICON_SIDE_PADDING : 0)}px`,
    },
    pr: {
      xs: `${MOBILE_PADDING_X}px`,
      md: `${CONTENT_COLUMN_PADDING_X + (hasIcon && !isLeft ? ICON_SIDE_PADDING : 0)}px`,
    },
  };

  const content = (
    <ItemWrapper
      compact={compact}
      disableVerticalPadding={isInteractive}
      sx={wrapperSx}
    >
      {hasIcon && (
        <>
          <ItemIcon
            {...(isInteractive ? { "data-section-item-icon": true } : {})}
            src={iconSrc}
            slotProps={{ img: { alt: iconAlt ?? "" } }}
            sx={{
              borderColor: color,
              backgroundColor: isLight ? "#ffffff" : "#000000",
              display: { xs: "none", md: "flex" },
              ...(isInteractive
                ? {
                    cursor: "pointer",
                    transition: theme.transitions.create("transform", {
                      duration: 200,
                    }),
                  }
                : {}),
              ...(isLeft
                ? { left: `-${ICON_POSITION_OFFSET}px` }
                : { right: `-${ICON_POSITION_OFFSET}px` }),
              ...(iconScale && iconScale < 1
                ? {
                    "& .MuiAvatar-img": {
                      objectFit: "contain",
                      padding: "12%",
                      transform: `scale(${iconScale})`,
                    },
                  }
                : iconScale
                  ? {
                      "& .MuiAvatar-img": {
                        transform: `scale(${iconScale})`,
                      },
                    }
                  : {}),
            }}
          />
          <Box
            component="svg"
            viewBox={`0 0 ${SECTION_ICON_SIZE} ${SECTION_ICON_SIZE}`}
            sx={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              ...(isLeft
                ? { left: `-${ICON_POSITION_OFFSET}px` }
                : { right: `-${ICON_POSITION_OFFSET}px` }),
              width: SECTION_ICON_SIZE,
              height: SECTION_ICON_SIZE,
              pointerEvents: "none",
              display: { xs: "none", md: "block" },
              zIndex: 3,
            }}
            aria-hidden
          >
            <path
              d={
                isLeft
                  ? `M ${SECTION_ICON_SIZE / 2} 0 A ${SECTION_ICON_SIZE / 2} ${SECTION_ICON_SIZE / 2} 0 0 0 ${SECTION_ICON_SIZE / 2} ${SECTION_ICON_SIZE}`
                  : `M ${SECTION_ICON_SIZE / 2} 0 A ${SECTION_ICON_SIZE / 2} ${SECTION_ICON_SIZE / 2} 0 0 1 ${SECTION_ICON_SIZE / 2} ${SECTION_ICON_SIZE}`
              }
              fill="none"
              stroke={BORDER_BY_MODE[theme.palette.mode]}
              strokeWidth={1}
            />
          </Box>
        </>
      )}
      {isInteractive ? (
        <Box
          component="span"
          data-section-item-content
          sx={{ cursor: "pointer", display: "block" }}
        >
          {children}
        </Box>
      ) : (
        children
      )}
    </ItemWrapper>
  );

  if (isInteractive && onClick) {
    const paddingY = `${compact ? SECTION_ITEM_PADDING_Y / 2 : SECTION_ITEM_PADDING_Y}px`;
    const mobilePaddingY = `${compact ? MOBILE_PADDING_Y / 2 : MOBILE_PADDING_Y}px`;

    return (
      <Box
        sx={{
          paddingTop: paddingY,
          paddingBottom: paddingY,
          [theme.breakpoints.down("md")]: {
            paddingTop: mobilePaddingY,
            paddingBottom: mobilePaddingY,
          },
        }}
      >
        <Box
          component="span"
          role="button"
          tabIndex={0}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onKeyDown={(e) => handleItemKeyDown(e, onClick)}
          sx={{
            cursor: "pointer",
            display: "block",
            ...(expanded
              ? {
                  "& [data-section-item-icon]": {
                    transform: `translateY(-50%) scale(${ICON_HOVER_SCALE})`,
                  },
                }
              : {}),
            "&:hover [data-section-item-icon]": {
              transform: `translateY(-50%) scale(${ICON_HOVER_SCALE})`,
            },
          }}
        >
          {content}
        </Box>
      </Box>
    );
  }

  return content;
}

const ItemWrapper = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "compact" && prop !== "disableVerticalPadding",
})<{ compact?: boolean; disableVerticalPadding?: boolean }>(({
  theme,
  compact,
  disableVerticalPadding,
}) => {
  const minHeight = compact
    ? SECTION_ITEM_MIN_HEIGHT / 2
    : SECTION_ITEM_MIN_HEIGHT;
  const paddingY = disableVerticalPadding
    ? 0
    : compact
      ? SECTION_ITEM_PADDING_Y / 2
      : SECTION_ITEM_PADDING_Y;
  const mobilePaddingY = disableVerticalPadding
    ? 0
    : compact
      ? MOBILE_PADDING_Y / 2
      : MOBILE_PADDING_Y;
  return {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: disableVerticalPadding ? 0 : minHeight,
    paddingTop: paddingY,
    paddingBottom: paddingY,
    [theme.breakpoints.down("md")]: {
      minHeight: "auto",
      paddingTop: mobilePaddingY,
      paddingBottom: mobilePaddingY,
    },
  };
});

const ItemIcon = styled(Avatar)({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: SECTION_ICON_SIZE,
  height: SECTION_ICON_SIZE,
  borderWidth: SECTION_ICON_BORDER_WIDTH,
  borderStyle: "solid",
  zIndex: 2,
  fontSize: "0.85rem",
  overflow: "hidden",
  "& .MuiAvatar-img": {
    objectFit: "cover",
  },
});
