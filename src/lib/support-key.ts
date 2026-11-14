import { scryptSync, timingSafeEqual } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

export interface SupportUpgradeSuccess {
  ok: true;
  role: Role;
  already: boolean;
}

export interface SupportUpgradeFailure {
  ok: false;
  code: "LOCKED" | "INVALID" | "NOT_CONFIGURED" | "NO_USER";
  message: string;
  attemptsLeft?: number;
  lockedUntil?: string;
}

export type SupportUpgradeResult = SupportUpgradeSuccess | SupportUpgradeFailure;

const WINDOW_MS = 60 * 60 * 1000;

function maxAttempts(): number {
  const value = Number(process.env.SUPPORT_KEY_MAX_ATTEMPTS ?? 5);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
}

function lockMinutes(): number {
  const value = Number(process.env.SUPPORT_KEY_LOCK_MINUTES ?? 60);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 60;
}

export function verifySupportKey(key: string, storedHash = process.env.SUPPORT_KEY_HASH ?? ""): boolean {
  if (!storedHash || !key) return false;
  // Формат: scrypt:<salt>:<hash>. Legacy-формат с "$" тоже поддерживается.
  const normalized = storedHash.replace(/\\\$/g, "$");
  const delimiter = normalized.startsWith("scrypt:") ? ":" : normalized.startsWith("scrypt$") ? "$" : "";
  if (!delimiter) return false;
  const parts = normalized.split(delimiter);
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hash] = parts;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(key, salt, expected.length, { N: 16384, r: 8, p: 1 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function tryUpgradeToSupport(
  userId: string,
  inputKey: string,
): Promise<SupportUpgradeResult> {
  if (!process.env.SUPPORT_KEY_HASH) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Ключ поддержки не настроен на сервере. Обратитесь к администратору.",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, code: "NO_USER", message: "Профиль не найден. Войдите через Telegram ещё раз." };
  }

  if (user.role === "SUPPORT" || user.role === "ADMIN") {
    return { ok: true, role: user.role, already: true };
  }

  const now = new Date();
  let attempt = await prisma.supportKeyAttempt.findUnique({ where: { userId } });

  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > now.getTime()) {
    return {
      ok: false,
      code: "LOCKED",
      message: `Слишком много попыток. Попробуйте после ${attempt.lockedUntil.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}.`,
      lockedUntil: attempt.lockedUntil.toISOString(),
    };
  }

  if (attempt && now.getTime() - attempt.windowStartedAt.getTime() > WINDOW_MS) {
    attempt = await prisma.supportKeyAttempt.update({
      where: { userId },
      data: { attempts: 0, windowStartedAt: now, lockedUntil: null },
    });
  }

  if (!attempt) {
    attempt = await prisma.supportKeyAttempt.create({
      data: { userId, attempts: 0, windowStartedAt: now },
    });
  }

  if (!verifySupportKey(inputKey)) {
    const attempts = attempt.attempts + 1;
    const max = maxAttempts();
    const locked = attempts >= max;
    await prisma.supportKeyAttempt.update({
      where: { userId },
      data: {
        attempts,
        lockedUntil: locked ? new Date(now.getTime() + lockMinutes() * 60 * 1000) : null,
      },
    });

    return {
      ok: false,
      code: "INVALID",
      message: locked
        ? `Неверный ключ. Доступ заблокирован на ${lockMinutes()} мин.`
        : "Неверный ключ. Проверьте раскладку и попробуйте снова.",
      attemptsLeft: Math.max(0, max - attempts),
    };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: "SUPPORT" } }),
    prisma.supportKeyAttempt.deleteMany({ where: { userId } }),
    prisma.notification.create({
      data: {
        userId,
        type: "role",
        title: "Роль Support активирована",
        body: "Вам открыт доступ к обращениям пользователей на сайте и в боте.",
        href: "/support",
      },
    }),
  ]);

  return { ok: true, role: "SUPPORT", already: false };
}