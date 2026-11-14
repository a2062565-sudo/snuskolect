import type { Achievement, UserAchievement } from "@prisma/client";
import { prisma } from "./prisma";
import { emptyRarityCounts } from "./stats";
import { RARITY_META } from "./rarity";
import { toAchievementDTO } from "./dto";
import type { AchievementDTO, Rarity } from "./types";
import { appUrl, escapeHtml, sendTelegramMessage } from "./telegram";

interface UserMetricCounts {
  total: number;
  rarityCounts: Record<Rarity, number>;
  manufacturerCount: number;
}

async function getUserMetricCounts(userId: string): Promise<UserMetricCounts> {
  const [total, rarityGroups, manufacturerGroups] = await Promise.all([
    prisma.collectionItem.count({ where: { userId } }),
    prisma.collectionItem.groupBy({
      by: ["rarity"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.collectionItem.groupBy({
      by: ["manufacturerId"],
      where: { userId, manufacturerId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const rarityCounts = emptyRarityCounts();
  for (const group of rarityGroups) {
    rarityCounts[group.rarity as Rarity] = group._count._all;
  }

  return {
    total,
    rarityCounts,
    manufacturerCount: manufacturerGroups.length,
  };
}

export function achievementValue(achievement: Achievement, counts: UserMetricCounts): number {
  switch (achievement.metric) {
    case "CAP_COUNT":
      return counts.total;
    case "RARITY_COUNT":
      return achievement.rarity ? counts.rarityCounts[achievement.rarity as Rarity] ?? 0 : 0;
    case "MANUFACTURER_COUNT":
      return counts.manufacturerCount;
    default:
      return 0;
  }
}

export async function evaluateAchievements(
  userId: string,
  options: { notify?: boolean } = {},
): Promise<AchievementDTO[]> {
  const [definitions, counts, existing] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getUserMetricCounts(userId),
    prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
  ]);

  const existingKeys = new Set(existing.map((entry) => entry.achievement.key));
  const newlyUnlocked = definitions.filter(
    (definition) => !existingKeys.has(definition.key) && achievementValue(definition, counts) >= definition.target,
  );

  if (newlyUnlocked.length === 0) return [];

  await prisma.userAchievement.createMany({
    data: newlyUnlocked.map((achievement) => ({ userId, achievementId: achievement.id })),
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: newlyUnlocked.map((achievement) => ({
      userId,
      type: "achievement",
      title: `Достижение: ${achievement.title}`,
      body: achievement.description,
      href: "/achievements",
    })),
  });

  const saved = await prisma.userAchievement.findMany({
    where: { userId, achievementId: { in: newlyUnlocked.map((a) => a.id) } },
    include: { achievement: true },
  });

  if (options.notify !== false && saved.length > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    if (user?.telegramId && /^\d+$/.test(user.telegramId) && process.env.TELEGRAM_BOT_TOKEN) {
      const lines = saved
        .map((entry) => `🏆 <b>${escapeHtml(entry.achievement.title)}</b> — ${escapeHtml(entry.achievement.description)}`)
        .join("\n");
      await sendTelegramMessage(
        user.telegramId,
        `Новое достижение в KAPS!\n\n${lines}\n\n<a href="${appUrl()}/achievements">Открыть достижения</a>`,
      );
    }
  }

  return saved.map((entry) =>
    toAchievementDTO(
      entry.achievement,
      entry,
      achievementValue(entry.achievement, counts),
    ),
  );
}

export async function getUserAchievements(userId: string): Promise<AchievementDTO[]> {
  const [definitions, unlocked, counts] = await Promise.all([
    prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.userAchievement.findMany({ where: { userId } }),
    getUserMetricCounts(userId),
  ]);

  const unlockedMap = new Map<string, UserAchievement>(
    unlocked.map((entry) => [entry.achievementId, entry]),
  );

  return definitions.map((definition) =>
    toAchievementDTO(
      definition,
      unlockedMap.get(definition.id) ?? null,
      achievementValue(definition, counts),
    ),
  );
}

export function achievementRarityLabel(rarity: Rarity | null): string {
  if (!rarity) return "";
  return RARITY_META[rarity].label;
}