"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import type { NotificationDTO } from "@/lib/types";
import { relativeTime } from "@/lib/format";
import { apiFetch } from "@/lib/client";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch<{ notifications: NotificationDTO[]; unreadCount: number }>(
        "/api/notifications",
      );
      setNotifications(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      // Silent: the bell must never break navigation.
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  useEffect(() => {
    // Начальная загрузка уведомлений; loading выставляется внутри запроса.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch {
      // No-op.
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Уведомления: ${unread} новых` : "Уведомления"}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!loaded) void load();
        }}
        className="icon-btn relative"
      >
        <Bell size={18} strokeWidth={1.9} />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[8.5px] font-bold leading-4 text-[var(--accent-ink)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="glass animate-rise absolute right-0 top-[52px] z-50 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-[22px] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Bell size={15} />
              <span className="font-display text-[14px] font-[640]">Уведомления</span>
              {unread > 0 ? (
                <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                  {unread}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >
                  <CheckCheck size={13} />
                  Прочитать
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="grid size-7 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[min(430px,60dvh)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="skeleton h-14 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
                  <Inbox size={19} />
                </span>
                <p className="text-[13px] font-semibold">Пока тихо</p>
                <p className="mt-1 text-[11.5px] leading-5 text-[var(--muted)]">
                  Здесь появятся достижения, ответы поддержки и обновления каталога.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((item) => {
                  const content = (
                    <div
                      className={`rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)] ${
                        item.read ? "" : "bg-[var(--accent-soft)]/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] font-semibold leading-5">{item.title}</p>
                        {!item.read ? (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-[1.55] text-[var(--muted)]">
                        {item.body}
                      </p>
                      <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.08em] text-[var(--muted)] opacity-70">
                        {relativeTime(item.createdAt)}
                      </p>
                    </div>
                  );
                  return item.href ? (
                    <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
