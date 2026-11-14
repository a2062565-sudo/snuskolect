import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toTicketDetailDTO } from "@/lib/dto";
import { addTicketMessage, getTicketForUser } from "@/lib/tickets";

export const runtime = "nodejs";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Введите сообщение").max(4000),
});

const patchSchema = z.object({
  status: z.enum(["OPEN", "ANSWERED", "RESOLVED"]).optional(),
  assignToMe: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");
    const { id } = await context.params;
    const ticket = await getTicketForUser(id, user);
    if (!ticket) return jsonError("Обращение не найдено.", 404, "NOT_FOUND");
    return NextResponse.json({ ticket: toTicketDetailDTO(ticket) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");
    const { id } = await context.params;
    const ticket = await getTicketForUser(id, user);
    if (!ticket) return jsonError("Обращение не найдено.", 404, "NOT_FOUND");

    const data = messageSchema.parse(await request.json());
    const { message, authorRole } = await addTicketMessage(id, user, data.body, false);

    return NextResponse.json({
      message: {
        id: message.id,
        body: message.body,
        authorRole,
        authorName: message.author?.displayName ?? null,
        viaBot: false,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");
    if (user.role !== "SUPPORT" && user.role !== "ADMIN") {
      return jsonError("Недостаточно прав.", 403, "FORBIDDEN");
    }
    const { id } = await context.params;
    const data = patchSchema.parse(await request.json());

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return jsonError("Обращение не найдено.", 404, "NOT_FOUND");

    await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.assignToMe ? { assignedToId: user.id } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}