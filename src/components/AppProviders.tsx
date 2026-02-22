"use client";

import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeRegistry } from "./ThemeRegistry";
import { ThemeToggle } from "./ThemeToggle";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeModeProvider>
      <ThemeRegistry>
        <PageLayout>
          <Header>
            <LocaleSwitcher />
            <ThemeToggle />
          </Header>
          <Main>{children}</Main>
        </PageLayout>
      </ThemeRegistry>
    </ThemeModeProvider>
  );
}

const PageLayout = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
}));

const Header = styled("header")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Main = styled("main")({
  flex: 1,
});
