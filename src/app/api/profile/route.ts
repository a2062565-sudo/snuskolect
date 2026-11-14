import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toPublicUserDTO } from "@/lib/dto";

export const runtime = "nodejs";

const schema = z.object({
  displayName: z.string().trim().min(2, "Имя должно быть не короче 2 символов").max(48, "Слишком длинное имя").optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Войдите через Telegram.", 401, "UNAUTHORIZED");

    const data = schema.parse(await request.json());
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.isPublic !== undefined ? { isPublic: data.isPublic } : {}),
      },
    });

    return NextResponse.json({ user: toPublicUserDTO(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}