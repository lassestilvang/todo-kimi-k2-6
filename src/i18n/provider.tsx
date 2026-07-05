"use client";

import { NextIntlClientProvider } from "next-intl";
import { useLocale } from "./use-locale";
import type { Locale } from "./config";

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: Locale;
}

export function I18nProvider({ children, locale = "en" }: I18nProviderProps) {
  const { locale: detectedLocale, setLocale } = useLocale();
  const activeLocale = locale || detectedLocale;

  return (
    <NextIntlClientProvider
      locale={activeLocale}
      messages={require(`../../messages/${activeLocale}.json`)}
    >
      {children}
    </NextIntlClientProvider>
  );
}