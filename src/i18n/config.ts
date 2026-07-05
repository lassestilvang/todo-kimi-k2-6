import { createIntl } from "next-intl";

export const locales = ["en", "es", "fr", "de"] as const;
export type Locale = (typeof locales)[number];

export function getRequestConfig(locale: Locale) {
  return {
    messages: require(`../../messages/${locale}.json`),
  };
}

// Supported locales with names
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};