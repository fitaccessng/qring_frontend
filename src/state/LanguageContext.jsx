import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "qring_language";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Francais", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "ig", label: "Igbo", nativeLabel: "Igbo", dir: "ltr" }
];

const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0];
const LanguageContext = createContext(null);

function getStoredLanguageCode() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE.code;
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (LANGUAGE_OPTIONS.some((option) => option.code === stored)) {
    return stored;
  }
  return DEFAULT_LANGUAGE.code;
}

function getLanguageByCode(code) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code) || DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguageCode);

  useEffect(() => {
    const selected = getLanguageByCode(language);
    const root = document.documentElement;
    root.lang = selected.code;
    root.dir = selected.dir;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, selected.code);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      languageOptions: LANGUAGE_OPTIONS,
      selectedLanguage: getLanguageByCode(language),
      setLanguage: (nextLanguage) => setLanguageState(getLanguageByCode(nextLanguage).code)
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
