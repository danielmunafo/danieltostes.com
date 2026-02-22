"use client";

import { useLocale } from "next-intl";
import Box from "@mui/material/Box";
import { useLocaleRuntime } from "@/contexts/LocaleRuntimeContext";
import { LOCALE_OPTIONS } from "@/i18n/request";

export function LocaleSwitcher() {
  const locale = useLocale();
  const { setLocale, isSwitching } = useLocaleRuntime();

  return (
    <Box component="nav" sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      {LOCALE_OPTIONS.map(({ code, label }) => (
        <Box
          key={code}
          component="button"
          type="button"
          onClick={() => setLocale(code)}
          disabled={isSwitching}
          aria-pressed={locale === code}
          sx={{
            fontSize: "0.875rem",
            border: "none",
            background: "none",
            cursor: isSwitching ? "wait" : "pointer",
            color: "inherit",
            font: "inherit",
            textDecoration: locale === code ? "underline" : "none",
            "&:hover": { textDecoration: "underline" },
            "&:disabled": { opacity: 0.7 },
          }}
        >
          {label}
        </Box>
      ))}
    </Box>
  );
}
