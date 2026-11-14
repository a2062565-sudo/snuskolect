import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { normalizeTheme, themeSettingsSchema } from "@/lib/themes";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Войдите через Telegram.", 401, "UNAUTHORIZED");

    const parsed = themeSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Некорректные настройки темы.", 422, "INVALID_THEME");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { theme: parsed.data },
      select: { theme: true },
    });

    return NextResponse.json({ theme: normalizeTheme(updated.theme) });
  } catch (error) {
    return handleApiError(error);
  }
}