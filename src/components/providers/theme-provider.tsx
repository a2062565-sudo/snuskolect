"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_THEME, normalizeTheme, themeCssVars } from "@/lib/themes";
import type { ThemeSettings } from "@/lib/types";

interface ThemeContextValue {
  theme: ThemeSettings;
  setTheme: (theme: ThemeSettings) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(settings: ThemeSettings) {
  const vars = themeCssVars(settings);
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    if (name === "colorScheme") continue;
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = vars.colorScheme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", vars["--bg"]);
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme?: ThemeSettings | null;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeSettings>(() => normalizeTheme(initialTheme));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeSettings) => {
    setThemeState(normalizeTheme(next));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(DEFAULT_THEME);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resetTheme }),
    [theme, setTheme, resetTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
