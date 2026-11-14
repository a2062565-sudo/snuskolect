import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { TelegramProfile } from "./provision";

export interface TelegramWidgetData {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string | number;
  hash?: string;
  [key: string]: unknown;
}

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function isTelegramConfigured(): boolean {
  return Boolean(botToken() && process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim());
}

export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() || "";
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function isValidAuthDate(raw: unknown): boolean {
  const authDate = Number(raw);
  if (!Number.isFinite(authDate)) return false;
  const maxAge = Number(process.env.TELEGRAM_LOGIN_MAX_AGE_SECONDS ?? 86400) || 86400;
  const now = Math.floor(Date.now() / 1000);
  return authDate <= now + 300 && now - authDate <= maxAge;
}

/**
 * Validates Telegram Login Widget payload.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(data: TelegramWidgetData): TelegramProfile | null {
  const token = botToken();
  const receivedHash = typeof data.hash === "string" ? data.hash : "";
  if (!token || !receivedHash) return null;
  if (!isValidAuthDate(data.auth_date)) return null;

  const checkString = Object.keys(data)
    .filter((key) => key !== "hash" && data[key] !== undefined && data[key] !== null)
    .sort()
    .map((key) => `${key}=${String(data[key])}`)
    .join("\n");

  const secret = createHash("sha256").update(token).digest();
  const calculated = createHmac("sha256", secret).update(checkString).digest("hex");
  if (!safeEqualHex(calculated, receivedHash)) return null;

  const id = String(data.id ?? "");
  if (!/^\d{4,20}$/.test(id)) return null;
  if (!data.first_name) return null;

  return {
    id,
    firstName: String(data.first_name),
    lastName: data.last_name ? String(data.last_name) : null,
    username: data.username ? String(data.username) : null,
    photoUrl: data.photo_url ? String(data.photo_url) : null,
  };
}

/**
 * Validates Telegram Mini App initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramMiniApp(initData: string): TelegramProfile | null {
  const token = botToken();
  if (!token || !initData) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = params.get("auth_date");
  if (!receivedHash || !authDate || !isValidAuthDate(authDate)) return null;

  const checkString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const calculated = createHmac("sha256", secretKey).update(checkString).digest("hex");
  if (!safeEqualHex(calculated, receivedHash)) return null;

  try {
    const rawUser = params.get("user");
    if (!rawUser) return null;
    const user = JSON.parse(rawUser) as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
    if (!user.id || !user.first_name) return null;
    return {
      id: String(user.id),
      firstName: user.first_name,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
      photoUrl: user.photo_url ?? null,
    };
  } catch {
    return null;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface TelegramSendOptions {
  parseMode?: "HTML";
  disablePreview?: boolean;
  replyMarkup?: unknown;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: TelegramSendOptions = {},
): Promise<boolean> {
  const token = botToken();
  if (!token || !chatId) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
        disable_web_page_preview: options.disablePreview ?? true,
        ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function telegramBotLink(start?: string): string | null {
  const username = getBotUsername();
  if (!username) return null;
  return `https://t.me/${username}${start ? `?start=${encodeURIComponent(start)}` : ""}`;
}

export async function notifySupportChat(text: string): Promise<void> {
  const chatId = process.env.SUPPORT_CHAT_ID?.trim();
  if (!chatId) return;
  await sendTelegramMessage(chatId, text);
}