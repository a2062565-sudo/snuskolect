import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { getCurrentUser } from "@/lib/auth";
import { normalizeTheme, themeCssVars } from "@/lib/themes";

export const metadata: Metadata = {
  title: {
    default: "KAPS — коллекция крышек снюса",
    template: "%s · KAPS",
  },
  description:
    "KAPS — личный архив крышек от снюса. Сканируй, коллекционируй редкие находки, открывай достижения и следи за прогрессом коллекции.",
  applicationName: "KAPS",
  keywords: ["снюс", "крышки", "коллекция", "snus", "KAPS", "коллекционирование"],
  authors: [{ name: "KAPS" }],
  openGraph: {
    title: "KAPS — коллекция крышек снюса",
    description: "Каждая крышка — часть твоей коллекции.",
    type: "website",
    locale: "ru_RU",
    siteName: "KAPS",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f4f1",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const theme = normalizeTheme(user?.theme);
  const vars = themeCssVars(theme) as CSSProperties;

  return (
    <html lang="ru" className="h-full" style={vars} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider initialTheme={theme}>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
