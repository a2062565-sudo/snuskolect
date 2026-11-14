"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import type { AdminUserDTO, Role } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { formatDate, relativeTime } from "@/lib/format";
import { roleLabel } from "@/lib/dto";
import { useToast } from "@/components/providers/toast-provider";
import { AdminBadge, AdminError, AdminLoading, AdminSectionHeading, AdminSearch } from "./shared";

export function UsersSection({ meId }: { meId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"ALL" | Role>("ALL");
  const [demo, setDemo] = useState<"all" | "real" | "demo">("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (role !== "ALL") params.set("role", role);
    if (demo !== "all") params.set("demo", demo === "demo" ? "true" : "false");
    try {
      const data = await apiFetch<{ users: AdminUserDTO[] }>(
        `/api/admin/users${params.size ? `?${params.toString()}` : ""}`,
      );
      setUsers(data.users);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить пользователей.");
    } finally {
      setLoading(false);
    }
  }, [search, role, demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 260);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function changeRole(target: AdminUserDTO, next: Role) {
    if (next === target.role || savingId) return;
    setSavingId(target.id);
    try {
      const data = await apiFetch<{ user: AdminUserDTO }>("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: target.id, role: next }),
      });
      setUsers((current) =>
        current.map((user) => (user.id === target.id ? data.user : user)),
      );
      toast.success("Роль обновлена", `${target.displayName}: ${roleLabel(next)}`);
    } catch (caught) {
      toast.error("Не удалось изменить роль", caught instanceof Error ? caught.message : undefined);
    } finally {
      setSavingId(null);
    }
  }

  const counts = {
    all: users.length,
    support: users.filter((user) => user.role === "SUPPORT").length,
    admin: users.filter((user) => user.role === "ADMIN").length,
    demo: users.filter((user) => user.isDemo).length,
  };

  return (
    <div>
      <AdminSectionHeading
        title="Пользователи"
        description="Роли Telegram-аккаунтов, размеры коллекций и активность. Демо- и dev-аккаунты помечены отдельно."
        action={
          <>
            <AdminBadge tone="accent">
              <Users size={10} />
              {counts.all} в выборке
            </AdminBadge>
            <AdminBadge tone="warn">
              <ShieldCheck size={10} />
              {counts.support} support
            </AdminBadge>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Обновить
            </button>
          </>
        }
      />

      <div className="surface mb-3 flex flex-wrap items-center gap-2 p-3">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Имя, @username, Telegram ID"
          className="min-w-[210px] flex-1 sm:max-w-[320px]"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as "ALL" | Role)}
          className="select !h-10 !w-auto min-w-[130px] text-[12px]"
          aria-label="Фильтр по роли"
        >
          <option value="ALL">Все роли</option>
          <option value="USER">User</option>
          <option value="SUPPORT">Support</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={demo}
          onChange={(event) => setDemo(event.target.value as "all" | "real" | "demo")}
          className="select !h-10 !w-auto min-w-[140px] text-[12px]"
          aria-label="Фильтр демо-аккаунтов"
        >
          <option value="all">Все аккаунты</option>
          <option value="real">Только реальные</option>
          <option value="demo">Демо / dev</option>
        </select>
        <span className="ml-auto text-[9px] text-[var(--muted)]">
          {counts.admin} admin · {counts.demo} demo
        </span>
      </div>

      {error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : loading && users.length === 0 ? (
        <AdminLoading label="Загружаем пользователей…" />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Telegram ID</th>
                  <th>Роль</th>
                  <th>Крышки</th>
                  <th>Достижения</th>
                  <th>Регистрация</th>
                  <th>Последний вход</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[11px] text-[var(--muted)]">
                      Пользователи не найдены.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
                            {user.displayName.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[180px] truncate text-[11.5px] font-semibold">
                              {user.displayName}
                            </p>
                            <p className="max-w-[180px] truncate text-[8.5px] text-[var(--muted)]">
                              {user.username ? `@${user.username}` : `/u/${user.slug}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-[9.5px] text-[var(--muted)]">
                          {user.telegramId}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={user.role}
                            onChange={(event) => void changeRole(user, event.target.value as Role)}
                            disabled={user.id === meId || savingId === user.id}
                            className="select !h-8 !w-[110px] !rounded-lg !px-2 !pr-7 text-[10.5px]"
                            aria-label={`Роль ${user.displayName}`}
                          >
                            <option value="USER">User</option>
                            <option value="SUPPORT">Support</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          {savingId === user.id ? (
                            <Loader2 size={12} className="animate-spin text-[var(--muted)]" />
                          ) : null}
                        </div>
                      </td>
                      <td className="tabular-nums">{user.caps}</td>
                      <td className="tabular-nums">{user.achievements}</td>
                      <td className="whitespace-nowrap text-[10px] text-[var(--muted)]">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="whitespace-nowrap text-[9.5px] text-[var(--muted)]">
                        {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "—"}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {user.isDemo ? <AdminBadge>demo</AdminBadge> : <AdminBadge tone="accent">real</AdminBadge>}
                          {user.isPublic ? <AdminBadge>public</AdminBadge> : null}
                          {user.id === meId ? (
                            <AdminBadge tone="warn">
                              <UserRound size={9} />
                              вы
                            </AdminBadge>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-[9px] text-[var(--muted)]">
        Нельзя снять роль Admin с самого себя. Назначение роли создаёт уведомление пользователю.
        Максимум 200 записей в выборке.
      </p>
    </div>
  );
}
