"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { DEFAULT_TIME_ZONE } from "@/constants/site";
import type { Locale } from "@/i18n/request";
import { NextIntlClientProvider } from "next-intl";

type Messages = Record<string, unknown>;

type LocaleRuntimeContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isSwitching: boolean;
};

const LocaleRuntimeContext = createContext<LocaleRuntimeContextValue | null>(
  null
);

export function useLocaleRuntime(): LocaleRuntimeContextValue {
  const ctx = useContext(LocaleRuntimeContext);
  if (!ctx)
    throw new Error(
      "useLocaleRuntime must be used within LocaleRuntimeProvider"
    );
  return ctx;
}

type LocaleRuntimeProviderProps = {
  initialLocale: Locale;
  initialMessages: Messages;
  children: React.ReactNode;
};

export function LocaleRuntimeProvider({
  initialLocale,
  initialMessages,
  children,
}: LocaleRuntimeProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);
  const [isSwitching, setIsSwitching] = useState(false);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;
      setIsSwitching(true);
      import(`@/messages/${newLocale}.json`)
        .then((m) => {
          setMessages(m.default);
          setLocaleState(newLocale);
          const { pathname, search, hash } = window.location;
          const segments = pathname.split("/").filter(Boolean);
          const nextPath =
            segments.length === 0
              ? `/${newLocale}`
              : `/${[newLocale, ...segments.slice(1)].join("/")}`;
          window.history.replaceState(null, "", `${nextPath}${search}${hash}`);
        })
        .finally(() => setIsSwitching(false));
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, isSwitching }),
    [locale, setLocale, isSwitching]
  );

  return (
    <LocaleRuntimeContext.Provider value={value}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone={DEFAULT_TIME_ZONE}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleRuntimeContext.Provider>
  );
}
