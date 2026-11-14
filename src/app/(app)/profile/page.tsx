import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Factory,
  Layers,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCollectionStats, getRecentItems } from "@/lib/stats";
import { displayNameFor } from "@/lib/dto";
import { achievementCount, capCount, formatDate, formatLongDate, number, plural } from "@/lib/format";
import { roleLabel } from "@/lib/dto";
import { PageHeader } from "@/components/ui/page";
import { Avatar, LevelRing } from "@/components/ui/avatar";
import { CapCard } from "@/components/ui/cap-card";
import { RarityBadge, rarityStyle } from "@/components/ui/rarity";
import { RarityDistribution } from "@/components/ui/rarity-distribution";
import { ProgressBar } from "@/components/ui/progress";
import { AchievementIcon } from "@/components/ui/achievement-icon";
import { ProfileNameForm, ProfilePrivacy } from "@/components/profile/profile-actions";

export const metadata: Metadata = {
  title: "Профиль",
  description: "Твой профиль коллекционера KAPS: уровень, редкости, достижения и настройки приватности.",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const [stats, recent, unlocked] = await Promise.all([
    getCollectionStats(user.id),
    getRecentItems(user.id, 4),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 4,
    }),
  ]);

  const name = displayNameFor(user);

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Коллекционер"
        title="Профиль"
        description="Личная карточка в архиве KAPS: уровень, коллекция и настройки видимости."
        actions={
          <>
            <Link href="/settings" className="btn btn-ghost">
              <Settings size={15} />
              Настройки
            </Link>
            <Link href="/add" className="btn btn-primary">
              <Sparkles size={15} />
              Добавить крышку
            </Link>
          </>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.45fr)]">
        <div className="space-y-4">
          <section className="surface overflow-hidden">
            <div
              className="relative h-32 overflow-hidden sm:h-40"
              style={{
                background:
                  "linear-gradient(120deg, color-mix(in srgb, var(--accent) 38%, #0a0c09), #0b0d0a 72%)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute -right-10 -top-16 size-64 rounded-full opacity-30 blur-[60px]"
                style={{ background: "var(--accent)" }}
              />
              <div className="absolute right-4 top-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/70 backdrop-blur">
                  <Trophy size={10} />
                  Level {stats.level.level} · {stats.level.title}
                </span>
              </div>
            </div>
            <div className="px-5 pb-5 sm:px-6">
              <div className="-mt-11 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <Avatar user={{ displayName: name, photoUrl: user.photoUrl, isDemo: user.isDemo }} size={92} ring />
                  <div className="pb-1">
                    <h2 className="font-display text-[clamp(24px,4vw,34px)] font-[650] tracking-[-0.05em]">
                      {name}
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                      {user.username ? `@${user.username}` : "Telegram-профиль"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {roleLabel(user.role)}
                  </span>
                  {user.isDemo ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                      demo
                    </span>
                  ) : null}
                  <Link href={`/u/${user.slug}`} className="btn btn-ghost btn-sm">
                    Публичный профиль
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={12} />
                  В KAPS с {formatLongDate(user.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={12} />
                  {capCount(stats.totalCaps)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Factory size={12} />
                  {stats.manufacturerCount} {plural(stats.manufacturerCount, "производитель", "производителя", "производителей")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={12} />
                  {stats.uniqueModels} моделей
                </span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <MiniStat label="Крышек" value={number(stats.totalCaps)} hint="в архиве" />
            <MiniStat label="Каталог" value={`${stats.progress}%`} hint={`${stats.uniqueModels}/${stats.catalogTotal}`} />
            <MiniStat label="Достижения" value={number(stats.achievementCount)} hint={achievementCount(stats.achievementCount)} />
            <MiniStat label="Производители" value={number(stats.manufacturerCount)} hint="уникальных" />
          </div>

          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">Последние крышки</h2>
                <p className="mt-1 text-[11px] text-[var(--muted)]">Свежие пополнения архива</p>
              </div>
              <Link href="/collection" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
                Вся коллекция
                <ArrowRight size={13} />
              </Link>
            </div>
            {recent.length > 0 ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {recent.map((item) => (
                  <CapCard key={item.id} item={item} compact showDate={false} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-8 text-center text-[12px] text-[var(--muted)]">
                Пока нет крышек. <Link href="/add" className="font-semibold text-[var(--accent)]">Добавить первую</Link>
              </div>
            )}
          </section>

          <section className="surface p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">Состав коллекции</h2>
                <p className="mt-1 text-[11px] text-[var(--muted)]">Редкости и прогресс каталога</p>
              </div>
              <span className="font-display text-[18px] font-[640] text-[var(--accent)]">{stats.progress}%</span>
            </div>
            <RarityDistribution stats={stats} showValues />
            <div className="mt-5">
              <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                <span>Прогресс каталога</span>
                <span>{stats.uniqueModels} / {stats.catalogTotal}</span>
              </div>
              <ProgressBar value={stats.progress} height={6} className="mt-2" />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ProfilePrivacy initialPublic={user.isPublic} slug={user.slug} />

          <section className="surface p-5">
            <div className="flex items-center gap-4">
              <LevelRing stats={stats} size={80} stroke={5} />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Уровень</p>
                <p className="font-display mt-0.5 text-[17px] font-[640] tracking-[-0.03em]">{stats.level.title}</p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{stats.level.totalXp} XP</p>
              </div>
            </div>
            <ProgressBar value={stats.level.progress} height={5} className="mt-4" />
            <p className="mt-2 text-[9.5px] text-[var(--muted)]">
              {stats.level.nextLevelXp
                ? `До «${stats.level.nextTitle}»: ${Math.max(0, stats.level.nextLevelXp - stats.level.totalXp)} XP`
                : "Максимальный уровень"}
            </p>
          </section>

          <section className="surface p-5">
            <p className="eyebrow">Редчайшая находка</p>
            {stats.rarest ? (
              <Link
                href={`/collection/${stats.rarest.id}`}
                className="mt-3 block"
                style={rarityStyle(stats.rarest.rarity)}
              >
                <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={stats.rarest.imageUrl}
                    alt={stats.rarest.productName ?? "Крышка"}
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">
                      {stats.rarest.productName ?? stats.rarest.brandName ?? "Крышка"}
                    </p>
                    <p className="text-[9.5px] text-[var(--muted)]">{stats.rarest.manufacturerName}</p>
                  </div>
                  <RarityBadge rarity={stats.rarest.rarity} showIcon />
                </div>
              </Link>
            ) : (
              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">Добавь крышку, чтобы определить самую редкую находку.</p>
            )}
          </section>

          <section className="surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="eyebrow">Достижения</p>
              <Link href="/achievements" className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
                Все
              </Link>
            </div>
            {unlocked.length > 0 ? (
              <div className="mt-3 space-y-2">
                {unlocked.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                      <AchievementIcon icon={entry.achievement.icon} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{entry.achievement.title}</p>
                      <p className="text-[9px] text-[var(--muted)]">{formatDate(entry.unlockedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">Первое достижение появится после добавления крышки.</p>
            )}
          </section>

          <section className="surface p-5" id="profile-name">
            <p className="eyebrow">Отображаемое имя</p>
            <p className="mt-2 text-[10.5px] leading-5 text-[var(--muted)]">
              Так тебя видят другие коллекционеры в рейтингах и публичном профиле.
            </p>
            <div className="mt-3">
              <ProfileNameForm initialName={name} />
            </div>
          </section>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
              <ShieldCheck size={12} />
              Аккаунт Telegram
            </div>
            <p className="mt-2 text-[10.5px] leading-5 text-[var(--muted)]">
              Профиль создан автоматически через Telegram. Фото и имя синхронизируются при входе.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <p className="font-display mt-2 text-[24px] font-[650] tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-[9px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
