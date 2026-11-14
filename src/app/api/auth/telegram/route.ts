import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createSession, provisionTelegramUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";
import { isTelegramConfigured, verifyTelegramLogin } from "@/lib/telegram";

export const runtime = "nodejs";

const payloadSchema = z.record(z.unknown());

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!isTelegramConfigured()) {
      return jsonError("Telegram-авторизация не настроена на сервере.", 503, "TELEGRAM_NOT_CONFIGURED");
    }

    const payload = payloadSchema.parse(await request.json());
    const profile = verifyTelegramLogin(payload);
    if (!profile) {
      return jsonError("Не удалось проверить подпись Telegram. Попробуйте войти заново.", 401, "INVALID_TELEGRAM_AUTH");
    }

    const user = await provisionTelegramUser(profile);
    await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    await logEvent("login", { userId: user.id, meta: { provider: "telegram" } });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    return handleApiError(error);
  }
}