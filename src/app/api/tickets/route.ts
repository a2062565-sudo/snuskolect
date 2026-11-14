import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toTicketSummaryDTO } from "@/lib/dto";
import { createTicket } from "@/lib/tickets";

export const runtime = "nodejs";

const createSchema = z.object({
  subject: z.string().trim().min(3, "Опишите тему обращения").max(120),
  body: z.string().trim().min(5, "Сообщение слишком короткое").max(4000),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Нужна авторизация.", 401, "UNAUTHORIZED");

    const isStaff = user.role === "SUPPORT" || user.role === "ADMIN";
    const scope = request.nextUrl.searchParams.get("scope");
    const all = scope === "all" && isStaff;
    const status = request.nextUrl.searchParams.get("status");

    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...(all ? {} : { userId: user.id }),
        ...(status && ["OPEN", "ANSWERED", "RESOLVED"].includes(status)
          ? { status: status as "OPEN" | "ANSWERED" | "RESOLVED" }
          : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true, displayName: true, slug: true } },
        assignedTo: { select: { firstName: true, lastName: true, displayName: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      tickets: tickets.map(toTicketSummaryDTO),
      isStaff,
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

    const data = createSchema.parse(await request.json());
    const ticket = await createTicket(user, data.subject, data.body);
    return NextResponse.json({ ticketId: ticket.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}