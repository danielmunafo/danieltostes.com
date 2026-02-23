"use client";

import { useState } from "react";
import LanguageIcon from "@mui/icons-material/Language";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useLocale } from "next-intl";
import { useLocaleRuntime } from "@/contexts/LocaleRuntimeContext";
import { LOCALE_OPTIONS } from "@/i18n/request";
import { BORDER_BY_MODE, GLASS_BG_BY_MODE } from "@/constants/site";
import { GLASS_BLUR } from "@/constants/sections";

export function LocaleSwitcher() {
  const locale = useLocale();
  const { setLocale, isSwitching } = useLocaleRuntime();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (code: (typeof LOCALE_OPTIONS)[number]["code"]) => {
    setLocale(code);
    handleClose();
  };

  const currentName =
    LOCALE_OPTIONS.find((o) => o.code === locale)?.name ?? locale;

  return (
    <>
      <IconButton
        id="locale-menu-button"
        color="inherit"
        onClick={handleOpen}
        disabled={isSwitching}
        aria-label={currentName}
        aria-controls={open ? "locale-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        <LanguageIcon aria-hidden />
      </IconButton>
      <Menu
        id="locale-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: { "aria-labelledby": "locale-menu-button" },
          paper: {
            sx: (theme) => {
              const mode = theme.palette.mode;
              return {
                backgroundColor: GLASS_BG_BY_MODE[mode],
                backdropFilter: `blur(${GLASS_BLUR}px)`,
                WebkitBackdropFilter: `blur(${GLASS_BLUR}px)`,
                border: `1px solid ${BORDER_BY_MODE[mode]}`,
              };
            },
          },
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {LOCALE_OPTIONS.map(({ code, name }) => (
          <MenuItem
            key={code}
            selected={locale === code}
            onClick={() => handleSelect(code)}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
