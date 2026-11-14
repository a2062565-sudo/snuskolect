import type { ThemePreset, ThemeSettings } from "./types";
import { z } from "zod";

export interface ThemePalette {
  bg: string;
  surface: string;
  surface2: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  ambient: string;
  shadow: string;
}

export const THEME_PRESETS: {
  id: Exclude<ThemePreset, "custom">;
  name: string;
  hint: string;
  colors: [string, string, string];
}[] = [
  { id: "light", name: "Light", hint: "Тёплый светлый", colors: ["#f4f4f1", "#ffffff", "#236a55"] },
  { id: "dark", name: "Dark", hint: "Глубокий графит", colors: ["#0a0a0a", "#171717", "#a9d8bf"] },
  { id: "midnight", name: "Midnight", hint: "Синий космос", colors: ["#061017", "#0d1c27", "#6bb6ff"] },
  { id: "graphite", name: "Graphite", hint: "Монохром", colors: ["#181818", "#252525", "#e8e8e4"] },
  { id: "aurora", name: "Aurora", hint: "Мягкие градиенты", colors: ["#f1eefa", "#fbf9ff", "#6d5bd0"] },
];

export const DEFAULT_CUSTOM = {
  primary: "#20241f",
  accent: "#2f725d",
  background: "#f4f4f1",
  card: "#ffffff",
  radius: 24,
};

export const DEFAULT_THEME: ThemeSettings = {
  preset: "light",
  custom: DEFAULT_CUSTOM,
};

export const themeSettingsSchema = z.object({
  preset: z.enum(["light", "dark", "midnight", "graphite", "aurora", "custom"]),
  custom: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    card: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    radius: z.number().min(0).max(36),
  }),
});

export const PALETTES: Record<Exclude<ThemePreset, "custom">, ThemePalette> = {
  light: {
    bg: "#f4f4f1",
    surface: "#fbfbf9",
    surface2: "#f0f0ec",
    card: "#ffffff",
    ink: "#141512",
    muted: "#74746d",
    line: "rgba(20, 22, 18, 0.10)",
    accent: "#236a55",
    accentInk: "#f4fff9",
    accentSoft: "rgba(35, 106, 85, 0.10)",
    ambient:
      "radial-gradient(ellipse 70% 45% at 16% -10%, rgba(140,171,151,0.20), transparent 60%), radial-gradient(ellipse 55% 40% at 92% 4%, rgba(219,198,161,0.18), transparent 65%)",
    shadow: "0 20px 60px -32px rgba(20, 22, 18, 0.28)",
  },
  dark: {
    bg: "#090909",
    surface: "#101010",
    surface2: "#151515",
    card: "#161616",
    ink: "#f2f2ee",
    muted: "#96968e",
    line: "rgba(255, 255, 255, 0.09)",
    accent: "#a9d8bf",
    accentInk: "#0b1a12",
    accentSoft: "rgba(169, 216, 191, 0.11)",
    ambient:
      "radial-gradient(ellipse 65% 40% at 12% -8%, rgba(96,134,110,0.15), transparent 60%), radial-gradient(ellipse 50% 38% at 94% 0%, rgba(110,90,60,0.10), transparent 65%)",
    shadow: "0 24px 80px -36px rgba(0, 0, 0, 0.7)",
  },
  midnight: {
    bg: "#061017",
    surface: "#0a1720",
    surface2: "#0e1e29",
    card: "#0c1b25",
    ink: "#edf5fa",
    muted: "#839daa",
    line: "rgba(166, 210, 235, 0.11)",
    accent: "#6bb6ff",
    accentInk: "#04121f",
    accentSoft: "rgba(107, 182, 255, 0.12)",
    ambient:
      "radial-gradient(ellipse 70% 50% at 14% -10%, rgba(50,122,180,0.28), transparent 62%), radial-gradient(ellipse 55% 45% at 92% 3%, rgba(100,74,159,0.16), transparent 68%)",
    shadow: "0 24px 80px -36px rgba(0, 5, 10, 0.8)",
  },
  graphite: {
    bg: "#181818",
    surface: "#1e1e1e",
    surface2: "#242424",
    card: "#242424",
    ink: "#efefeb",
    muted: "#9c9c97",
    line: "rgba(255, 255, 255, 0.10)",
    accent: "#e8e8e2",
    accentInk: "#161616",
    accentSoft: "rgba(232, 232, 226, 0.09)",
    ambient:
      "radial-gradient(ellipse 65% 45% at 20% -10%, rgba(255,255,255,0.07), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 0%, rgba(255,255,255,0.04), transparent 65%)",
    shadow: "0 24px 80px -36px rgba(0, 0, 0, 0.65)",
  },
  aurora: {
    bg: "#f0edf9",
    surface: "#f8f5ff",
    surface2: "#ece7f8",
    card: "rgba(255, 255, 255, 0.82)",
    ink: "#241f34",
    muted: "#77708f",
    line: "rgba(70, 52, 110, 0.12)",
    accent: "#6d5bd0",
    accentInk: "#faf8ff",
    accentSoft: "rgba(109, 91, 208, 0.11)",
    ambient:
      "radial-gradient(ellipse 65% 50% at 8% -10%, rgba(185,165,255,0.55), transparent 60%), radial-gradient(ellipse 55% 45% at 88% 0%, rgba(255,200,220,0.45), transparent 65%), radial-gradient(ellipse 50% 40% at 55% 110%, rgba(168,230,218,0.4), transparent 60%)",
    shadow: "0 24px 80px -36px rgba(55, 40, 95, 0.25)",
  },
};

export function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6;
}

export function contrastInk(hex: string): string {
  return isLightColor(hex) ? "#121411" : "#f7f8f5";
}

export function getPalette(settings: ThemeSettings): ThemePalette {
  if (settings.preset !== "custom") {
    return PALETTES[settings.preset];
  }
  const c = settings.custom;
  const dark = !isLightColor(c.background);
  return {
    bg: c.background,
    surface: c.card,
    surface2: `color-mix(in srgb, ${c.card} 82%, ${c.background})`,
    card: c.card,
    ink: c.primary,
    muted: `color-mix(in srgb, ${c.primary} 55%, ${c.background})`,
    line: dark ? "rgba(255,255,255,0.10)" : "rgba(20,22,18,0.10)",
    accent: c.accent,
    accentInk: contrastInk(c.accent),
    accentSoft: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
    ambient: `radial-gradient(ellipse 70% 45% at 14% -8%, color-mix(in srgb, ${c.accent} 15%, transparent), transparent 62%)`,
    shadow: dark
      ? "0 24px 80px -36px rgba(0,0,0,0.7)"
      : "0 20px 60px -32px rgba(20,22,18,0.25)",
  };
}

export function getRadius(settings: ThemeSettings): number {
  if (settings.preset === "custom") return settings.custom.radius;
  return settings.preset === "aurora" ? 28 : 24;
}

export function themeCssVars(settings: ThemeSettings): Record<string, string> {
  const palette = getPalette(settings);
  return {
    "--bg": palette.bg,
    "--surface": palette.surface,
    "--surface-2": palette.surface2,
    "--card": palette.card,
    "--ink": palette.ink,
    "--muted": palette.muted,
    "--line": palette.line,
    "--accent": palette.accent,
    "--accent-ink": palette.accentInk,
    "--accent-soft": palette.accentSoft,
    "--ambient": palette.ambient,
    "--card-shadow": palette.shadow,
    "--radius": `${getRadius(settings)}px`,
    "--radius-sm": `${Math.max(8, Math.round(getRadius(settings) * 0.5))}px`,
    "--radius-lg": `${Math.round(getRadius(settings) * 1.35)}px`,
    colorScheme: isLightColor(palette.bg) ? "light" : "dark",
  };
}

export function normalizeTheme(value: unknown): ThemeSettings {
  const parsed = themeSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

export function getThemePresetName(preset: ThemePreset): string {
  if (preset === "custom") return "Своя тема";
  return THEME_PRESETS.find((p) => p.id === preset)?.name ?? "Light";
}