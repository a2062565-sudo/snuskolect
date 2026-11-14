import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({ as: z.enum(["admin", "collector"]).default("collector") });

function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_LOGIN === "true";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (!devLoginEnabled()) {
      return jsonError("Локальный вход отключён.", 404, "NOT_FOUND");
    }

    const { as } = schema.parse(await request.json());
    const isAdmin = as === "admin";
    const telegramId = isAdmin ? "dev-admin-kaps" : "dev-collector-kaps";
    const slug = isAdmin ? "dev-admin" : "dev-collector";

    const user = await prisma.user.upsert({
      where: { telegramId },
      update: { lastLoginAt: new Date(), role: isAdmin ? "ADMIN" : "USER" },
      create: {
        telegramId,
        slug,
        firstName: isAdmin ? "Dev" : "Local",
        lastName: isAdmin ? "Admin" : "Collector",
        displayName: isAdmin ? "Dev Admin" : "Local Collector",
        username: slug.replace("-", "_"),
        role: isAdmin ? "ADMIN" : "USER",
        isDemo: true,
        isPublic: false,
      },
    });

    await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ip: "local-dev",
    });
    await logEvent("login", { userId: user.id, meta: { provider: "dev" } });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    return handleApiError(error);
  }
}