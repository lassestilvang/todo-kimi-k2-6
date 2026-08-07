import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./config";
import type { Locale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  // Get locale from request, cookies, or default
  const locale = (await requestLocale) || defaultLocale;

  // Validate locale
  const validLocale: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`../../messages/${validLocale}.json`)).default,
  };
});