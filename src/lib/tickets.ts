import type { Role, TicketStatus, User } from "@prisma/client";
import { prisma } from "./prisma";
import { appUrl, escapeHtml, notifySupportChat, sendTelegramMessage } from "./telegram";

function staffRole(role: Role): boolean {
  return role === "SUPPORT" || role === "ADMIN";
}

export async function createTicket(
  user: User,
  subject: string,
  body: string,
  viaBot = false,
) {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      subject: subject.slice(0, 120),
      status: "OPEN",
      messages: {
        create: {
          authorId: user.id,
          authorRole: "USER",
          body: body.slice(0, 4000),
          viaBot,
        },
      },
    },
    include: {
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
      user: { select: { firstName: true, lastName: true, displayName: true, slug: true } },
      assignedTo: { select: { firstName: true, lastName: true, displayName: true } },
      _count: { select: { messages: true } },
    },
  });

  await notifySupportChat(
    `🆕 <b>Новое обращение</b>\n` +
      `ID: <code>${ticket.id}</code>\n` +
      `От: ${escapeHtml(ticket.user.displayName || [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" "))}\n` +
      `Тема: ${escapeHtml(subject)}\n\n` +
      `${escapeHtml(body.slice(0, 900))}\n\n` +
      `Ответить: ${appUrl()}/support`,
  );

  return ticket;
}

export async function addTicketMessage(
  ticketId: string,
  user: User,
  body: string,
  viaBot = false,
) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, telegramId: true, firstName: true, lastName: true, displayName: true } },
    },
  });
  if (!ticket) throw new Error("Обращение не найдено");

  const isStaff = staffRole(user.role);
  const isOwner = ticket.userId === user.id;
  if (!isOwner && !isStaff) throw new Error("Нет доступа к обращению");

  const authorRole = isStaff ? user.role : "USER";
  const status: TicketStatus = isStaff ? "ANSWERED" : "OPEN";

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        authorRole,
        body: body.slice(0, 4000),
        viaBot,
      },
      include: { author: { select: { firstName: true, lastName: true, displayName: true } } },
    });
    await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        lastMessageAt: new Date(),
        ...(isStaff && !ticket.assignedToId ? { assignedToId: user.id } : {}),
      },
    });
    return created;
  });

  if (isStaff) {
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "support",
        title: "Ответ поддержки KAPS",
        body: body.slice(0, 300),
        href: `/support?ticket=${ticket.id}`,
      },
    });
    if (ticket.user.telegramId && /^\d+$/.test(ticket.user.telegramId)) {
      await sendTelegramMessage(
        ticket.user.telegramId,
        `💬 <b>Ответ поддержки KAPS</b>\n\n${escapeHtml(body.slice(0, 1200))}\n\n<a href="${appUrl()}/support?ticket=${ticket.id}">Открыть обращение</a>`,
      );
    }
  } else if (!viaBot) {
    await notifySupportChat(
      `💬 <b>Новое сообщение в обращении</b>\n` +
        `ID: <code>${ticket.id}</code>\n` +
        `От: ${escapeHtml(ticket.user.displayName || [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" "))}\n\n` +
        `${escapeHtml(body.slice(0, 900))}\n\n` +
        `Ответить: ${appUrl()}/support`,
    );
  }

  return { ticket, message, authorRole };
}

export async function getTicketForUser(ticketId: string, user: User) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, slug: true, firstName: true, lastName: true, displayName: true } },
      assignedTo: { select: { firstName: true, lastName: true, displayName: true } },
      messages: {
        include: { author: { select: { firstName: true, lastName: true, displayName: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { messages: true } },
    },
  });
  if (!ticket) return null;
  if (ticket.userId !== user.id && !staffRole(user.role)) return null;
  return ticket;
}