import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toAdminUserDTO } from "@/lib/dto";
import { userRoleSchema } from "@/lib/admin-schemas";
import { roleNotification } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const role = request.nextUrl.searchParams.get("role");
    const demo = request.nextUrl.searchParams.get("demo");

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { telegramId: { contains: search } },
                { slug: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(role && ["USER", "SUPPORT", "ADMIN"].includes(role)
          ? { role: role as "USER" | "SUPPORT" | "ADMIN" }
          : {}),
        ...(demo === "true" ? { isDemo: true } : demo === "false" ? { isDemo: false } : {}),
      },
      include: { _count: { select: { collection: true, achievements: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ users: users.map(toAdminUserDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminApi();
    const data = userRoleSchema.parse(await request.json());

    if (data.userId === admin.id && data.role !== "ADMIN") {
      return jsonError("Нельзя снять роль Admin с самого себя.", 409, "SELF_DEMOTION");
    }

    const target = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!target) return jsonError("Пользователь не найден.", 404, "NOT_FOUND");

    const updated = await prisma.user.update({
      where: { id: data.userId },
      data: { role: data.role },
      include: { _count: { select: { collection: true, achievements: true } } },
    });

    if (target.role !== data.role) {
      const note = roleNotification(data.role);
      await prisma.notification.create({
        data: {
          userId: updated.id,
          type: "role",
          title: note.title,
          body: note.body,
          href: data.role === "ADMIN" || data.role === "SUPPORT" ? "/support" : "/profile",
        },
      });
    }

    return NextResponse.json({ user: toAdminUserDTO(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}