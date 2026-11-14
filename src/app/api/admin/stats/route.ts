import { NextResponse } from "next/server";
import { requireAdminApi, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toAdminUserDTO, toItemDTO } from "@/lib/dto";
import { emptyRarityCounts } from "@/lib/stats";
import type { AdminStatsDTO, Rarity } from "@/lib/types";

export const runtime = "nodejs";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
    .format(date)
    .replace(".", "");
}

export async function GET() {
  try {
    await requireAdminApi();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const chartStart = new Date(startOfToday);
    chartStart.setDate(chartStart.getDate() - 13);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      realUsers,
      demoUsers,
      totalCaps,
      demoCaps,
      catalogModels,
      openTickets,
      scansToday,
      pageViewsToday,
      pageViews7d,
      rarityGroups,
      recentUsers,
      recentCaps,
      manufacturerGroups,
      eventRows,
      capRows,
      userRows,
    ] = await Promise.all([
      prisma.user.count({ where: { isDemo: false } }),
      prisma.user.count({ where: { isDemo: true } }),
      prisma.collectionItem.count({ where: { isDemo: false } }),
      prisma.collectionItem.count({ where: { isDemo: true } }),
      prisma.capModel.count({ where: { isActive: true } }),
      prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "ANSWERED"] }, user: { isDemo: false } },
      }),
      prisma.scan.count({ where: { createdAt: { gte: startOfToday }, user: { isDemo: false } } }),
      prisma.siteEvent.count({ where: { type: "page_view", createdAt: { gte: startOfToday } } }),
      prisma.siteEvent.count({ where: { type: "page_view", createdAt: { gte: weekAgo } } }),
      prisma.collectionItem.groupBy({
        by: ["rarity"],
        where: { isDemo: false },
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: { isDemo: false },
        include: { _count: { select: { collection: true, achievements: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.collectionItem.findMany({
        where: { isDemo: false },
        include: {
          manufacturer: { select: { id: true, name: true, slug: true, accent: true } },
          capModel: { select: { id: true, brand: true, name: true, slug: true } },
          user: { select: { id: true, displayName: true, slug: true, isDemo: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.collectionItem.groupBy({
        by: ["manufacturerId"],
        where: { isDemo: false, manufacturerId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { manufacturerId: "desc" } },
        take: 6,
      }),
      prisma.$queryRaw<{ day: Date; type: string; count: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, "type", count(*)::int AS count
        FROM "SiteEvent"
        WHERE "createdAt" >= ${chartStart}
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS count
        FROM "CollectionItem"
        WHERE "isDemo" = false AND "createdAt" >= ${chartStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS count
        FROM "User"
        WHERE "isDemo" = false AND "createdAt" >= ${chartStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const rarity = emptyRarityCounts();
    for (const group of rarityGroups) {
      rarity[group.rarity as Rarity] = group._count._all;
    }

    const manufacturerIds = manufacturerGroups
      .map((group) => group.manufacturerId)
      .filter((id): id is string => Boolean(id));
    const manufacturers = await prisma.manufacturer.findMany({
      where: { id: { in: manufacturerIds } },
      select: { id: true, name: true, accent: true },
    });
    const manufacturerMap = new Map(manufacturers.map((m) => [m.id, m]));

    const pageViewsByDay = new Map<string, number>();
    for (const row of eventRows) {
      if (row.type !== "page_view") continue;
      const key = localDateKey(row.day);
      pageViewsByDay.set(key, (pageViewsByDay.get(key) ?? 0) + Number(row.count));
    }
    const capsByDay = new Map(capRows.map((row) => [localDateKey(row.day), Number(row.count)]));
    const signupsByDay = new Map(userRows.map((row) => [localDateKey(row.day), Number(row.count)]));

    const chart = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(chartStart);
      date.setDate(chartStart.getDate() + index);
      const key = localDateKey(date);
      return {
        date: key,
        label: localDateLabel(date),
        pageViews: pageViewsByDay.get(key) ?? 0,
        signups: signupsByDay.get(key) ?? 0,
        caps: capsByDay.get(key) ?? 0,
      };
    });

    const stats: AdminStatsDTO = {
      realUsers,
      demoUsers,
      totalCaps,
      demoCaps,
      catalogModels,
      openTickets,
      scansToday,
      pageViewsToday,
      pageViews7d,
      chart,
      rarity,
      recentUsers: recentUsers.map(toAdminUserDTO),
      recentCaps: recentCaps.map((item) => ({
        ...toItemDTO(item),
        user: {
          id: item.user.id,
          displayName:
            item.user.displayName ||
            [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") ||
            "Коллекционер",
          slug: item.user.slug,
          isDemo: item.user.isDemo,
        },
      })),
      topManufacturers: manufacturerGroups
        .map((group) => {
          const manufacturer = group.manufacturerId
            ? manufacturerMap.get(group.manufacturerId)
            : null;
          return manufacturer
            ? { name: manufacturer.name, count: group._count._all, accent: manufacturer.accent }
            : null;
        })
        .filter((entry): entry is { name: string; count: number; accent: string } => Boolean(entry)),
    };

    return NextResponse.json({ stats });
  } catch (error) {
    return handleApiError(error);
  }
}