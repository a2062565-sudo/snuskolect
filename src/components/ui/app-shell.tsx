"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  ChevronDown,
  CircleUserRound,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { PublicUserDTO } from "@/lib/types";
import { roleLabel } from "@/lib/dto";
import { KapsLogo, KapsMark } from "./logo";
import { Avatar } from "./avatar";
import { NotificationBell } from "./notification-bell";
import { PageViewTracker } from "./page-view-tracker";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/providers/toast-provider";

const NAV = [
  { href: "/", label: "Главная", icon: Home, exact: true },
  { href: "/collection", label: "Коллекция", icon: LayoutGrid },
  { href: "/achievements", label: "Достижения", icon: Award },
  { href: "/stats", label: "Статистика", icon: BarChart3 },
  { href: "/profile", label: "Профиль", icon: CircleUserRound },
  { href: "/settings", label: "Настройки", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/", label: "Главная", icon: Home, exact: true },
  { href: "/collection", label: "Коллекция", icon: LayoutGrid },
  { href: "/add", label: "Добавить", icon: Plus, special: true },
  { href: "/achievements", label: "Достижения", icon: Award },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  children,
}: {
  user: PublicUserDTO;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    // Закрываем меню при смене маршрута — синхронизация с навигацией браузера.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Не удалось выйти", "Попробуйте ещё раз.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageViewTracker />

      <header className="glass sticky top-0 z-40 border-b border-[var(--line)]">
        <div className="container-kaps flex h-[68px] items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <KapsLogo size={35} />
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Основная навигация">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-2 text-[12.5px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--ink)] text-[var(--bg)]"
                        : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/add" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <Plus size={15} strokeWidth={2.2} />
              Добавить
            </Link>
            <NotificationBell />

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-label="Меню профиля"
                className="flex items-center gap-1.5 rounded-full p-0.5 transition-opacity hover:opacity-85"
              >
                <Avatar user={user} size={38} />
                <ChevronDown
                  size={14}
                  className={`hidden text-[var(--muted)] transition-transform sm:block ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen ? (
                <div className="glass animate-rise absolute right-0 top-[52px] z-50 w-[268px] overflow-hidden rounded-[22px] p-2 shadow-2xl">
                  <div className="rounded-2xl bg-[var(--surface-2)] px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar user={user} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{user.displayName}</p>
                        <p className="truncate text-[10.5px] text-[var(--muted)]">
                          {user.username ? `@${user.username}` : roleLabel(user.role)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <span className="rounded-full border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                        {roleLabel(user.role)}
                      </span>
                      {user.isDemo ? (
                        <span className="rounded-full border border-[var(--line)] bg-[var(--card)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.07em] text-[var(--muted)]">
                          demo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-1.5 space-y-0.5">
                    <MenuLink href="/profile" icon={<CircleUserRound size={15} />} label="Мой профиль" />
                    <MenuLink href="/settings" icon={<Settings size={15} />} label="Настройки" />
                    <MenuLink href="/support" icon={<LifeBuoy size={15} />} label="Поддержка" />
                    {user.role === "ADMIN" || user.role === "SUPPORT" ? (
                      <MenuLink
                        href={user.role === "ADMIN" ? "/admin" : "/support"}
                        icon={<ShieldCheck size={15} />}
                        label={user.role === "ADMIN" ? "Админ-панель" : "Консоль поддержки"}
                      />
                    ) : null}
                    {user.role === "ADMIN" ? (
                      <MenuLink href="/settings#support" icon={<Sparkles size={15} />} label="Ключ поддержки" />
                    ) : null}
                  </div>

                  <div className="mt-1.5 border-t border-[var(--line)] pt-1.5">
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                    >
                      <LogOut size={15} />
                      Выйти из KAPS
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28 lg:pb-12">{children}</main>

      <footer className="mt-auto hidden border-t border-[var(--line)] lg:block">
        <div className="container-kaps flex items-start justify-between gap-8 py-9">
          <div>
            <div className="flex items-center gap-2.5">
              <KapsMark size={30} />
              <span className="font-display text-[15px] font-[680] tracking-[0.12em]">
                KAPS<span style={{ color: "var(--accent)" }}>.</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[11.5px] leading-5 text-[var(--muted)]">
              Каждая крышка — часть твоей коллекции. Личный архив, редкие находки и история вкусов.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-x-10 gap-y-2 text-[11.5px]">
            <Link href="/collection" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Коллекция
            </Link>
            <Link href="/achievements" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Достижения
            </Link>
            <Link href="/stats" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Статистика
            </Link>
            <Link href="/add" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Добавить крышку
            </Link>
            <Link href="/support" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Поддержка
            </Link>
            <Link href="/u/demo" className="text-[var(--muted)] hover:text-[var(--ink)]">
              Демо-коллекция
            </Link>
          </div>
        </div>
        <div className="container-kaps flex items-center justify-between border-t border-[var(--line)] py-4 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
          <span>© {new Date().getFullYear()} KAPS Archive</span>
          <span>Made for collectors</span>
        </div>
      </footer>

      <nav
        aria-label="Мобильная навигация"
        className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] lg:hidden"
      >
        <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 items-center px-2">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            if (item.special) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="-mt-6 flex flex-col items-center gap-1"
                  aria-label="Добавить крышку"
                >
                  <span
                    className="grid size-[50px] place-items-center rounded-full text-[var(--accent-ink)] shadow-lg"
                    style={{ background: "var(--accent)", boxShadow: "0 10px 28px -8px var(--accent)" }}
                  >
                    <Plus size={24} strokeWidth={2.2} />
                  </span>
                  <span className="text-[9px] font-semibold text-[var(--muted)]">Добавить</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold ${
                  active ? "text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`grid min-w-11 place-items-center rounded-full py-1 transition-colors ${
                    active ? "bg-[var(--accent-soft)]" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.1 : 1.75} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
    >
      {icon}
      {label}
    </Link>
  );
}
