import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Factory,
  Layers,
  Lock,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCollectionStats, getCollectionItems } from "@/lib/stats";
import { displayNameFor, roleLabel } from "@/lib/dto";
import { capCount, formatLongDate, number, plural } from "@/lib/format";
import { KapsLogo, KapsMark } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { RarityDistribution } from "@/components/ui/rarity-distribution";
import { ProgressBar } from "@/components/ui/progress";
import { CollectionBrowser } from "@/components/collection/collection-browser";
import { PageViewTracker } from "@/components/ui/page-view-tracker";
import { Reveal } from "@/components/ui/reveal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await prisma.user.findUnique({ where: { slug } });
  if (!user || !user.isPublic) return { title: "Профиль коллекционера" };
  const name = displayNameFor(user);
  return {
    title: `${name} — коллекция`,
    description: `Коллекция крышек снюса ${name} в архиве KAPS.`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const user = await prisma.user.findUnique({ where: { slug } });
  if (!user) notFound();

  const isOwner = viewer?.id === user.id;
  const isStaff = viewer ? viewer.role === "SUPPORT" || viewer.role === "ADMIN" : false;
  const canView = user.isPublic || isOwner || isStaff;

  if (!canView) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageViewTracker />
        <header className="border-b border-[var(--line)]">
          <div className="container-kaps flex h-[68px] items-center justify-between">
            <KapsLogo />
            {viewer ? (
              <Link href="/" className="btn btn-ghost btn-sm">
                <ArrowLeft size={14} />
                На главную
              </Link>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                Войти
              </Link>
            )}
          </div>
        </header>
        <main className="container-kaps flex flex-1 items-center justify-center py-16">
          <div className="surface max-w-md p-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
              <Lock size={24} />
            </span>
            <p className="eyebrow mt-5 justify-center">Приватный профиль</p>
            <h1 className="display-title mt-3 text-[32px]">Коллекция скрыта</h1>
            <p className="mt-2 text-[12.5px] leading-6 text-[var(--muted)]">
              Коллекционер закрыл свой архив. Если это ты — войди через Telegram, чтобы увидеть свою коллекцию.
            </p>
            <Link href={`/login?next=/u/${slug}`} className="btn btn-primary mt-5">
              Войти через Telegram
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const [stats, items] = await Promise.all([getCollectionStats(user.id), getCollectionItems(user.id)]);
  const name = displayNameFor(user);

  return (
    <div className="flex min-h-dvh flex-col">
      <PageViewTracker />
      <header className="glass sticky top-0 z-40 border-b border-[var(--line)]">
        <div className="container-kaps flex h-[68px] items-center justify-between gap-3">
          <KapsLogo />
          <div className="flex items-center gap-2">
            {viewer ? (
              <>
                <Link href="/collection" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                  <ArrowLeft size={14} />
                  К моей коллекции
                </Link>
                <Link href="/profile" className="flex items-center gap-2 rounded-full p-0.5">
                  <Avatar
                    user={{ displayName: displayNameFor(viewer), photoUrl: viewer.photoUrl, isDemo: viewer.isDemo }}
                    size={36}
                  />
                </Link>
              </>
            ) : (
              <Link href={`/login?next=/u/${slug}`} className="btn btn-primary btn-sm">
                Войти через Telegram
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16">
        <div className="container-kaps pt-5 sm:pt-8">
          {user.isDemo ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-[var(--accent)]" />
                <p className="text-[11.5px] text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">Демонстрационная коллекция.</span> Так выглядит
                  архив в KAPS. Реальные коллекции пользователей хранятся отдельно.
                </p>
              </div>
              {!viewer ? (
                <Link href="/login" className="text-[10.5px] font-semibold text-[var(--accent)]">
                  Создать свою →
                </Link>
              ) : null}
            </div>
          ) : null}

          <section className="surface overflow-hidden">
            <div
              className="relative h-32 overflow-hidden sm:h-44"
              style={{
                background:
                  "linear-gradient(120deg, color-mix(in srgb, var(--accent) 38%, #0a0c09), #0b0d0a 72%)",
              }}
            >
              <div
                aria-hidden="true"
                className="absolute -right-14 -top-20 size-72 rounded-full opacity-30 blur-[70px]"
                style={{ background: "var(--accent)" }}
              />
              <div className="absolute right-4 top-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/70 backdrop-blur">
                  <Trophy size={10} />
                  Level {stats.level.level} · {stats.level.title}
                </span>
                {user.isDemo ? (
                  <span className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/70 backdrop-blur">
                    demo
                  </span>
                ) : null}
              </div>
            </div>
            <div className="px-5 pb-5 sm:px-7">
              <div className="-mt-11 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-3">
                  <Avatar user={{ displayName: name, photoUrl: user.photoUrl, isDemo: user.isDemo }} size={94} ring />
                  <div className="pb-1">
                    <h1 className="font-display text-[clamp(26px,5vw,38px)] font-[650] tracking-[-0.05em]">{name}</h1>
                    <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                      {user.username ? `@${user.username}` : "Коллекционер KAPS"} · {roleLabel(user.role)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {isOwner ? (
                    <>
                      <Link href="/settings" className="btn btn-ghost btn-sm">
                        <Settings size={13} />
                        Настройки
                      </Link>
                      <Link href="/profile" className="btn btn-primary btn-sm">
                        Мой профиль
                        <ArrowUpRight size={13} />
                      </Link>
                    </>
                  ) : viewer ? (
                    <Link href="/" className="btn btn-ghost btn-sm">
                      <ArrowLeft size={13} />
                      Моя коллекция
                    </Link>
                  ) : (
                    <Link href="/login" className="btn btn-primary btn-sm">
                      Собрать свою коллекцию
                      <ArrowRight size={13} />
                    </Link>
                  )}
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

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat label="Крышек" value={number(stats.totalCaps)} hint="в коллекции" />
            <Stat label="Каталог" value={`${stats.progress}%`} hint={`${stats.uniqueModels}/${stats.catalogTotal}`} />
            <Stat label="Достижения" value={number(stats.achievementCount)} hint="открыто" />
            <Stat label="Уровень" value={String(stats.level.level)} hint={stats.level.title} />
          </div>

          <Reveal className="surface mt-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em]">Состав коллекции</h2>
                <p className="mt-1 text-[11px] text-[var(--muted)]">Редкости и прогресс каталога</p>
              </div>
              <span className="font-display text-[22px] font-[650] text-[var(--accent)]">{stats.progress}%</span>
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <ProgressBar value={stats.progress} height={7} />
                <p className="mt-2 text-[10px] text-[var(--muted)]">
                  {stats.uniqueModels} из {stats.catalogTotal} моделей каталога
                </p>
              </div>
              <RarityDistribution stats={stats} hrefBase="/collection" />
            </div>
          </Reveal>

          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Публичный архив</p>
                <h2 className="font-display mt-2 text-[24px] font-[640] tracking-[-0.04em]">Коллекция</h2>
              </div>
              <span className="text-[10px] text-[var(--muted)]">{capCount(stats.totalCaps)}</span>
            </div>
            {items.length > 0 ? (
              <CollectionBrowser items={items} title={name} />
            ) : (
              <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] px-6 py-16 text-center">
                <KapsMark size={42} />
                <p className="mt-4 font-display text-[18px] font-[640]">Коллекция пока пуста</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">Первая крышка появится здесь совсем скоро.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className="container-kaps flex flex-wrap items-center justify-between gap-3 py-5 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <KapsMark size={22} />
            KAPS Archive · {new Date().getFullYear()}
          </span>
          <span>Каждая крышка — часть твоей коллекции</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</p>
      <p className="font-display mt-2 text-[24px] font-[650] tracking-[-0.05em]">{value}</p>
      <p className="mt-1 text-[9px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
