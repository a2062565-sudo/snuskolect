import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { achievementPatchSchema } from "@/lib/admin-schemas";
import type { AdminAchievementDTO, Rarity } from "@/lib/types";

export const runtime = "nodejs";

const includeCount = { _count: { select: { unlocked: true } } } as const;

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

function toDTO(achievement: AchievementWithCount): AdminAchievementDTO {
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;
    const data = achievementPatchSchema.parse(await request.json());

    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) return jsonError("Достижение не найдено.", 404, "NOT_FOUND");

    if (data.key && data.key !== existing.key) {
      const conflict = await prisma.achievement.findUnique({ where: { key: data.key } });
      if (conflict) return jsonError("Достижение с таким ключом уже существует.", 409, "KEY_EXISTS");
    }

    const achievement = await prisma.achievement.update({
      where: { id },
      data: {
        ...(data.key !== undefined ? { key: data.key } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.metric !== undefined ? { metric: data.metric } : {}),
        ...(data.target !== undefined ? { target: data.target } : {}),
        ...(data.rarity !== undefined ? { rarity: data.rarity } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: includeCount,
    });

    return NextResponse.json({ achievement: toDTO(achievement) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;

    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: includeCount,
    });
    if (!achievement) return jsonError("Достижение не найдено.", 404, "NOT_FOUND");

    if (achievement._count.unlocked > 0) {
      const updated = await prisma.achievement.update({
        where: { id },
        data: { isActive: false },
        include: includeCount,
      });
      return NextResponse.json({
        achievement: toDTO(updated),
        deactivated: true,
        message: "Достижение уже выдано пользователям и переведено в архив.",
      });
    }

    await prisma.achievement.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
