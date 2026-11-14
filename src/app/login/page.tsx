import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBotUsername, isTelegramConfigured } from "@/lib/telegram";
import { LoginPanel } from "@/components/auth/login-panel";

export const metadata: Metadata = {
  title: "Вход",
  description: "Войди в KAPS через Telegram и открой личный архив крышек.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const devLoginEnabled =
    process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";

  return (
    <LoginPanel
      botUsername={getBotUsername()}
      telegramConfigured={isTelegramConfigured()}
      devLoginEnabled={devLoginEnabled}
    />
  );
}
