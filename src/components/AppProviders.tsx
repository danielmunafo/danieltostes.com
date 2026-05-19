"use client";

import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { useRestorePreservedLocationHash } from "@/hooks/useRestorePreservedLocationHash";
import { ThemeRegistry } from "./ThemeRegistry";
import { TopBar } from "./TopBar";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useRestorePreservedLocationHash();

  return (
    <ThemeModeProvider>
      <ThemeRegistry>
        <PageLayout>
          <TopBar />
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

const Main = styled("main")({
  flex: 1,
});
