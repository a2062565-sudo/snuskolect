import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarRange,
  Factory,
  Flame,
  Layers,
  Sparkles,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCollectionStats } from "@/lib/stats";
import { capCount, formatLongDate, number, plural } from "@/lib/format";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import type { Rarity } from "@/lib/types";
import { PageHeader } from "@/components/ui/page";
import { Reveal } from "@/components/ui/reveal";
import { ProgressBar } from "@/components/ui/progress";
import { RarityIcon, rarityStyle } from "@/components/ui/rarity";
import { SectionHeading } from "@/components/ui/page";

export const metadata: Metadata = {
  title: "Статистика",
  description: "Статистика коллекции KAPS: редкости, производители, прогресс каталога и активность.",
};

export default async function StatsPage() {
  const user = await requireUser();
  const stats = await getCollectionStats(user.id);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const chartStart = new Date(dayStart);
  chartStart.setDate(chartStart.getDate() - 13);

  const [manufacturerGroups, catalogRarityGroups, ownedModels, recentItems, achievements] =
    await Promise.all([
      prisma.collectionItem.groupBy({
        by: ["manufacturerId"],
        where: { userId: user.id, manufacturerId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { manufacturerId: "desc" } },
        take: 8,
      }),
      prisma.capModel.groupBy({
        by: ["rarity"],
        where: { isActive: true },
        _count: { _all: true },
      }),
      prisma.collectionItem.findMany({
        where: { userId: user.id, capModelId: { not: null } },
        distinct: ["capModelId"],
        select: { rarity: true },
      }),
      prisma.collectionItem.findMany({
        where: { userId: user.id, createdAt: { gte: chartStart } },
        select: { createdAt: true },
      }),
      prisma.userAchievement.count({ where: { userId: user.id } }),
    ]);

  const manufacturerIds = manufacturerGroups
    .map((group) => group.manufacturerId)
    .filter((id): id is string => Boolean(id));
  const manufacturers = await prisma.manufacturer.findMany({
    where: { id: { in: manufacturerIds } },
    select: { id: true, name: true, accent: true, country: true },
  });
  const manufacturerMap = new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));

  const catalogByRarity = new Map<Rarity, number>();
  for (const group of catalogRarityGroups) {
    catalogByRarity.set(group.rarity as Rarity, group._count._all);
  }
  const ownedByRarity = new Map<Rarity, number>();
  for (const row of ownedModels) {
    ownedByRarity.set(row.rarity as Rarity, (ownedByRarity.get(row.rarity as Rarity) ?? 0) + 1);
  }

  const chart = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + index);
    const key = date.toDateString();
    const count = recentItems.filter((item) => item.createdAt.toDateString() === key).length;
    return {
      date,
      count,
      label: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" })
        .format(date)
        .replace(".", ""),
    };
  });
  const maxDay = Math.max(1, ...chart.map((entry) => entry.count));
  const daysCollecting = stats.daysCollecting;
  const perWeek = daysCollecting > 0 ? (stats.totalCaps / (daysCollecting / 7)).toFixed(1) : "0";
  const rarest = stats.rarest;
  const topManufacturerMax = Math.max(1, ...manufacturerGroups.map((group) => group._count._all));

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Аналитика архива"
        title="Статистика"
        description="Числа, которые складываются в историю твоей коллекции. Прогресс каталога, редкости и темпы пополнения."
        actions={
          <Link href="/collection" className="btn btn-ghost">
            Открыть коллекцию
            <ArrowRight size={15} />
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard icon={<Layers size={16} />} label="Крышек" value={number(stats.totalCaps)} hint={capCount(stats.totalCaps)} />
        <StatCard icon={<Boxes size={16} />} label="Моделей" value={`${stats.uniqueModels}`} hint={`${stats.catalogTotal} в каталоге`} />
        <StatCard icon={<Factory size={16} />} label="Производителей" value={number(stats.manufacturerCount)} hint="уникальных в архиве" />
        <StatCard icon={<Trophy size={16} />} label="Достижений" value={number(achievements)} hint="получено" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Reveal className="surface p-5 sm:p-6">
          <SectionHeading
            title="Активность за 14 дней"
            description="Сколько крышек ты добавил за последние две недели"
          />
          <div className="flex h-[170px] items-end gap-1.5 sm:gap-2">
            {chart.map((entry) => (
              <div key={entry.date.toISOString()} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="relative flex flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-[var(--accent)] opacity-80 transition-all duration-500 group-hover:opacity-100"
                    style={{ height: `${Math.max(entry.count > 0 ? 6 : 2, (entry.count / maxDay) * 100)}%` }}
                    title={`${entry.label}: ${entry.count}`}
                  />
                  {entry.count > 0 ? (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100">
                      {entry.count}
                    </span>
                  ) : null}
                </div>
                <span className="mt-1.5 block truncate text-center text-[7.5px] uppercase tracking-[0.04em] text-[var(--muted)]">
                  {entry.label.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[10px] text-[var(--muted)]">
            <span>Средний темп: {perWeek} крышек в неделю</span>
            <span>{chart.reduce((sum, entry) => sum + entry.count, 0)} за 14 дней</span>
          </div>
        </Reveal>

        <Reveal delay={0.05} className="surface flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="eyebrow">Уровень коллекционера</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="font-display text-[30px] font-[650] leading-none tracking-[-0.05em]">
                  {stats.level.level}
                </p>
                <p className="mt-1 text-[12px] font-semibold">{stats.level.title}</p>
              </div>
              <span className="font-display text-[26px] font-[650] tracking-[-0.05em] text-[var(--accent)]">
                {stats.level.totalXp}
                <span className="ml-1 text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">xp</span>
              </span>
            </div>
            <ProgressBar value={stats.level.progress} height={7} className="mt-4" />
            <p className="mt-2 text-[10px] text-[var(--muted)]">
              {stats.level.nextLevelXp
                ? `До «${stats.level.nextTitle}» — ${Math.max(0, stats.level.nextLevelXp - stats.level.totalXp)} XP`
                : "Максимальный уровень"}
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--surface-2)] p-3.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Самая редкая крышка
            </p>
            {rarest ? (
              <Link
                href={`/collection/${rarest.id}`}
                className="mt-2 flex items-center gap-2.5"
                style={rarityStyle(rarest.rarity)}
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{ background: "var(--rarity-soft)", color: "var(--rarity)" }}
                >
                  <RarityIcon rarity={rarest.rarity} size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">
                    {rarest.productName ?? rarest.brandName ?? "Крышка"}
                  </span>
                  <span className="block text-[9.5px] uppercase tracking-[0.06em] text-[var(--muted)]">
                    {RARITY_META[rarest.rarity].labelEn} · {rarest.manufacturerName}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="mt-2 text-[11px] text-[var(--muted)]">Добавь крышку, чтобы увидеть самую редкую находку.</p>
            )}
          </div>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal className="surface p-5 sm:p-6">
          <SectionHeading title="Редкости" description="Распределение крышек по уровням редкости" />
          <div className="space-y-3">
            {RARITY_ORDER.filter((rarity) => rarity !== "UNDETERMINED" || stats.rarityCounts.UNDETERMINED > 0).map(
              (rarity) => {
                const count = stats.rarityCounts[rarity];
                const share = stats.totalCaps ? Math.round((count / stats.totalCaps) * 100) : 0;
                return (
                  <div key={rarity} style={rarityStyle(rarity)}>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-2 font-medium">
                        <span style={{ color: "var(--rarity)" }}>
                          <RarityIcon rarity={rarity} size={13} />
                        </span>
                        {RARITY_META[rarity].label}
                      </span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {count} <span className="opacity-60">· {share}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${share}%`, background: RARITY_META[rarity].color }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </Reveal>

        <Reveal delay={0.05} className="surface p-5 sm:p-6">
          <SectionHeading title="Прогресс каталога" description="Собрано моделей по каждой редкости" />
          <div className="space-y-3.5">
            {RARITY_ORDER.filter((rarity) => catalogByRarity.get(rarity)).map((rarity) => {
              const total = catalogByRarity.get(rarity) ?? 0;
              const owned = ownedByRarity.get(rarity) ?? 0;
              const progress = total ? Math.round((owned / total) * 100) : 0;
              return (
                <div key={rarity} style={rarityStyle(rarity)}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2 font-medium">
                      <span style={{ color: "var(--rarity)" }}>
                        <RarityIcon rarity={rarity} size={13} />
                      </span>
                      {RARITY_META[rarity].label}
                    </span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {owned}/{total} · {progress}%
                    </span>
                  </div>
                  <ProgressBar value={progress} height={5} className="mt-1.5" color={RARITY_META[rarity].color} />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[10px] text-[var(--muted)]">
            <span>Всего в каталоге: {stats.catalogTotal}</span>
            <span>Собрано: {stats.uniqueModels}</span>
          </div>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal className="surface p-5 sm:p-6">
          <SectionHeading title="Производители" description="Кто чаще всего встречается в архиве" />
          {manufacturerGroups.length === 0 ? (
            <p className="text-[12px] text-[var(--muted)]">Пока нет данных — добавь первую крышку.</p>
          ) : (
            <div className="space-y-3">
              {manufacturerGroups.map((group, index) => {
                const manufacturer = group.manufacturerId
                  ? manufacturerMap.get(group.manufacturerId)
                  : null;
                const count = group._count._all;
                return (
                  <div key={group.manufacturerId ?? index} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-[9px] font-semibold tabular-nums text-[var(--muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: manufacturer?.accent ?? "var(--muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate font-medium">{manufacturer?.name ?? "Неизвестно"}</span>
                        <span className="tabular-nums text-[var(--muted)]">{count}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / topManufacturerMax) * 100}%`,
                            background: manufacturer?.accent ?? "var(--accent)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Reveal>

        <Reveal delay={0.05} className="surface flex flex-col justify-between p-5 sm:p-6">
          <div>
            <SectionHeading title="Хронология" description="Твоя личная история коллекции" />
            <div className="space-y-3">
              <TimelineRow
                icon={<Sparkles size={14} />}
                label="Первая крышка"
                value={stats.firstAddedAt ? formatLongDate(stats.firstAddedAt) : "Ещё впереди"}
              />
              <TimelineRow
                icon={<Flame size={14} />}
                label="Последнее пополнение"
                value={stats.lastAddedAt ? formatLongDate(stats.lastAddedAt) : "—"}
              />
              <TimelineRow
                icon={<CalendarRange size={14} />}
                label="Дней в коллекции"
                value={daysCollecting ? `${daysCollecting} ${plural(daysCollecting, "день", "дня", "дней")}` : "—"}
              />
              <TimelineRow
                icon={<BarChart3 size={14} />}
                label="Средний темп"
                value={`${perWeek} крышек / неделя`}
              />
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-3.5">
            <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Следующая полка</p>
            <p className="mt-1 text-[11.5px] leading-5">
              {stats.progress < 100
                ? `До полного каталога: ${stats.catalogTotal - stats.uniqueModels} ${plural(stats.catalogTotal - stats.uniqueModels, "модель", "модели", "моделей")}.`
                : "Каталог собран полностью. Теперь дело за редкими вариантами."}
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{label}</span>
        <span className="grid size-8 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </span>
      </div>
      <p className="stat-value mt-4">{value}</p>
      <p className="mt-1 text-[10px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
        <p className="truncate text-[11.5px] font-semibold">{value}</p>
      </div>
    </div>
  );
}
