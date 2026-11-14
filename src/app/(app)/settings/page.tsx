import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  ExternalLink,
  LockKeyhole,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { displayNameFor, roleLabel } from "@/lib/dto";
import { normalizeTheme } from "@/lib/themes";
import { telegramBotLink } from "@/lib/telegram";
import { formatLongDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { ThemeEditor } from "@/components/settings/theme-editor";
import { SupportUpgrade } from "@/components/settings/support-upgrade";
import { LogoutButton } from "@/components/settings/logout-button";
import { ProfileNameForm, ProfilePrivacy } from "@/components/profile/profile-actions";

export const metadata: Metadata = {
  title: "Настройки",
  description: "Оформление, профиль, приватность и доступ поддержки KAPS.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const theme = normalizeTheme(user.theme);
  const name = displayNameFor(user);
  const botUrl = telegramBotLink("settings");
  const staff = user.role === "SUPPORT" || user.role === "ADMIN";

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Аккаунт"
        title="Настройки"
        description="Настрой KAPS под себя: тема, имя, приватность и доступ к инструментам команды."
        actions={
          <>
            <Link href={`/u/${user.slug}`} className="btn btn-ghost">
              Публичный профиль
              <ArrowUpRight size={14} />
            </Link>
            <Link href="/profile" className="btn btn-primary">
              <UserRound size={15} />
              Мой профиль
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <section className="surface p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-[var(--muted)]" />
                  <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">
                    Оформление
                  </h2>
                </div>
                <p className="mt-1 text-[11.5px] leading-5 text-[var(--muted)]">
                  Тема сохраняется в профиле Telegram и синхронизируется между устройствами.
                </p>
              </div>
              <span className="hidden rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] sm:inline-flex">
                6 тем
              </span>
            </div>
            <ThemeEditor initialTheme={theme} />
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-[var(--muted)]" />
              <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">
                Отображаемое имя
              </h2>
            </div>
            <p className="mt-1 max-w-xl text-[11.5px] leading-5 text-[var(--muted)]">
              Имя видно в коллекции, достижениях и публичном профиле. Telegram-имя и фото
              обновляются автоматически при входе.
            </p>
            <div className="mt-4">
              <ProfileNameForm initialName={name} />
            </div>
          </section>

          <section className="surface p-5 sm:p-6" id="support">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[var(--muted)]" />
                  <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">
                    Доступ поддержки
                  </h2>
                </div>
                <p className="mt-1 max-w-xl text-[11.5px] leading-5 text-[var(--muted)]">
                  Секретный ключ команды KAPS открывает консоль обращений. Роль проверяется на
                  сервере, попытки ограничены.
                </p>
              </div>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {roleLabel(user.role)}
              </span>
            </div>
            <div className="mt-4">
              <SupportUpgrade role={user.role} />
            </div>
          </section>

          {staff ? (
            <section className="surface flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-[12.5px] font-semibold">Консоль команды</p>
                <p className="mt-1 text-[10.5px] text-[var(--muted)]">
                  {user.role === "ADMIN"
                    ? "Полный доступ к пользователям, каталогу и аналитике."
                    : "Очередь обращений и ответы пользователям."}
                </p>
              </div>
              <Link href={user.role === "ADMIN" ? "/admin" : "/support"} className="btn btn-soft btn-sm">
                Открыть консоль
                <ArrowUpRight size={13} />
              </Link>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="surface p-5">
            <p className="eyebrow">Telegram</p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar user={{ displayName: name, photoUrl: user.photoUrl, isDemo: user.isDemo }} size={54} ring />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{name}</p>
                <p className="truncate text-[10.5px] text-[var(--muted)]">
                  {user.username ? `@${user.username}` : "Telegram-профиль"}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4 text-[10.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted)]">Роль</dt>
                <dd className="font-semibold">{roleLabel(user.role)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted)]">В KAPS с</dt>
                <dd className="font-semibold">{formatLongDate(user.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--muted)]">Публичность</dt>
                <dd className="font-semibold">{user.isPublic ? "Открыт" : "Приватный"}</dd>
              </div>
            </dl>
            {user.isDemo ? (
              <p className="mt-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-[9.5px] leading-4 text-[var(--muted)]">
                Это демо- или локальный аккаунт. Он не связан с реальным Telegram.
              </p>
            ) : null}
          </section>

          <ProfilePrivacy initialPublic={user.isPublic} slug={user.slug} />

          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-[var(--muted)]" />
              <p className="text-[12.5px] font-semibold">Telegram-бот KAPS</p>
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-[var(--muted)]">
              Профиль, коллекция, достижения и поддержка — прямо в Telegram. Уведомления о
              достижениях и ответах приходят в чат с ботом.
            </p>
            {botUrl ? (
              <a
                href={botUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm mt-3 w-full"
              >
                Открыть @{new URL(botUrl).pathname.replace("/", "")}
                <ExternalLink size={13} />
              </a>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] px-3 py-2 text-[9.5px] leading-4 text-[var(--muted)]">
                Username бота не настроен на сервере. Добавьте
                <code className="mx-1 rounded bg-[var(--surface-2)] px-1">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>
                в окружение.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
              <LockKeyhole size={12} />
              Безопасность
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-[var(--muted)]">
              Сессия хранится в защищённой HttpOnly cookie. Вход выполняется только после
              проверки подписи Telegram на сервере.
            </p>
          </section>

          <section className="surface p-4">
            <LogoutButton />
          </section>
        </aside>
      </div>
    </div>
  );
}
