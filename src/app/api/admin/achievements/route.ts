import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { achievementCreateSchema } from "@/lib/admin-schemas";
import type { AdminAchievementDTO, Rarity } from "@/lib/types";

export const runtime = "nodejs";

type AchievementWithCount = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: "CAP_COUNT" | "RARITY_COUNT" | "MANUFACTURER_COUNT";
  target: number;
  rarity: Rarity | null;
  sortOrder: number;
  isActive: boolean;
  _count: { unlocked: number };
};

function toAdminAchievementDTO(achievement: AchievementWithCount): AdminAchievementDTO {
  return {
    id: achievement.id,
    key: achievement.key,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    metric: achievement.metric,
    target: achievement.target,
    rarity: achievement.rarity,
    sortOrder: achievement.sortOrder,
    unlocked: false,
    unlockedAt: null,
    progress: 0,
    isActive: achievement.isActive,
    unlockedCount: achievement._count.unlocked,
  };
}

const includeCount = { _count: { select: { unlocked: true } } } as const;

export async function GET() {
  try {
    await requireAdminApi();
    const achievements = await prisma.achievement.findMany({
      include: includeCount,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return NextResponse.json({ achievements: achievements.map(toAdminAchievementDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const data = achievementCreateSchema.parse(await request.json());

    const existing = await prisma.achievement.findUnique({ where: { key: data.key } });
    if (existing) return jsonError("Достижение с таким ключом уже существует.", 409, "KEY_EXISTS");

    const achievement = await prisma.achievement.create({
      data: {
        key: data.key,
        title: data.title,
        description: data.description,
        icon: data.icon,
        metric: data.metric,
        target: data.target,
        rarity: data.rarity,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
      include: includeCount,
    });

    return NextResponse.json(
      { achievement: toAdminAchievementDTO(achievement) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
