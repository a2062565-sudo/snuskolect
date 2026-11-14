import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getCollectorLevel } from "./levels";
import { RARITY_ORDER } from "./rarity";
import type { Rarity, UserStatsDTO } from "./types";
import { toItemDTO } from "./dto";

export const itemInclude = {
  manufacturer: { select: { id: true, name: true, slug: true, accent: true } },
  capModel: { select: { id: true, brand: true, name: true, slug: true } },
} satisfies Prisma.CollectionItemInclude;

export function emptyRarityCounts(): Record<Rarity, number> {
  return Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, 0])) as Record<Rarity, number>;
}

export async function getCollectionStats(userId: string): Promise<UserStatsDTO> {
  const [
    totalCaps,
    uniqueModelRows,
    catalogTotal,
    achievementCount,
    rarityGroups,
    manufacturerGroups,
    rarest,
    dateRange,
  ] = await Promise.all([
    prisma.collectionItem.count({ where: { userId } }),
    prisma.collectionItem.findMany({
      where: { userId, capModelId: { not: null } },
      distinct: ["capModelId"],
      select: { capModelId: true },
    }),
    prisma.capModel.count({ where: { isActive: true } }),
    prisma.userAchievement.count({ where: { userId } }),
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
    prisma.collectionItem.findFirst({
      where: { userId },
      include: itemInclude,
      orderBy: [{ rarity: "desc" }, { createdAt: "desc" }],
    }),
    prisma.collectionItem.aggregate({
      where: { userId },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
  ]);

  const rarityCounts = emptyRarityCounts();
  for (const group of rarityGroups) {
    rarityCounts[group.rarity as Rarity] = group._count._all;
  }

  const uniqueModels = uniqueModelRows.length;
  const progress = catalogTotal > 0 ? Math.round((uniqueModels / catalogTotal) * 100) : 0;
  const level = getCollectorLevel(rarityCounts, achievementCount);
  const firstAddedAt = dateRange._min.createdAt ?? null;
  const daysCollecting = firstAddedAt
    ? Math.max(1, Math.ceil((Date.now() - firstAddedAt.getTime()) / 86_400_000))
    : 0;

  return {
    totalCaps,
    uniqueModels,
    catalogTotal,
    progress,
    manufacturerCount: manufacturerGroups.length,
    achievementCount,
    rarityCounts,
    level,
    rarest: rarest ? toItemDTO(rarest) : null,
    firstAddedAt: firstAddedAt?.toISOString() ?? null,
    lastAddedAt: dateRange._max.createdAt?.toISOString() ?? null,
    daysCollecting,
  };
}

export async function getRecentItems(userId: string, take = 6) {
  const items = await prisma.collectionItem.findMany({
    where: { userId },
    include: itemInclude,
    orderBy: { createdAt: "desc" },
    take,
  });
  return items.map(toItemDTO);
}

export async function getCollectionItems(userId: string) {
  const items = await prisma.collectionItem.findMany({
    where: { userId },
    include: itemInclude,
    orderBy: { createdAt: "desc" },
  });
  return items.map(toItemDTO);
}

export async function getCollectionItem(id: string) {
  const item = await prisma.collectionItem.findUnique({
    where: { id },
    include: {
      ...itemInclude,
      user: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          isPublic: true,
        },
      },
    },
  });
  return item;
}