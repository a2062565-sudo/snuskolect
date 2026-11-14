"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Camera,
  Factory,
  Images,
  LifeBuoy,
  ScanLine,
  Sparkles,
  Users,
} from "lucide-react";
import type { AdminStatsDTO } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { capCount, formatDate, number } from "@/lib/format";
import { RarityBadge } from "@/components/ui/rarity";
import { AdminCard, AdminError, AdminLoading, AdminStat, ActivityChart, RarityBar } from "./shared";

export function OverviewSection({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [stats, setStats] = useState<AdminStatsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ stats: AdminStatsDTO }>("/api/admin/stats");
      setStats(data.stats);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки статистики.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальная загрузка данных
    void load();
  }, [load]);

  if (loading && !stats) return <AdminLoading label="Собираем статистику архива…" />;
  if (!stats) return <AdminError message={error ?? "Нет данных"} onRetry={() => void load()} />;

  const totalRarity = RARITY_ORDER.reduce((sum, rarity) => sum + stats.rarity[rarity], 0);
  const capsPerUser =
    stats.realUsers > 0 ? Math.round((stats.totalCaps / stats.realUsers) * 10) / 10 : 0;
  const maxManufacturer = Math.max(1, ...stats.topManufacturers.map((entry) => entry.count));

  return (
    <div className="space-y-4">
      <div className="surface noise-panel relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 size-[340px] rounded-full opacity-20 blur-[80px]"
          style={{ background: "var(--accent)" }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Обзор</p>
            <h1 className="display-title mt-3 text-[clamp(28px,4vw,42px)]">Пульс KAPS</h1>
            <p className="mt-2 max-w-xl text-[12px] leading-6 text-[var(--muted)]">
              Живые метрики архива, каталога, обращений и активности за последние 14 дней.
              Демо-данные учитываются отдельно.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => onNavigate("items")} className="btn btn-ghost btn-sm">
              <Images size={13} />
              Коллекции
            </button>
            <button type="button" onClick={() => onNavigate("catalog")} className="btn btn-ghost btn-sm">
              <Factory size={13} />
              Каталог
            </button>
            <button type="button" onClick={() => onNavigate("tickets")} className="btn btn-primary btn-sm">
              <LifeBuoy size={13} />
              Обращения ({stats.openTickets})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <AdminStat
          label="Пользователи"
          value={number(stats.realUsers)}
          hint={`${number(stats.demoUsers)} демо / dev`}
          icon={<Users size={13} />}
        />
        <AdminStat
          label="Крышки"
          value={number(stats.totalCaps)}
          hint={`${number(stats.demoCaps)} в демо-архиве`}
          icon={<Sparkles size={13} />}
        />
        <AdminStat
          label="Каталог"
          value={number(stats.catalogModels)}
          hint="активных моделей"
          icon={<Factory size={13} />}
        />
        <AdminStat
          label="Обращения"
          value={number(stats.openTickets)}
          hint="открытых и отвеченных"
          icon={<LifeBuoy size={13} />}
          accent="#b6812e"
        />
        <AdminStat
          label="Просмотры сегодня"
          value={number(stats.pageViewsToday)}
          hint={`${number(stats.pageViews7d)} за 7 дней`}
          icon={<BarChart3 size={13} />}
        />
        <AdminStat
          label="Сканы сегодня"
          value={number(stats.scansToday)}
          hint="реальных пользователей"
          icon={<ScanLine size={13} />}
          accent="#4c86b8"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.5fr)]">
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-[17px] font-[640] tracking-[-0.03em]">Активность</h2>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">Просмотры, добавления и регистрации</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("analytics")}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Подробнее
              <ArrowUpRight size={11} />
            </button>
          </div>
          <ActivityChart chart={stats.chart} />
        </AdminCard>

        <AdminCard className="p-4 sm:p-5">
          <h2 className="font-display text-[17px] font-[640] tracking-[-0.03em]">Состав коллекций</h2>
          <p className="mt-0.5 text-[10px] text-[var(--muted)]">Реальные крышки по редкости</p>
          <div className="mt-4 space-y-3">
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
          <div className="mt-4 border-t border-[var(--line)] pt-3 text-[10px] text-[var(--muted)]">
            Всего в реальных коллекциях: <span className="font-semibold text-[var(--ink)]">{number(totalRarity)}</span>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AdminCard>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[12px] font-semibold">Новые пользователи</h2>
            <button type="button" onClick={() => onNavigate("users")} className="text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
              Все
            </button>
          </div>
          {stats.recentUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-[10.5px] text-[var(--muted)]">Пока нет реальных аккаунтов.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {stats.recentUsers.slice(0, 5).map((user) => (
                <li key={user.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold">{user.displayName}</p>
                    <p className="truncate text-[8.5px] text-[var(--muted)]">
                      {user.username ? `@${user.username}` : "Telegram"} · {user.caps} крышек
                    </p>
                  </div>
                  <span className="shrink-0 text-[8px] text-[var(--muted)]">{formatDate(user.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[12px] font-semibold">Последние крышки</h2>
            <button type="button" onClick={() => onNavigate("items")} className="text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
              Все
            </button>
          </div>
          {stats.recentCaps.length === 0 ? (
            <p className="px-4 py-8 text-center text-[10.5px] text-[var(--muted)]">Реальных крышек пока нет.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {stats.recentCaps.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.productName ?? "Крышка"}
                    className="size-8 shrink-0 rounded-lg border border-[var(--line)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-semibold">
                      {item.brandName ?? item.manufacturerName ?? "Крышка"}
                    </p>
                    <p className="truncate text-[8.5px] text-[var(--muted)]">
                      {item.user.displayName} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <RarityBadge rarity={item.rarity} showIcon={false} />
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard>
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-[12px] font-semibold">Производители</h2>
            <button type="button" onClick={() => onNavigate("catalog")} className="text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]">
              Каталог
            </button>
          </div>
          {stats.topManufacturers.length === 0 ? (
            <p className="px-4 py-8 text-center text-[10.5px] text-[var(--muted)]">Появятся после первых крышек.</p>
          ) : (
            <div className="space-y-3 px-4 py-3.5">
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
          <div className="mt-auto border-t border-[var(--line)] px-4 py-2.5 text-[9px] text-[var(--muted)]">
            Среднее: {capsPerUser} крышек на коллекционера
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <QuickAction
          icon={<Camera size={16} />}
          title="Коррекция OCR"
          text="Проверь крышки без модели и уточни данные"
          onClick={() => onNavigate("ocr")}
        />
        <QuickAction
          icon={<Factory size={16} />}
          title="Каталог и редкости"
          text="Производители, модели и алиасы распознавания"
          onClick={() => onNavigate("catalog")}
        />
        <QuickAction
          icon={<LifeBuoy size={16} />}
          title="Поддержка"
          text={`${stats.openTickets} обращений ждут ответа`}
          onClick={() => onNavigate("tickets")}
        />
      </div>

      <p className="text-center text-[8.5px] text-[var(--muted)]">
        Данные обновляются при входе в раздел · {capCount(stats.totalCaps)} в реальных коллекциях
      </p>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="surface card-hover flex items-center gap-3 p-4 text-left"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[9.5px] leading-4 text-[var(--muted)]">{text}</span>
      </span>
      <ArrowUpRight size={13} className="shrink-0 text-[var(--muted)]" />
    </button>
  );
}
