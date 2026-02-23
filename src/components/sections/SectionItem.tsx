"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { styled, useTheme } from "@mui/material/styles";
import {
  CONTENT_COLUMN_PADDING_X,
  ICON_POSITION_OFFSET,
  ICON_SIDE_PADDING,
  SECTION_COLORS,
  SECTION_ICON_BORDER_WIDTH,
  SECTION_ICON_SIZE,
  SECTION_ITEM_MIN_HEIGHT,
  SECTION_ITEM_PADDING_Y,
  type SectionId,
} from "@/constants/sections";

const MOBILE_PADDING_X = CONTENT_COLUMN_PADDING_X / 2;
const MOBILE_PADDING_Y = SECTION_ITEM_PADDING_Y / 2;

interface SectionItemProps {
  sectionId: SectionId;
  side: "left" | "right";
  /** Optional image path for the icon; falls back to a colored placeholder. */
  iconSrc?: string;
  /** Alt text for the icon image when iconSrc is set (required for accessibility). */
  iconAlt?: string;
  /** Optional scale multiplier for the icon image (e.g. 1.2 = 20% zoom in). */
  iconScale?: number;
  children: React.ReactNode;
}

/**
 * Wraps a titled content block with a circular icon vertically centered
 * on the specified side, overflowing the content column edge.
 * Content is vertically centered within a guaranteed minimum height.
 */
export function SectionItem({
  sectionId,
  side,
  iconSrc,
  iconAlt,
  iconScale,
  children,
}: SectionItemProps) {
  const theme = useTheme();
  const color = SECTION_COLORS[theme.palette.mode][sectionId];
  const isLight = theme.palette.mode === "light";
  const isLeft = side === "left";
  const hasIcon = Boolean(iconSrc);

  return (
    <ItemWrapper
      sx={{
        pl: {
          xs: `${MOBILE_PADDING_X}px`,
          md: `${CONTENT_COLUMN_PADDING_X + (hasIcon && isLeft ? ICON_SIDE_PADDING : 0)}px`,
        },
        pr: {
          xs: `${MOBILE_PADDING_X}px`,
          md: `${CONTENT_COLUMN_PADDING_X + (hasIcon && !isLeft ? ICON_SIDE_PADDING : 0)}px`,
        },
      }}
    >
      {hasIcon && (
        <ItemIcon
          src={iconSrc}
          slotProps={{ img: { alt: iconAlt ?? "" } }}
          sx={{
            borderColor: color,
            backgroundColor: isLight ? "#ffffff" : "#000000",
            display: { xs: "none", md: "flex" },
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
      )}
      {children}
    </ItemWrapper>
  );
}

const ItemWrapper = styled(Box)(({ theme }) => ({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minHeight: SECTION_ITEM_MIN_HEIGHT,
  paddingTop: SECTION_ITEM_PADDING_Y,
  paddingBottom: SECTION_ITEM_PADDING_Y,
  [theme.breakpoints.down("md")]: {
    minHeight: "auto",
    paddingTop: MOBILE_PADDING_Y,
    paddingBottom: MOBILE_PADDING_Y,
  },
}));

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
