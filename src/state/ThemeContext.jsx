import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "qring_theme";
const THEME_EXPLICIT_KEY = "qring_theme_explicit";

function getInitialThemeMode() {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);

  if (stored === "light" || stored === "dark") return stored;

  if (stored === "system") {
    const explicit = localStorage.getItem(THEME_EXPLICIT_KEY) === "true";
    if (explicit) return "system";
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // ignore
    }
    return "light";
  }

  return "light";
}

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

  function setThemeMode(next) {
    try {
      localStorage.setItem(THEME_EXPLICIT_KEY, "true");
    } catch {
      // ignore
    }
    setThemeModeState(next);
  }

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemTheme(event.matches ? "dark" : "light");
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode, resolvedTheme]);

  const value = useMemo(
    () => ({
      theme: themeMode,
      themeMode,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      setThemeMode,
      toggleTheme: () =>
        setThemeMode((prev) => {
          const current = prev === "system" ? resolvedTheme : prev;
          return current === "dark" ? "light" : "dark";
        })
    }),
    [themeMode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
