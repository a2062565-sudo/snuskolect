import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ExternalLink, LifeBuoy, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { displayNameFor } from "@/lib/dto";
import { telegramBotLink } from "@/lib/telegram";
import { PageHeader } from "@/components/ui/page";
import { SupportCenter } from "@/components/support/support-center";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Обращения пользователей KAPS и консоль команды поддержки.",
  robots: { index: false, follow: false },
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const isStaff = user.role === "SUPPORT" || user.role === "ADMIN";
  const botUrl = telegramBotLink("support");
  const initialTicketId = params.ticket?.trim() || undefined;

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow={isStaff ? "Команда KAPS" : "Помощь"}
        title={isStaff ? "Консоль поддержки" : "Поддержка"}
        description={
          isStaff
            ? "Очередь обращений, переписка и статусы. Ответы пользователям приходят на сайт и в Telegram."
            : "Задай вопрос команде KAPS: проблемы со сканированием, каталогом, коллекцией или аккаунтом."
        }
        actions={
          <>
            {botUrl ? (
              <a href={botUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                <Bot size={15} />
                Бот поддержки
                <ExternalLink size={12} />
              </a>
            ) : null}
            <Link href="/profile" className="btn btn-primary">
              <LifeBuoy size={15} />
              Мой профиль
            </Link>
          </>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} />
          {isStaff ? "Доступ Support / Admin подтверждён" : "Диалог виден только тебе и команде KAPS"}
        </span>
        <span className="hidden h-3 w-px bg-[var(--line)] sm:block" />
        <span>Уведомления об ответах приходят в Telegram-бот, если аккаунт связан.</span>
        {!isStaff ? (
          <span className="ml-auto inline-flex items-center gap-1">
            Привет, {displayNameFor(user)}
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <SupportCenter
          isStaff={isStaff}
          me={{ displayName: displayNameFor(user), role: user.role }}
          initialTicketId={initialTicketId}
        />
      </div>
    </div>
  );
}
