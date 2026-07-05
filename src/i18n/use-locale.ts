"use client";

import { useState, useEffect } from "react";
import type { Locale } from "./config";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // Load saved locale from localStorage
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && ["en", "es", "fr", "de"].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale): void => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return { locale, setLocale };
}