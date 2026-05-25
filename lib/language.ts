"use client";

import { useEffect, useState } from "react";

export type Language = "zh" | "en";

export const LANGUAGE_KEY = "beauty_boat_language";

function isLanguage(value: string | null): value is Language {
  return value === "zh" || value === "en";
}

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem(LANGUAGE_KEY);
  return isLanguage(stored) ? stored : "zh";
}

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<Language>("zh");

  useEffect(() => {
    setLanguageState(readStoredLanguage());
  }, []);

  function setLanguage(nextLanguage: Language) {
    window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }

  return { language, setLanguage };
}
