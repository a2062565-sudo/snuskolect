"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Crown,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { CapModelDTO, ManufacturerDTO, Rarity } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import { RarityBadge } from "@/components/ui/rarity";
import {
  AdminBadge,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSearch,
} from "./shared";

interface ModelForm {
  manufacturerId: string;
  brand: string;
  name: string;
  slug: string;
  rarity: Rarity;
  flavor: string;
  strength: string;
  description: string;
  aliases: string;
  keywords: string;
  releaseYear: string;
  isLimited: boolean;
  isActive: boolean;
}

const EMPTY: ModelForm = {
  manufacturerId: "",
  brand: "",
  name: "",
  slug: "",
  rarity: "COMMON",
  flavor: "",
  strength: "",
  description: "",
  aliases: "",
  keywords: "",
  releaseYear: "",
  isLimited: false,
  isActive: true,
};

function parseList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ModelsPanel() {
  const toast = useToast();
  const [models, setModels] = useState<CapModelDTO[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("ALL");
  const [rarityFilter, setRarityFilter] = useState<"ALL" | Rarity>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CapModelDTO | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsData, manufacturersData] = await Promise.all([
        apiFetch<{ models: CapModelDTO[] }>("/api/admin/models"),
        apiFetch<{ manufacturers: ManufacturerDTO[] }>("/api/admin/manufacturers"),
      ]);
      setModels(modelsData.models);
      setManufacturers(manufacturersData.manufacturers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить каталог моделей.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальная загрузка данных
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return models.filter((model) => {
      if (manufacturerFilter !== "ALL" && model.manufacturerId !== manufacturerFilter) return false;
      if (rarityFilter !== "ALL" && model.rarity !== rarityFilter) return false;
      if (!needle) return true;
      return (
        model.brand.toLowerCase().includes(needle) ||
        model.name.toLowerCase().includes(needle) ||
        model.manufacturerName.toLowerCase().includes(needle) ||
        model.aliases.some((alias) => alias.toLowerCase().includes(needle)) ||
        model.keywords.some((keyword) => keyword.toLowerCase().includes(needle))
      );
    });
  }, [models, search, manufacturerFilter, rarityFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY,
      manufacturerId:
        manufacturerFilter !== "ALL"
          ? manufacturerFilter
          : manufacturers.find((entry) => entry.isActive)?.id ?? manufacturers[0]?.id ?? "",
    });
    setFormError(null);
    setOpen(true);
  }

  function openEdit(model: CapModelDTO) {
    setEditing(model);
    setForm({
      manufacturerId: model.manufacturerId,
      brand: model.brand,
      name: model.name,
      slug: model.slug,
      rarity: model.rarity,
      flavor: model.flavor ?? "",
      strength: model.strength ?? "",
      description: model.description ?? "",
      aliases: model.aliases.filter((alias) => alias !== `${model.brand} ${model.name}`).join(", "),
      keywords: model.keywords.join(", "),
      releaseYear: model.releaseYear ? String(model.releaseYear) : "",
      isLimited: model.isLimited,
      isActive: model.isActive,
    });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    if (saving) return;
    if (!form.manufacturerId) {
      setFormError("Выберите производителя.");
      return;
    }
    if (!form.brand.trim() || !form.name.trim()) {
      setFormError("Заполните бренд и название модели.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      manufacturerId: form.manufacturerId,
      brand: form.brand.trim(),
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      rarity: form.rarity,
      flavor: form.flavor.trim() || null,
      strength: form.strength.trim() || null,
      description: form.description.trim() || null,
      aliases: parseList(form.aliases),
      keywords: parseList(form.keywords),
      releaseYear: form.releaseYear.trim() ? Number(form.releaseYear) : null,
      isLimited: form.isLimited,
      isActive: form.isActive,
    };
    try {
      if (Number.isNaN(payload.releaseYear)) {
        setFormError("Год должен быть числом.");
        setSaving(false);
        return;
      }
      if (editing) {
        const data = await apiFetch<{ model: CapModelDTO }>(`/api/admin/models/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setModels((current) =>
          current.map((entry) => (entry.id === editing.id ? data.model : entry)),
        );
        toast.success("Модель обновлена", "Крышки и достижения пересчитаны.");
      } else {
        const data = await apiFetch<{ model: CapModelDTO }>("/api/admin/models", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setModels((current) => [...current, data.model]);
        toast.success("Модель добавлена в каталог");
      }
      setOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Не удалось сохранить модель.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(model: CapModelDTO) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Удалить модель «${model.brand} ${model.name}»? Если она используется в коллекциях, будет переведена в архив.`,
    );
    if (!confirmed) return;
    setDeletingId(model.id);
    try {
      const data = await apiFetch<{
        deleted?: boolean;
        deactivated?: boolean;
        model?: CapModelDTO;
        message?: string;
      }>(`/api/admin/models/${model.id}`, { method: "DELETE" });
      if (data.deleted) {
        setModels((current) => current.filter((entry) => entry.id !== model.id));
        toast.success("Модель удалена");
      } else if (data.model) {
        setModels((current) =>
          current.map((entry) => (entry.id === model.id ? data.model! : entry)),
        );
        toast.info("Модель в архиве", data.message);
      }
    } catch (caught) {
      toast.error("Не удалось удалить", caught instanceof Error ? caught.message : undefined);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Бренд, модель, производитель, алиас"
          className="min-w-[220px] flex-1 sm:max-w-[320px]"
        />
        <select
          value={manufacturerFilter}
          onChange={(event) => setManufacturerFilter(event.target.value)}
          className="select !h-10 !w-auto min-w-[150px] text-[12px]"
          aria-label="Фильтр по производителю"
        >
          <option value="ALL">Все производители</option>
          {manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
              {manufacturer.isActive ? "" : " (архив)"}
            </option>
          ))}
        </select>
        <select
          value={rarityFilter}
          onChange={(event) => setRarityFilter(event.target.value as "ALL" | Rarity)}
          className="select !h-10 !w-auto min-w-[140px] text-[12px]"
          aria-label="Фильтр по редкости"
        >
          <option value="ALL">Все редкости</option>
          {RARITY_ORDER.map((rarity) => (
            <option key={rarity} value={rarity}>
              {RARITY_META[rarity].labelEn}
            </option>
          ))}
        </select>
        <span className="text-[9px] text-[var(--muted)]">{filtered.length} моделей</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={13} />
            Модель
          </button>
        </div>
      </div>

      {error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : loading && models.length === 0 ? (
        <AdminLoading label="Загружаем модели каталога…" />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Модель</th>
                  <th>Производитель</th>
                  <th>Редкость</th>
                  <th>Вкус / крепость</th>
                  <th>Флаги</th>
                  <th>Крышек</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[11px] text-[var(--muted)]">
                      {models.length === 0 ? "В каталоге пока нет моделей." : "Ничего не найдено."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((model) => (
                    <tr key={model.id}>
                      <td>
                        <div className="min-w-[180px]">
                          <p className="text-[11px] font-semibold">
                            {model.brand} · {model.name}
                          </p>
                          <p className="font-mono text-[8.5px] text-[var(--muted)]">/{model.slug}</p>
                          {model.aliases.length > 0 ? (
                            <p className="mt-0.5 max-w-[220px] truncate text-[8px] text-[var(--muted)]">
                              {model.aliases.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="whitespace-nowrap text-[10.5px]">{model.manufacturerName}</span>
                      </td>
                      <td>
                        <RarityBadge rarity={model.rarity} />
                      </td>
                      <td>
                        <p className="text-[10px]">{model.flavor ?? "—"}</p>
                        <p className="text-[8.5px] text-[var(--muted)]">{model.strength ?? "—"}</p>
                      </td>
                      <td>
                        <div className="flex max-w-[150px] flex-wrap gap-1">
                          {!model.isActive ? (
                            <AdminBadge tone="warn">
                              <Archive size={9} />
                              архив
                            </AdminBadge>
                          ) : null}
                          {model.isLimited ? (
                            <AdminBadge tone="accent">
                              <Crown size={9} />
                              limited
                            </AdminBadge>
                          ) : null}
                          {model.releaseYear ? <AdminBadge>{model.releaseYear}</AdminBadge> : null}
                        </div>
                      </td>
                      <td className="tabular-nums">{model.itemCount ?? 0}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(model)}
                            className="icon-btn !size-7 !border-transparent !bg-transparent"
                            aria-label="Редактировать"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(model)}
                            disabled={deletingId === model.id}
                            className="icon-btn !size-7 !border-transparent !bg-transparent text-[#a63c36]"
                            aria-label="Удалить"
                          >
                            {deletingId === model.id ? (
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

      <p className="mt-3 text-[9px] leading-4 text-[var(--muted)]">
        Редкость модели — единственный источник истины для крышек. Изменение редкости, бренда или
        производителя автоматически синхронизирует существующие коллекции и пересчитывает достижения.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редактировать модель" : "Новая модель каталога"}
        description="Модель используется OCR-распознаванием и определяет редкость крышки."
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
            <AdminField label="Производитель">
              <select
                value={form.manufacturerId}
                onChange={(event) => setForm((current) => ({ ...current, manufacturerId: event.target.value }))}
                className="select"
              >
                <option value="">Выберите производителя</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.name}
                    {manufacturer.isActive ? "" : " (архив)"}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Редкость" hint="Определяет бейдж, прогресс и достижения коллекционеров.">
              <select
                value={form.rarity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, rarity: event.target.value as Rarity }))
                }
                className="select"
              >
                {RARITY_ORDER.map((rarity) => (
                  <option key={rarity} value={rarity}>
                    {RARITY_META[rarity].labelEn} — {RARITY_META[rarity].label}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Бренд">
              <input
                value={form.brand}
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                className="input"
                maxLength={60}
                placeholder="Siberia"
              />
            </AdminField>
            <AdminField label="Название">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input"
                maxLength={80}
                placeholder="−80°C Red"
              />
            </AdminField>
            <AdminField label="Slug" hint="Пусто — сгенерируется из бренда и названия.">
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="input font-mono !text-[12px]"
                maxLength={80}
                placeholder="siberia-red-80"
              />
            </AdminField>
            <AdminField label="Год выпуска">
              <input
                value={form.releaseYear}
                onChange={(event) =>
                  setForm((current) => ({ ...current, releaseYear: event.target.value.replace(/\D/g, "") }))
                }
                className="input"
                inputMode="numeric"
                maxLength={4}
                placeholder="2024"
              />
            </AdminField>
            <AdminField label="Вкус">
              <input
                value={form.flavor}
                onChange={(event) => setForm((current) => ({ ...current, flavor: event.target.value }))}
                className="input"
                maxLength={80}
                placeholder="Красные ягоды"
              />
            </AdminField>
            <AdminField label="Крепость">
              <input
                value={form.strength}
                onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))}
                className="input"
                maxLength={80}
                placeholder="43 мг/г"
              />
            </AdminField>
          </div>

          <AdminField label="Описание">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="textarea"
              rows={2}
              maxLength={2000}
            />
          </AdminField>

          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Алиасы" hint="Через запятую. Альтернативные названия на крышке.">
              <textarea
                value={form.aliases}
                onChange={(event) => setForm((current) => ({ ...current, aliases: event.target.value }))}
                className="textarea font-mono !text-[11px]"
                rows={2}
              />
            </AdminField>
            <AdminField label="Ключевые слова" hint="Через запятую. Помогают OCR-сопоставлению.">
              <textarea
                value={form.keywords}
                onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                className="textarea font-mono !text-[11px]"
                rows={2}
              />
            </AdminField>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
            <label className="flex items-center gap-2 text-[10.5px]">
              <input
                type="checkbox"
                checked={form.isLimited}
                onChange={(event) => setForm((current) => ({ ...current, isLimited: event.target.checked }))}
                className="size-4 accent-[var(--accent)]"
              />
              Лимитированный выпуск
            </label>
            <label className="flex items-center gap-2 text-[10.5px]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                className="size-4 accent-[var(--accent)]"
              />
              Активна в каталоге
            </label>
          </div>

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
