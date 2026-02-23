"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import {
  GLASS_BG_BY_MODE,
  GLASS_SHADOW_BY_MODE,
  SITE_AUTHOR_DISPLAY_NAME,
  TEXT_ON_GLASS_BY_MODE,
} from "@/constants/site";
import { GLASS_BLUR } from "@/constants/sections";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={(theme) => {
        const mode = theme.palette.mode;
        return {
          backgroundColor: GLASS_BG_BY_MODE[mode],
          backdropFilter: `blur(${GLASS_BLUR}px)`,
          WebkitBackdropFilter: `blur(${GLASS_BLUR}px)`,
          color: TEXT_ON_GLASS_BY_MODE[mode],
          boxShadow: GLASS_SHADOW_BY_MODE[mode],
        };
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component="span"
          color="inherit"
          sx={{ flexGrow: 1 }}
        >
          {SITE_AUTHOR_DISPLAY_NAME}
        </Typography>
        <Box
          component="div"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <LocaleSwitcher />
          <ThemeToggle />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
