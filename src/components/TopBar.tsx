"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { SITE_AUTHOR_DISPLAY_NAME } from "@/constants/site";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  return (
    <AppBar position="static" color="primary" enableColorOnDark>
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
