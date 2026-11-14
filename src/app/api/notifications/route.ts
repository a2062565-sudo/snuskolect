import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toNotificationDTO } from "@/lib/dto";

export const runtime = "nodejs";

const schema = z.object({
  id: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    return NextResponse.json({
      notifications: notifications.map(toNotificationDTO),
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");

    const body = schema.parse(await request.json().catch(() => ({})));
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
        ...(body.id ? { id: body.id } : {}),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}