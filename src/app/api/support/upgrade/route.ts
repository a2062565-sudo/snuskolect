import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";
import { tryUpgradeToSupport } from "@/lib/support-key";

export const runtime = "nodejs";

const schema = z.object({
  key: z.string().min(1, "Введите ключ поддержки").max(240),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Войдите через Telegram.", 401, "UNAUTHORIZED");

    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return jsonError(body.error.issues[0]?.message ?? "Введите ключ", 422, "VALIDATION");
    }

    const result = await tryUpgradeToSupport(user.id, body.data.key);
    if (result.ok) {
      await logEvent("support_key_used", {
        userId: user.id,
        meta: { already: result.already, role: result.role },
      });
      return NextResponse.json({
        ok: true,
        role: result.role,
        already: result.already,
      });
    }

    const status =
      result.code === "LOCKED"
        ? 429
        : result.code === "NOT_CONFIGURED"
          ? 503
          : result.code === "NO_USER"
            ? 404
            : 400;

    return NextResponse.json(
      {
        error: result.message,
        code: result.code,
        attemptsLeft: result.attemptsLeft,
        lockedUntil: result.lockedUntil,
      },
      { status },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
