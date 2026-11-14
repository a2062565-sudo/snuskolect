import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSession, provisionTelegramUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";
import { isTelegramConfigured, verifyTelegramMiniApp } from "@/lib/telegram";

export const runtime = "nodejs";

const schema = z.object({ initData: z.string().min(1).max(8192) });

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!isTelegramConfigured()) {
      return jsonError("Telegram-авторизация не настроена на сервере.", 503, "TELEGRAM_NOT_CONFIGURED");
    }

    const { initData } = schema.parse(await request.json());
    const profile = verifyTelegramMiniApp(initData);
    if (!profile) {
      return jsonError("Не удалось проверить данные Telegram Mini App.", 401, "INVALID_MINIAPP_AUTH");
    }

    const user = await provisionTelegramUser(profile);
    await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    await logEvent("login", { userId: user.id, meta: { provider: "telegram_miniapp" } });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    return handleApiError(error);
  }
}