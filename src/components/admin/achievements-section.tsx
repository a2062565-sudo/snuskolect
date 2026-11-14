"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
} from "lucide-react";
import type { AdminAchievementDTO, Rarity } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { number } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import { AchievementIcon, ACHIEVEMENT_ICON_OPTIONS } from "@/components/ui/achievement-icon";
import { RarityBadge } from "@/components/ui/rarity";
import {
  AdminBadge,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSectionHeading,
} from "./shared";

type Metric = AdminAchievementDTO["metric"];

interface AchievementForm {
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: Metric;
  target: string;
  rarity: "" | Rarity;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: AchievementForm = {
  key: "",
  title: "",
  description: "",
  icon: "award",
  metric: "CAP_COUNT",
  target: "1",
  rarity: "",
  sortOrder: "10",
  isActive: true,
};

const METRIC_LABEL: Record<Metric, string> = {
  CAP_COUNT: "Количество крышек",
  RARITY_COUNT: "Крышки редкости",
  MANUFACTURER_COUNT: "Уникальные производители",
};

export function AchievementsSection() {
  const toast = useToast();
  const [achievements, setAchievements] = useState<AdminAchievementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAchievementDTO | null>(null);
  const [form, setForm] = useState<AchievementForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ achievements: AdminAchievementDTO[] }>("/api/admin/achievements");
      setAchievements(data.achievements);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить достижения.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальная загрузка данных
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY,
      sortOrder: String((achievements.at(-1)?.sortOrder ?? 0) + 10),
    });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(achievement: AdminAchievementDTO) {
    setEditing(achievement);
    setForm({
      key: achievement.key,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      metric: achievement.metric,
      target: String(achievement.target),
      rarity: achievement.rarity ?? "",
      sortOrder: String(achievement.sortOrder),
      isActive: achievement.isActive,
    });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    if (saving) return;
    const target = Number(form.target);
    const sortOrder = Number(form.sortOrder);
    if (!form.key.trim() || !form.title.trim() || !form.description.trim()) {
      setFormError("Заполните ключ, название и описание.");
      return;
    }
    if (!Number.isFinite(target) || target < 1) {
      setFormError("Цель должна быть целым числом больше нуля.");
      return;
    }
    if (form.metric === "RARITY_COUNT" && !form.rarity) {
      setFormError("Для метрики RARITY_COUNT выберите редкость.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      key: form.key.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      icon: form.icon,
      metric: form.metric,
      target,
      rarity: form.metric === "RARITY_COUNT" ? form.rarity || null : null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        const data = await apiFetch<{ achievement: AdminAchievementDTO }>(
          `/api/admin/achievements/${editing.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setAchievements((current) =>
          current.map((entry) => (entry.id === editing.id ? data.achievement : entry)),
        );
        toast.success("Достижение обновлено");
      } else {
        const data = await apiFetch<{ achievement: AdminAchievementDTO }>("/api/admin/achievements", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAchievements((current) =>
          [...current, data.achievement].sort((a, b) => a.sortOrder - b.sortOrder),
        );
        toast.success("Достижение создано");
      }
      setOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Не удалось сохранить достижение.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(achievement: AdminAchievementDTO) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Удалить достижение «${achievement.title}»? Если оно уже выдано, будет переведено в архив.`,
    );
    if (!confirmed) return;
    setDeletingId(achievement.id);
    try {
      const data = await apiFetch<{
        deleted?: boolean;
        deactivated?: boolean;
        achievement?: AdminAchievementDTO;
        message?: string;
      }>(`/api/admin/achievements/${achievement.id}`, { method: "DELETE" });
      if (data.deleted) {
        setAchievements((current) => current.filter((entry) => entry.id !== achievement.id));
        toast.success("Достижение удалено");
      } else if (data.achievement) {
        setAchievements((current) =>
          current.map((entry) => (entry.id === achievement.id ? data.achievement! : entry)),
        );
        toast.info("Достижение в архиве", data.message);
      }
    } catch (caught) {
      toast.error("Не удалось удалить", caught instanceof Error ? caught.message : undefined);
    } finally {
      setDeletingId(null);
    }
  }

  async function recalculate() {
    if (recalculating) return;
    const confirmed = window.confirm(
      "Пересчитать достижения для всех реальных пользователей? Уже выданные достижения не отзываются.",
    );
    if (!confirmed) return;
    setRecalculating(true);
    try {
      const data = await apiFetch<{ processed: number; unlocked: number }>(
        "/api/admin/achievements/recalculate",
        { method: "POST" },
      );
      toast.success(
        "Пересчёт завершён",
        `Пользователей: ${data.processed}. Новых достижений: ${data.unlocked}.`,
      );
      void load();
    } catch (caught) {
      toast.error("Не удалось пересчитать", caught instanceof Error ? caught.message : undefined);
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div>
      <AdminSectionHeading
        title="Достижения"
        description="Правила выдачи, цели и иконки. После изменения правил запусти пересчёт для существующих коллекций."
        action={
          <>
            <button
              type="button"
              onClick={() => void recalculate()}
              disabled={recalculating}
              className="btn btn-ghost btn-sm"
            >
              {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
              Пересчитать
            </button>
            <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-ghost btn-sm">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Обновить
            </button>
            <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
              <Plus size={13} />
              Достижение
            </button>
          </>
        }
      />

      {error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : loading && achievements.length === 0 ? (
        <AdminLoading label="Загружаем достижения…" />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Достижение</th>
                  <th>Критерий</th>
                  <th>Цель</th>
                  <th>Редкость</th>
                  <th>Порядок</th>
                  <th>Выдано</th>
                  <th>Статус</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {achievements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[11px] text-[var(--muted)]">
                      Достижений пока нет.
                    </td>
                  </tr>
                ) : (
                  achievements.map((achievement) => (
                    <tr key={achievement.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                            <AchievementIcon icon={achievement.icon} size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[230px] truncate text-[11.5px] font-semibold">
                              {achievement.title}
                            </p>
                            <p className="max-w-[260px] truncate text-[8.5px] text-[var(--muted)]">
                              {achievement.description}
                            </p>
                            <p className="font-mono text-[8px] text-[var(--muted)]">{achievement.key}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="whitespace-nowrap text-[10px]">{METRIC_LABEL[achievement.metric]}</p>
                      </td>
                      <td className="tabular-nums">{achievement.target}</td>
                      <td>
                        {achievement.rarity ? (
                          <RarityBadge rarity={achievement.rarity} />
                        ) : (
                          <span className="text-[9px] text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="tabular-nums text-[10px]">{achievement.sortOrder}</td>
                      <td className="tabular-nums text-[10px]">{number(achievement.unlockedCount)}</td>
                      <td>
                        {achievement.isActive ? (
                          <AdminBadge tone="accent">active</AdminBadge>
                        ) : (
                          <AdminBadge tone="warn">архив</AdminBadge>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(achievement)}
                            className="icon-btn !size-7 !border-transparent !bg-transparent"
                            aria-label="Редактировать"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(achievement)}
                            disabled={deletingId === achievement.id}
                            className="icon-btn !size-7 !border-transparent !bg-transparent text-[#a63c36]"
                            aria-label="Удалить"
                          >
                            {deletingId === achievement.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
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

      <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-4 text-[var(--muted)]">
        <Award size={11} className="mt-0.5 shrink-0" />
        Достижения выдаются после добавления крышки и при изменении каталога. Пересчёт обрабатывает
        только реальные аккаунты и создаёт уведомления о новых наградах.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редактировать достижение" : "Новое достижение"}
        description="Ключ должен быть уникальным и содержать только латиницу, цифры и дефис."
        wide
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">
              Отмена
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              {editing ? "Сохранить" : "Создать"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Ключ" hint="Например: collector-10">
              <input
                value={form.key}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    key: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  }))
                }
                className="input font-mono !text-[12px]"
                maxLength={80}
              />
            </AdminField>
            <AdminField label="Название">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="input"
                maxLength={80}
              />
            </AdminField>
          </div>

          <AdminField label="Описание">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="textarea"
              rows={2}
              maxLength={500}
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Метрика">
              <select
                value={form.metric}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    metric: event.target.value as Metric,
                    ...(event.target.value === "RARITY_COUNT" ? {} : { rarity: "" }),
                  }))
                }
                className="select"
              >
                <option value="CAP_COUNT">Количество крышек</option>
                <option value="RARITY_COUNT">Крышки редкости</option>
                <option value="MANUFACTURER_COUNT">Уникальные производители</option>
              </select>
            </AdminField>
            <AdminField label="Цель">
              <input
                value={form.target}
                onChange={(event) =>
                  setForm((current) => ({ ...current, target: event.target.value.replace(/\D/g, "") }))
                }
                className="input"
                inputMode="numeric"
                maxLength={4}
              />
            </AdminField>
            <AdminField
              label="Редкость"
              hint={form.metric === "RARITY_COUNT" ? "Обязательно для выбранной метрики." : "Используется только для RARITY_COUNT."}
            >
              <select
                value={form.rarity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, rarity: event.target.value as "" | Rarity }))
                }
                disabled={form.metric !== "RARITY_COUNT"}
                className="select"
              >
                <option value="">Не выбрана</option>
                {RARITY_ORDER.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {RARITY_META[rarity].labelEn} — {RARITY_META[rarity].label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Порядок сортировки">
              <input
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sortOrder: event.target.value.replace(/\D/g, "") }))
                }
                className="input"
                inputMode="numeric"
                maxLength={3}
              />
            </AdminField>
          </div>

          <AdminField label="Иконка">
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {ACHIEVEMENT_ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, icon }))}
                  aria-label={`Иконка ${icon}`}
                  aria-pressed={form.icon === icon}
                  className="grid aspect-square place-items-center rounded-xl border transition-colors"
                  style={{
                    borderColor: form.icon === icon ? "var(--accent)" : "var(--line)",
                    background: form.icon === icon ? "var(--accent-soft)" : "var(--surface)",
                    color: form.icon === icon ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  <AchievementIcon icon={icon} size={16} />
                </button>
              ))}
            </div>
          </AdminField>

          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Активно и может быть выдано
          </label>

          {formError ? (
            <p className="rounded-xl border border-[rgba(176,58,52,0.24)] bg-[rgba(176,58,52,0.08)] px-3 py-2 text-[10.5px] text-[#a63c36]">
              {formError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
