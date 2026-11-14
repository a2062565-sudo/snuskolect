import { randomBytes } from "crypto";
import type { Role, User } from "@prisma/client";
import { prisma } from "./prisma";
import { isReservedSlug, slugify } from "./slug";

export interface TelegramProfile {
  id: string;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  photoUrl?: string | null;
}

export function roleRank(role: Role): number {
  if (role === "ADMIN") return 3;
  if (role === "SUPPORT") return 2;
  return 1;
}

function parseTelegramIds(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(/[,;\s]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

async function uniqueSlug(base: string, excludeUserId?: string): Promise<string> {
  let candidate = isReservedSlug(base) ? `${base}-${randomBytes(2).toString("hex")}` : base;
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.user.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeUserId) return candidate;
    candidate = `${base}-${randomBytes(3).toString("hex")}`;
  }
  return `${base}-${randomBytes(6).toString("hex")}`;
}

export async function ensureUniqueUserSlug(user: User, desired: string): Promise<string> {
  const base = slugify(desired) || user.slug;
  return uniqueSlug(base, user.id);
}

export async function provisionTelegramUser(profile: TelegramProfile): Promise<User> {
  const telegramId = String(profile.id);
  const firstName = profile.firstName?.trim() || "Коллекционер";
  const lastName = profile.lastName?.trim() || null;
  const username = profile.username?.trim().replace(/^@/, "") || null;
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const adminIds = parseTelegramIds(process.env.ADMIN_TELEGRAM_IDS);
  const supportIds = parseTelegramIds(process.env.SUPPORT_TELEGRAM_IDS);
  const envRole: Role | null = adminIds.has(telegramId)
    ? "ADMIN"
    : supportIds.has(telegramId)
      ? "SUPPORT"
      : null;

  const existing = await prisma.user.findUnique({ where: { telegramId } });

  if (existing) {
    const nextRole =
      envRole && roleRank(envRole) > roleRank(existing.role) ? envRole : existing.role;
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        username,
        displayName: existing.displayName || displayName,
        photoUrl: profile.photoUrl ?? existing.photoUrl,
        role: nextRole,
        lastLoginAt: new Date(),
      },
    });
  }

  const slug = await uniqueSlug(slugify(username || displayName));
  return prisma.user.create({
    data: {
      telegramId,
      username,
      slug,
      firstName,
      lastName,
      displayName,
      photoUrl: profile.photoUrl ?? null,
      role: envRole ?? "USER",
      lastLoginAt: new Date(),
    },
  });
}
