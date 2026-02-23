/**
 * Test render wrapper providing MUI ThemeProvider and NextIntlClientProvider.
 * Use `renderWithProviders(ui)` in component tests.
 */
import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { NextIntlClientProvider } from "next-intl";
import { createAppTheme } from "@/theme";
import { THEME_MODE_DARK, type ThemeMode } from "@/constants/site";
import enMessages from "@/messages/en.json";

interface WrapperOptions {
  mode?: ThemeMode;
  locale?: string;
  messages?: Record<string, unknown>;
}

function createWrapper({
  mode = THEME_MODE_DARK,
  locale = "en",
  messages = enMessages as Record<string, unknown>,
}: WrapperOptions = {}) {
  const theme = createAppTheme(mode);

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          {children}
        </NextIntlClientProvider>
      </ThemeProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & WrapperOptions
) {
  const { mode, locale, messages, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: createWrapper({ mode, locale, messages }),
    ...renderOptions,
  });
}
