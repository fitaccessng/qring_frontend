import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "qring_theme";

function getInitialThemeMode() {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = themeMode === "system" ? systemTheme : themeMode;

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
