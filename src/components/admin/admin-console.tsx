"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Database,
  Factory,
  Images,
  LayoutDashboard,
  LifeBuoy,
  ScanText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { roleLabel } from "@/lib/dto";
import { SupportCenter } from "@/components/support/support-center";
import { OverviewSection } from "./overview-section";
import { UsersSection } from "./users-section";
import { ItemsSection } from "./items-section";
import { CatalogSection } from "./catalog-section";
import { AchievementsSection } from "./achievements-section";
import { AnalyticsSection } from "./analytics-section";

type Tab =
  | "overview"
  | "users"
  | "items"
  | "catalog"
  | "achievements"
  | "tickets"
  | "analytics"
  | "ocr";

const TABS: { id: Tab; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard, hint: "Пульс архива" },
  { id: "users", label: "Пользователи", icon: Users, hint: "Роли и аккаунты" },
  { id: "items", label: "Коллекции", icon: Images, hint: "Фото и карточки" },
  { id: "catalog", label: "Каталог", icon: Factory, hint: "Модели и редкости" },
  { id: "achievements", label: "Достижения", icon: Award, hint: "Правила выдачи" },
  { id: "tickets", label: "Обращения", icon: LifeBuoy, hint: "Поддержка" },
  { id: "analytics", label: "Аналитика", icon: BarChart3, hint: "Метрики" },
  { id: "ocr", label: "Коррекция OCR", icon: ScanText, hint: "Без модели" },
];

const VALID_TABS = new Set<string>(TABS.map((tab) => tab.id));

export function AdminConsole({
  me,
}: {
  me: { id: string; displayName: string; role: Role; isDemo: boolean };
}) {
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация вкладки с URL-хэшем
    if (VALID_TABS.has(hash)) setTab(hash as Tab);
  }, []);

  function navigate(next: string) {
    if (!VALID_TABS.has(next)) return;
    const target = next as Tab;
    setTab(target);
    window.history.replaceState(null, "", `#${target}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div>
          <p className="eyebrow">KAPS · control room</p>
          <h1 className="display-title mt-3 text-[clamp(30px,4.5vw,46px)]">Админ-панель</h1>
          <p className="mt-2 max-w-2xl text-[11.5px] leading-5 text-[var(--muted)]">
            Полный контроль архива: пользователи, каталог, фотографии, редкости, достижения,
            обращения и аналитика. Все действия защищены проверкой роли на сервере.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[9px] font-semibold text-[var(--muted)]">
            <ShieldCheck size={11} style={{ color: "var(--accent)" }} />
            {roleLabel(me.role)} · {me.displayName}
          </span>
          <Link href="/" className="btn btn-ghost btn-sm">
            На сайт
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="surface sticky top-[84px] overflow-hidden p-2" aria-label="Разделы админ-панели">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.1 : 1.8} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-semibold">{item.label}</span>
                    <span
                      className={`block text-[8.5px] ${active ? "text-[color-mix(in_srgb,var(--bg)_65%,transparent)]" : "text-[var(--muted)]"}`}
                    >
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
            <div className="mt-2 border-t border-[var(--line)] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                <Database size={10} />
                PostgreSQL · Prisma
              </p>
              <p className="mt-1 text-[8.5px] leading-4 text-[var(--muted)]">
                Изменения каталога синхронизируются с коллекциями.
              </p>
            </div>
          </nav>
        </aside>

        <div className="min-w-0">
          <nav
            className="scroll-x -mx-4 mb-4 gap-1.5 px-4 pb-1 lg:hidden"
            aria-label="Разделы админ-панели"
          >
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10.5px] font-semibold ${
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                >
                  <Icon size={12} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {tab === "overview" ? <OverviewSection onNavigate={navigate} /> : null}
          {tab === "users" ? <UsersSection meId={me.id} /> : null}
          {tab === "items" ? <ItemsSection /> : null}
          {tab === "catalog" ? <CatalogSection /> : null}
          {tab === "achievements" ? <AchievementsSection /> : null}
          {tab === "tickets" ? (
            <div>
              <div className="mb-4">
                <h2 className="font-display text-[21px] font-[640] tracking-[-0.035em]">Обращения</h2>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-[var(--muted)]">
                  Очередь поддержки: переписка, назначение на себя и статусы. Ответы уходят
                  пользователю на сайт и в Telegram.
                </p>
              </div>
              <SupportCenter
                isStaff
                me={{ displayName: me.displayName, role: me.role }}
              />
            </div>
          ) : null}
          {tab === "analytics" ? <AnalyticsSection /> : null}
          {tab === "ocr" ? <ItemsSection mode="ocr" /> : null}

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-[8.5px] text-[var(--muted)]">
            <span>KAPS Admin · данные защищены серверной авторизацией</span>
            <span>Демо-аккаунт: {me.isDemo ? "да" : "нет"}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
