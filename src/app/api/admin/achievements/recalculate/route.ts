import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, logEvent } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/achievements";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();

    const users = await prisma.user.findMany({
      where: { isDemo: false },
      select: { id: true },
    });

    let unlocked = 0;
    let processed = 0;
    for (const user of users) {
      try {
        const created = await evaluateAchievements(user.id, { notify: true });
        unlocked += created.length;
        processed += 1;
      } catch (error) {
        console.error("[admin] achievement recalculation failed for", user.id, error);
      }
    }

    await logEvent("admin_achievements_recalculated", {
      userId: admin.id,
      meta: { processed, unlocked },
    });

    return NextResponse.json({ processed, unlocked });
  } catch (error) {
    return handleApiError(error);
  }
}
