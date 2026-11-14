"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Camera,
  ChartNoAxesCombined,
  Eye,
  RefreshCw,
  ScanLine,
  Sparkles,
  Users,
} from "lucide-react";
import type { AdminStatsDTO } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { formatDate, number } from "@/lib/format";
import { AdminBadge, AdminCard, AdminError, AdminLoading, AdminSectionHeading, AdminStat, ActivityChart, RarityBar } from "./shared";

export function AnalyticsSection() {
  const [stats, setStats] = useState<AdminStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ stats: AdminStatsDTO }>("/api/admin/stats");
      setStats(data.stats);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить аналитику.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальная загрузка данных
    void load();
  }, [load]);

  if (loading && !stats) return <AdminLoading label="Собираем аналитику…" />;
  if (!stats) return <AdminError message={error ?? "Нет данных"} onRetry={() => void load()} />;

  const totals = stats.chart.reduce(
    (accumulator, point) => ({
      views: accumulator.views + point.pageViews,
      caps: accumulator.caps + point.caps,
      signups: accumulator.signups + point.signups,
    }),
    { views: 0, caps: 0, signups: 0 },
  );
  const totalRarity = RARITY_ORDER.reduce((sum, rarity) => sum + stats.rarity[rarity], 0);
  const capsPerUser = stats.realUsers > 0 ? Math.round((stats.totalCaps / stats.realUsers) * 10) / 10 : 0;
  const maxManufacturer = Math.max(1, ...stats.topManufacturers.map((entry) => entry.count));

  return (
    <div className="space-y-4">
      <AdminSectionHeading
        title="Аналитика"
        description="Просмотры страниц, сканирования, регистрации и пополнения коллекций. Только реальные аккаунты, без demo."
        action={
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <AdminStat
          label="Просмотры сегодня"
          value={number(stats.pageViewsToday)}
          hint={`${number(stats.pageViews7d)} за 7 дней`}
          icon={<Eye size={13} />}
        />
        <AdminStat
          label="Просмотры 14 дней"
          value={number(totals.views)}
          hint="page_view events"
          icon={<BarChart3 size={13} />}
        />
        <AdminStat
          label="Сканы сегодня"
          value={number(stats.scansToday)}
          hint="реальных пользователей"
          icon={<ScanLine size={13} />}
          accent="#4c86b8"
        />
        <AdminStat
          label="Крышки 14 дней"
          value={number(totals.caps)}
          hint="добавлено в коллекции"
          icon={<Sparkles size={13} />}
        />
        <AdminStat
          label="Регистрации 14 дней"
          value={number(totals.signups)}
          hint={`${number(stats.realUsers)} всего`}
          icon={<Users size={13} />}
        />
        <AdminStat
          label="Среднее на коллекционера"
          value={capsPerUser}
          hint="крышек в архиве"
          icon={<Camera size={13} />}
          accent="var(--accent)"
        />
      </div>

      <AdminCard className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-[18px] font-[640] tracking-[-0.03em]">
              Активность за 14 дней
            </h2>
            <p className="mt-0.5 text-[10px] text-[var(--muted)]">
              Просмотры страниц, добавленные крышки и новые аккаунты
            </p>
          </div>
          <AdminBadge tone="accent">
            <ChartNoAxesCombined size={10} />
            live data
          </AdminBadge>
        </div>
        <ActivityChart chart={stats.chart} height={280} />
      </AdminCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <AdminCard>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[12px] font-semibold">По дням</h2>
            <span className="text-[9px] text-[var(--muted)]">14 дней</span>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Просмотры</th>
                  <th>Крышки</th>
                  <th>Регистрации</th>
                </tr>
              </thead>
              <tbody>
                {stats.chart
                  .slice()
                  .reverse()
                  .map((point) => (
                    <tr key={point.date}>
                      <td className="whitespace-nowrap text-[10px]">{formatDate(`${point.date}T12:00:00`)}</td>
                      <td className="tabular-nums">{number(point.pageViews)}</td>
                      <td className="tabular-nums">{number(point.caps)}</td>
                      <td className="tabular-nums">{number(point.signups)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard className="p-4">
            <h2 className="font-display text-[16px] font-[640] tracking-[-0.03em]">Редкости</h2>
            <p className="mt-0.5 text-[9.5px] text-[var(--muted)]">
              {number(totalRarity)} реальных крышек
            </p>
            <div className="mt-3 space-y-2.5">
              {RARITY_ORDER.map((rarity) => (
                <RarityBar
                  key={rarity}
                  label={RARITY_META[rarity].label}
                  color={RARITY_META[rarity].color}
                  count={stats.rarity[rarity]}
                  total={totalRarity}
                />
              ))}
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <h2 className="font-display text-[16px] font-[640] tracking-[-0.03em]">
              Популярные производители
            </h2>
            <p className="mt-0.5 text-[9.5px] text-[var(--muted)]">По числу реальных крышек</p>
            {stats.topManufacturers.length === 0 ? (
              <p className="mt-4 text-[10px] text-[var(--muted)]">Данных пока нет.</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {stats.topManufacturers.map((manufacturer) => (
                  <div key={manufacturer.name}>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate font-medium">{manufacturer.name}</span>
                      <span className="tabular-nums text-[var(--muted)]">{manufacturer.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(6, (manufacturer.count / maxManufacturer) * 100)}%`,
                          background: manufacturer.accent,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <UsageCard
          title="Просмотры"
          value={stats.pageViewsToday}
          hint="события page_view с полуночи"
        />
        <UsageCard title="Сканы" value={stats.scansToday} hint="загрузки фото на распознавание" />
        <UsageCard title="Demo-крышки" value={stats.demoCaps} hint="не входят в реальные метрики" />
        <UsageCard title="Demo-аккаунты" value={stats.demoUsers} hint="seed и локальная разработка" />
      </div>

      <p className="text-center text-[8.5px] leading-4 text-[var(--muted)]">
        Источники: SiteEvent.page_view, Scan, CollectionItem, User. Часовой пояс — локальный сервер.
        Данные не являются веб-аналитикой третьих сторон.
      </p>
    </div>
  );
}

function UsageCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">{title}</p>
      <p className="font-display mt-1.5 text-[22px] font-[650] tracking-[-0.04em]">{number(value)}</p>
      <p className="mt-0.5 text-[8.5px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}
