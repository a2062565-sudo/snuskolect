import "dotenv/config";
import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { prisma } from "../lib/prisma";
import { provisionTelegramUser } from "../lib/provision";
import { getCollectionStats } from "../lib/stats";
import { getUserAchievements } from "../lib/achievements";
import { addTicketMessage, createTicket } from "../lib/tickets";
import { tryUpgradeToSupport } from "../lib/support-key";
import { appUrl, escapeHtml } from "../lib/telegram";
import { RARITY_META } from "../lib/rarity";
import { formatDate, formatLongDate } from "../lib/format";
import type { Rarity } from "../lib/types";
import type { User } from "@prisma/client";

type State =
  | { step: "support_subject" }
  | { step: "support_body"; subject: string }
  | { step: "ticket_reply"; ticketId: string }
  | { step: "support_key" };

const states = new Map<number, State>();

const MAIN_KEYBOARD = new Keyboard()
  .text("👤 Профиль")
  .text("🥤 Коллекция")
  .row()
  .text("🏆 Достижения")
  .text("🛟 Поддержка")
  .row()
  .text("🤝 Стать поддержкой")
  .text("🌐 Открыть сайт")
  .resized()
  .persistent();

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error(
    "TELEGRAM_BOT_TOKEN не задан. Добавьте токен бота от @BotFather в .env и запустите снова.",
  );
  process.exit(1);
}

const bot = new Bot(token);

function isStaff(user: Pick<User, "role">): boolean {
  return user.role === "SUPPORT" || user.role === "ADMIN";
}

function roleName(role: string): string {
  if (role === "ADMIN") return "Admin";
  if (role === "SUPPORT") return "Support";
  return "User";
}

async function ensureUser(ctx: Context): Promise<User | null> {
  const from = ctx.from;
  if (!from) return null;
  const telegramId = String(from.id);
  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (existing) return existing;
  return provisionTelegramUser({
    id: telegramId,
    firstName: from.first_name || "Коллекционер",
    lastName: from.last_name ?? null,
    username: from.username ?? null,
  });
}

async function reply(
  ctx: Context,
  text: string,
  markup?: Keyboard | InlineKeyboard,
): Promise<void> {
  await ctx.reply(text, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(markup ? { reply_markup: markup } : {}),
  });
}

function siteKeyboard(path = "/"): InlineKeyboard {
  return new InlineKeyboard()
    .url("Открыть KAPS", `${appUrl()}${path}`)
    .url("Добавить крышку", `${appUrl()}/add`);
}

async function requireUser(ctx: Context): Promise<User | null> {
  const user = await ensureUser(ctx);
  if (!user) {
    await reply(ctx, "Не удалось определить Telegram-профиль. Попробуй ещё раз.");
    return null;
  }
  return user;
}

async function showProfile(ctx: Context, user: User): Promise<void> {
  const stats = await getCollectionStats(user.id);
  const unlocked = stats.achievementCount;
  const rarest = stats.rarest
    ? `${escapeHtml(stats.rarest.productName ?? stats.rarest.brandName ?? "Крышка")} · ${RARITY_META[stats.rarest.rarity].labelEn}`
    : "пока нет";

  await reply(
    ctx,
    [
      `👤 <b>${escapeHtml(user.displayName || [user.firstName, user.lastName].filter(Boolean).join(" "))}</b>`,
      user.username ? `@${escapeHtml(user.username)}` : "Telegram-профиль",
      `Роль: <b>${roleName(user.role)}</b> · с ${formatLongDate(user.createdAt)}`,
      "",
      `🥤 Крышек: <b>${stats.totalCaps}</b>`,
      `🗂 Моделей: <b>${stats.uniqueModels}</b> из ${stats.catalogTotal} (${stats.progress}%)`,
      `🏭 Производителей: <b>${stats.manufacturerCount}</b>`,
      `🏆 Достижений: <b>${unlocked}</b>`,
      `⭐ Уровень: <b>${stats.level.level} · ${escapeHtml(stats.level.title)}</b> (${stats.level.totalXp} XP)`,
      "",
      `💎 Редчайшая находка: ${rarest}`,
    ].join("\n"),
    new InlineKeyboard()
      .url("Профиль на сайте", `${appUrl()}/profile`)
      .row()
      .url("Коллекция", `${appUrl()}/collection`)
      .url("Достижения", `${appUrl()}/achievements`),
  );
}

async function showCollection(ctx: Context, user: User): Promise<void> {
  const items = await prisma.collectionItem.findMany({
    where: { userId: user.id },
    include: {
      manufacturer: { select: { name: true } },
      capModel: { select: { brand: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (items.length === 0) {
    await reply(
      ctx,
      "🥤 Коллекция пока пуста.\n\nСфотографируй крышку на сайте — KAPS распознает модель и определит редкость.",
      siteKeyboard("/add"),
    );
    return;
  }

  const lines = items.map((item, index) => {
    const rarity = RARITY_META[item.rarity as Rarity];
    const name = item.productName ?? item.capModel?.name ?? item.brandName ?? "Крышка";
    const brand = item.brandName ?? item.capModel?.brand ?? item.manufacturerName ?? "";
    return `${index + 1}. <b>${escapeHtml(brand)}</b>${brand && name !== brand ? ` · ${escapeHtml(name)}` : ""}\n   ${rarity.labelEn} · ${formatDate(item.createdAt)}`;
  });

  await reply(
    ctx,
    `🥤 <b>Последние крышки</b>\n\n${lines.join("\n")}\n\nПоказаны последние ${items.length}.`,
    siteKeyboard("/collection"),
  );
}

async function showAchievements(ctx: Context, user: User): Promise<void> {
  const achievements = await getUserAchievements(user.id);
  const unlocked = achievements.filter((entry) => entry.unlocked);
  const next = achievements.filter((entry) => !entry.unlocked).slice(0, 3);

  const lines: string[] = [];
  if (unlocked.length > 0) {
    lines.push("<b>Открыто:</b>");
    for (const entry of unlocked.slice(-8)) {
      lines.push(
        `🏆 ${escapeHtml(entry.title)}${entry.unlockedAt ? ` · ${formatDate(entry.unlockedAt)}` : ""}`,
      );
    }
  } else {
    lines.push("Пока ни одного достижения. Добавь первую крышку!");
  }

  if (next.length > 0) {
    lines.push("", "<b>Следующие цели:</b>");
    for (const entry of next) {
      lines.push(
        `▫️ ${escapeHtml(entry.title)} — ${entry.progress}/${entry.target}`,
      );
    }
  }

  await reply(
    ctx,
    `🏆 <b>Достижения</b> · ${unlocked.length}/${achievements.length}\n\n${lines.join("\n")}`,
    siteKeyboard("/achievements"),
  );
}

async function showSupportMenu(ctx: Context): Promise<void> {
  await reply(
    ctx,
    [
      "🛟 <b>Поддержка KAPS</b>",
      "",
      "Опиши проблему — команда ответит здесь и на сайте. Не отправляй пароли, токены и ключ поддержки.",
    ].join("\n"),
    new InlineKeyboard()
      .text("✍️ Новое обращение", "support:new")
      .row()
      .text("📨 Мои обращения", "support:list")
      .row()
      .url("Открыть консоль на сайте", `${appUrl()}/support`),
  );
}

async function showTickets(ctx: Context, user: User): Promise<void> {
  const tickets = await prisma.supportTicket.findMany({
    where: isStaff(user) ? {} : { userId: user.id },
    orderBy: { lastMessageAt: "desc" },
    take: 8,
    include: { _count: { select: { messages: true } } },
  });

  if (tickets.length === 0) {
    await reply(ctx, "📨 Обращений пока нет.", new InlineKeyboard().text("✍️ Создать", "support:new"));
    return;
  }

  const keyboard = new InlineKeyboard();
  const lines = tickets.map((ticket, index) => {
    keyboard.text(`${index + 1}. ${ticket.subject.slice(0, 24)}`, `ticket:${ticket.id}`).row();
    return `${index + 1}. <b>${escapeHtml(ticket.subject)}</b>\n   ${ticket.status} · ${ticket._count.messages} сообщ. · ${formatDate(ticket.lastMessageAt)}`;
  });

  await reply(
    ctx,
    `📨 <b>Обращения</b>\n\n${lines.join("\n")}\n\nНажми на тему, чтобы открыть переписку.`,
    keyboard,
  );
}

async function showTicket(ctx: Context, user: User, ticketId: string): Promise<void> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 8 },
      user: { select: { id: true, displayName: true } },
    },
  });
  if (!ticket || (ticket.userId !== user.id && !isStaff(user))) {
    await reply(ctx, "Обращение не найдено.");
    return;
  }

  const messages = ticket.messages
    .map((message) => {
      const who =
        message.authorRole === "USER"
          ? "Вы"
          : message.authorRole === "SYSTEM"
            ? "Система"
            : "Поддержка";
      return `<b>${who}</b> · ${formatDate(message.createdAt)}\n${escapeHtml(message.body.slice(0, 600))}`;
    })
    .join("\n\n");

  const keyboard = new InlineKeyboard()
    .text("✍️ Ответить", `ticket:reply:${ticket.id}`)
    .url("Открыть на сайте", `${appUrl()}/support?ticket=${ticket.id}`);

  await reply(
    ctx,
    [
      `📨 <b>${escapeHtml(ticket.subject)}</b>`,
      `Статус: <b>${ticket.status}</b>${isStaff(user) ? ` · ${escapeHtml(ticket.user.displayName || "Пользователь")}` : ""}`,
      "",
      messages || "Сообщений пока нет.",
    ].join("\n"),
    keyboard,
  );
}

async function startSupportFlow(ctx: Context, ticketId?: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  if (ticketId) {
    states.set(chatId, { step: "ticket_reply", ticketId });
    await reply(ctx, "✍️ Напиши сообщение в обращение. /cancel — отменить.");
    return;
  }
  states.set(chatId, { step: "support_subject" });
  await reply(
    ctx,
    "✍️ <b>Новое обращение</b>\n\nНапиши короткую тему (до 120 символов). /cancel — отменить.",
  );
}

async function startSupportKeyFlow(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  states.set(chatId, { step: "support_key" });
  await reply(
    ctx,
    [
      "🤝 <b>Стать поддержкой KAPS</b>",
      "",
      "Отправь секретный ключ команды. Он проверяется на сервере, хранится только в виде хеша.",
      "После 5 неверных попыток ввод блокируется на час. /cancel — отменить.",
    ].join("\n"),
  );
}

async function handleState(ctx: Context, user: User, state: State, text: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const trimmed = text.trim();

  if (state.step === "support_subject") {
    if (trimmed.length < 3) {
      await reply(ctx, "Тема слишком короткая. Напиши хотя бы 3 символа или /cancel.");
      return;
    }
    states.set(chatId, { step: "support_body", subject: trimmed.slice(0, 120) });
    await reply(ctx, "Теперь опиши проблему подробнее (до 4000 символов). /cancel — отменить.");
    return;
  }

  if (state.step === "support_body") {
    if (trimmed.length < 5) {
      await reply(ctx, "Сообщение слишком короткое. Добавь детали или /cancel.");
      return;
    }
    try {
      const ticket = await createTicket(user, state.subject, trimmed, true);
      states.delete(chatId);
      await reply(
        ctx,
        `✅ Обращение создано.\n\nТема: <b>${escapeHtml(ticket.subject)}</b>\nСтатус: OPEN\n\nКоманда ответит здесь и в разделе поддержки на сайте.`,
        new InlineKeyboard().url("Открыть обращение", `${appUrl()}/support?ticket=${ticket.id}`),
      );
    } catch (error) {
      console.error("[bot] create ticket failed", error);
      await reply(ctx, "Не удалось создать обращение. Попробуй ещё раз позже.");
    }
    return;
  }

  if (state.step === "ticket_reply") {
    if (trimmed.length < 1) return;
    try {
      const { message } = await addTicketMessage(state.ticketId, user, trimmed, true);
      states.delete(chatId);
      await reply(
        ctx,
        `✅ Сообщение отправлено в обращение.\n\n${escapeHtml(message.body.slice(0, 500))}`,
        new InlineKeyboard().url("Открыть на сайте", `${appUrl()}/support?ticket=${state.ticketId}`),
      );
    } catch (error) {
      console.error("[bot] reply failed", error);
      states.delete(chatId);
      await reply(ctx, "Не удалось отправить сообщение. Возможно, обращение недоступно.");
    }
    return;
  }

  if (state.step === "support_key") {
    states.delete(chatId);
    if (!trimmed) {
      await reply(ctx, "Пустой ключ. Попробуй снова через меню.");
      return;
    }
    try {
      const result = await tryUpgradeToSupport(user.id, trimmed);
      if (result.ok) {
        await reply(
          ctx,
          result.already
            ? "✅ У тебя уже есть доступ поддержки."
            : "✅ <b>Роль Support активирована.</b>\n\nТеперь доступны обращения пользователей. Открой консоль на сайте или используй /tickets.",
          new InlineKeyboard().url("Консоль поддержки", `${appUrl()}/support`),
        );
      } else {
        const tail =
          result.attemptsLeft !== undefined
            ? `\nОсталось попыток: ${result.attemptsLeft}.`
            : "";
        await reply(ctx, `❌ ${escapeHtml(result.message)}${tail}`);
      }
    } catch (error) {
      console.error("[bot] support key failed", error);
      await reply(ctx, "Не удалось проверить ключ. Попробуй позже.");
    }
  }
}

async function listStaffTickets(ctx: Context, user: User): Promise<void> {
  if (!isStaff(user)) {
    await reply(ctx, "Команда /tickets доступна только Support и Admin.");
    return;
  }
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["OPEN", "ANSWERED"] } },
    orderBy: { lastMessageAt: "desc" },
    take: 12,
    include: {
      user: { select: { displayName: true, firstName: true, lastName: true } },
      _count: { select: { messages: true } },
    },
  });
  if (tickets.length === 0) {
    await reply(ctx, "✅ Открытых обращений нет.");
    return;
  }
  const lines = tickets.map(
    (ticket) =>
      `<code>${ticket.id}</code>\n<b>${escapeHtml(ticket.subject)}</b> · ${ticket.status} · ${ticket._count.messages} сообщ.\nот ${escapeHtml(ticket.user.displayName || [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" "))}`,
  );
  await reply(
    ctx,
    `📨 <b>Очередь поддержки</b>\n\n${lines.join("\n\n")}\n\nОтветить: <code>/reply ID текст</code>\nЗакрыть: <code>/resolve ID</code>`,
  );
}

async function staffReply(ctx: Context, user: User, payload: string): Promise<void> {
  if (!isStaff(user)) {
    await reply(ctx, "Команда доступна только Support и Admin.");
    return;
  }
  const match = payload.match(/^(\S+)\s+([\s\S]+)$/);
  if (!match) {
    await reply(ctx, "Формат: <code>/reply ID текст ответа</code>");
    return;
  }
  const [, ticketId, body] = match;
  try {
    await addTicketMessage(ticketId, user, body.trim(), true);
    await reply(ctx, `✅ Ответ отправлен в обращение <code>${escapeHtml(ticketId)}</code>.`);
  } catch (error) {
    console.error("[bot] staff reply failed", error);
    await reply(ctx, "Не удалось ответить. Проверь ID обращения.");
  }
}

async function resolveTicket(ctx: Context, user: User, payload: string): Promise<void> {
  if (!isStaff(user)) {
    await reply(ctx, "Команда доступна только Support и Admin.");
    return;
  }
  const ticketId = payload.trim().split(/\s+/)[0];
  if (!ticketId) {
    await reply(ctx, "Формат: <code>/resolve ID</code>");
    return;
  }
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, telegramId: true, displayName: true, firstName: true } },
    },
  });
  if (!ticket) {
    await reply(ctx, "Обращение не найдено.");
    return;
  }
  await prisma.$transaction([
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } }),
    prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: "support",
        title: "Обращение закрыто",
        body: `Тема: ${ticket.subject}`,
        href: `/support?ticket=${ticket.id}`,
      },
    }),
  ]);
  await reply(ctx, `✅ Обращение <code>${ticket.id}</code> закрыто.`);
}

bot.command("start", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;
  const name = user.displayName || user.firstName || "коллекционер";
  await reply(
    ctx,
    [
      `Привет, <b>${escapeHtml(name)}</b>! 👋`,
      "",
      "Это <b>KAPS</b> — личный архив крышек от снюса.",
      "Сканируй крышки на сайте, открывай достижения и следи за редкостями.",
      "",
      "Выбери пункт меню или используй команды.",
    ].join("\n"),
    MAIN_KEYBOARD,
  );
  const payload = (ctx.match ?? "").trim();
  if (payload === "profile") await showProfile(ctx, user);
  if (payload === "support") await startSupportFlow(ctx);
  if (payload === "settings") {
    await reply(
      ctx,
      "⚙️ Настройки темы, имени и приватности доступны на сайте.",
      new InlineKeyboard().url("Открыть настройки", `${appUrl()}/settings`),
    );
  }
});

bot.command("profile", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await showProfile(ctx, user);
});

bot.command("collection", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await showCollection(ctx, user);
});

bot.command("achievements", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await showAchievements(ctx, user);
});

bot.command("support", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await showSupportMenu(ctx);
});

bot.command("tickets", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await listStaffTickets(ctx, user);
});

bot.command("reply", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await staffReply(ctx, user, ctx.match ?? "");
});

bot.command("resolve", async (ctx) => {
  const user = await requireUser(ctx);
  if (user) await resolveTicket(ctx, user, ctx.match ?? "");
});

bot.command("cancel", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) states.delete(chatId);
  await reply(ctx, "Действие отменено.", MAIN_KEYBOARD);
});

bot.command("help", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;
  const staff = isStaff(user)
    ? "\n\n<b>Команды команды:</b>\n/tickets — очередь обращений\n<code>/reply ID текст</code> — ответить\n<code>/resolve ID</code> — закрыть"
    : "";
  await reply(
    ctx,
    [
      "<b>Команды KAPS</b>",
      "/start — главное меню",
      "/profile — профиль и уровень",
      "/collection — последние крышки",
      "/achievements — достижения",
      "/support — обращения",
      "/cancel — отменить текущее действие",
      staff,
    ].join("\n"),
    MAIN_KEYBOARD,
  );
});

bot.callbackQuery("support:new", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => undefined);
  const user = await requireUser(ctx);
  if (user) await startSupportFlow(ctx);
});

bot.callbackQuery("support:list", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => undefined);
  const user = await requireUser(ctx);
  if (user) await showTickets(ctx, user);
});

bot.callbackQuery(/^ticket:reply:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => undefined);
  const user = await requireUser(ctx);
  if (user) await startSupportFlow(ctx, ctx.match[1]);
});

bot.callbackQuery(/^ticket:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => undefined);
  const user = await requireUser(ctx);
  if (user) await showTicket(ctx, user, ctx.match[1]);
});

bot.on("message:text", async (ctx) => {
  const user = await requireUser(ctx);
  if (!user) return;
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const text = ctx.message.text.trim();

  const state = states.get(chatId);
  if (state) {
    await handleState(ctx, user, state, text);
    return;
  }

  switch (text) {
    case "👤 Профиль":
      await showProfile(ctx, user);
      return;
    case "🥤 Коллекция":
      await showCollection(ctx, user);
      return;
    case "🏆 Достижения":
      await showAchievements(ctx, user);
      return;
    case "🛟 Поддержка":
      await showSupportMenu(ctx);
      return;
    case "🤝 Стать поддержкой":
      await startSupportKeyFlow(ctx);
      return;
    case "🌐 Открыть сайт":
      await reply(
        ctx,
        `🌐 <b>KAPS</b>\n\n${appUrl()}`,
        siteKeyboard("/"),
      );
      return;
    default:
      await reply(
        ctx,
        "Выбери пункт меню или отправь /help. Если хочешь задать вопрос — открой «🛟 Поддержка».",
        MAIN_KEYBOARD,
      );
  }
});

bot.catch((error) => {
  console.error("[bot] unhandled error", error);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[bot] received ${signal}, stopping…`);
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

async function main(): Promise<void> {
  const me = await bot.api.getMe();
  console.log(`[bot] @${me.username} запущен · ${appUrl()}`);
  await bot.api
    .setMyCommands([
      { command: "start", description: "Главное меню" },
      { command: "profile", description: "Профиль и уровень" },
      { command: "collection", description: "Последние крышки" },
      { command: "achievements", description: "Достижения" },
      { command: "support", description: "Поддержка KAPS" },
      { command: "help", description: "Все команды" },
    ])
    .catch((error) => console.error("[bot] setMyCommands failed", error));

  await bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: (info) => {
      console.log(`[bot] polling started for @${info.username}`);
    },
  });
}

void main().catch(async (error) => {
  console.error("[bot] fatal", error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
