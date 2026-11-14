"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  Loader2,
  Pencil,
  RefreshCw,
  ScanText,
  Trash2,
} from "lucide-react";
import type {
  AdminItemDTO,
  CapModelDTO,
  ManufacturerDTO,
  Rarity,
} from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { formatDate, relativeTime } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import { RarityBadge } from "@/components/ui/rarity";
import {
  AdminBadge,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSectionHeading,
  AdminSearch,
} from "./shared";

interface ItemForm {
  capModelId: string;
  manufacturerId: string;
  brandName: string;
  productName: string;
  flavor: string;
  strength: string;
  description: string;
  recognizedText: string;
}

const EMPTY_FORM: ItemForm = {
  capModelId: "",
  manufacturerId: "",
  brandName: "",
  productName: "",
  flavor: "",
  strength: "",
  description: "",
  recognizedText: "",
};

export function ItemsSection({ mode = "items" }: { mode?: "items" | "ocr" }) {
  const toast = useToast();
  const [items, setItems] = useState<AdminItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rarity, setRarity] = useState<"ALL" | Rarity>(mode === "ocr" ? "UNDETERMINED" : "ALL");
  const [demo, setDemo] = useState<"all" | "real" | "demo">("all");
  const [manufacturers, setManufacturers] = useState<ManufacturerDTO[]>([]);
  const [models, setModels] = useState<CapModelDTO[]>([]);
  const [editing, setEditing] = useState<AdminItemDTO | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (rarity !== "ALL") params.set("rarity", rarity);
    if (demo !== "all") params.set("demo", demo === "demo" ? "true" : "false");
    try {
      const data = await apiFetch<{ items: AdminItemDTO[] }>(
        `/api/admin/items${params.size ? `?${params.toString()}` : ""}`,
      );
      setItems(data.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить коллекции.");
    } finally {
      setLoading(false);
    }
  }, [search, rarity, demo]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 260);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ manufacturers: ManufacturerDTO[] }>("/api/admin/manufacturers"),
      apiFetch<{ models: CapModelDTO[] }>("/api/admin/models"),
    ])
      .then(([manufacturerData, modelData]) => {
        if (!active) return;
        setManufacturers(manufacturerData.manufacturers);
        setModels(modelData.models);
      })
      .catch(() => {
        if (active) toast.error("Каталог не загрузился", "Редактирование модели будет недоступно.");
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const modelOptions = useMemo(() => {
    const manufacturerFilter = form.manufacturerId;
    const filtered = manufacturerFilter
      ? models.filter((model) => model.manufacturerId === manufacturerFilter)
      : models;
    return filtered.slice().sort((a, b) =>
      `${a.manufacturerName} ${a.brand} ${a.name}`.localeCompare(
        `${b.manufacturerName} ${b.brand} ${b.name}`,
        "ru",
      ),
    );
  }, [models, form.manufacturerId]);

  function openEditor(item: AdminItemDTO) {
    setEditing(item);
    setFormError(null);
    setForm({
      capModelId: item.capModelId ?? "",
      manufacturerId: item.manufacturerId ?? "",
      brandName: item.brandName ?? "",
      productName: item.productName ?? "",
      flavor: item.flavor ?? "",
      strength: item.strength ?? "",
      description: item.description ?? "",
      recognizedText: item.recognizedText ?? "",
    });
  }

  function chooseModel(modelId: string) {
    const model = models.find((entry) => entry.id === modelId);
    if (!model) {
      setForm((current) => ({ ...current, capModelId: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      capModelId: model.id,
      manufacturerId: model.manufacturerId,
      brandName: model.brand,
      productName: model.name,
      flavor: model.flavor ?? "",
      strength: model.strength ?? "",
    }));
  }

  async function save() {
    if (!editing || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const data = await apiFetch<{
        item: AdminItemDTO;
        user: AdminItemDTO["user"];
        newAchievements: unknown[];
      }>(`/api/admin/items/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          capModelId: form.capModelId || null,
          manufacturerId: form.manufacturerId || null,
          brandName: form.brandName.trim() || null,
          productName: form.productName.trim() || null,
          flavor: form.flavor.trim() || null,
          strength: form.strength.trim() || null,
          description: form.description.trim() || null,
          recognizedText: form.recognizedText.trim() || null,
        }),
      });
      setItems((current) =>
        current.map((item) =>
          item.id === editing.id
            ? { ...data.item, user: data.user }
            : item,
        ),
      );
      toast.success(
        "Карточка обновлена",
        data.newAchievements.length > 0
          ? `Открыто новых достижений: ${data.newAchievements.length}.`
          : "Редкость пересчитана по каталогу.",
      );
      setEditing(null);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Не удалось сохранить карточку.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AdminItemDTO) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Удалить крышку «${item.productName ?? item.brandName ?? item.id}» из коллекции ${item.user.displayName}? Действие необратимо.`,
    );
    if (!confirmed) return;
    setDeletingId(item.id);
    try {
      await apiFetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editing?.id === item.id) setEditing(null);
      toast.success("Крышка удалена");
    } catch (caught) {
      toast.error("Не удалось удалить", caught instanceof Error ? caught.message : undefined);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <AdminSectionHeading
        title={mode === "ocr" ? "Коррекция OCR" : "Коллекции и фотографии"}
        description={
          mode === "ocr"
            ? "Крышки без привязки к каталогу. Исправь модель или данные — редкость и достижения пересчитаются автоматически."
            : "Все загруженные крышки, владельцы, редкости и качество распознавания. Администратор может исправить данные."
        }
        action={
          <>
            {mode === "ocr" ? (
              <AdminBadge tone="warn">
                <ScanText size={10} />
                {items.length} без модели
              </AdminBadge>
            ) : null}
            <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-ghost btn-sm">
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
          placeholder="Бренд, модель, производитель, OCR"
          className="min-w-[220px] flex-1 sm:max-w-[340px]"
        />
        <select
          value={rarity}
          onChange={(event) => setRarity(event.target.value as "ALL" | Rarity)}
          className="select !h-10 !w-auto min-w-[150px] text-[12px]"
          aria-label="Фильтр по редкости"
        >
          <option value="ALL">Все редкости</option>
          {RARITY_ORDER.map((value) => (
            <option key={value} value={value}>
              {RARITY_META[value].labelEn}
            </option>
          ))}
        </select>
        <select
          value={demo}
          onChange={(event) => setDemo(event.target.value as "all" | "real" | "demo")}
          className="select !h-10 !w-auto min-w-[140px] text-[12px]"
          aria-label="Фильтр демо-коллекций"
        >
          <option value="all">Все коллекции</option>
          <option value="real">Только реальные</option>
          <option value="demo">Демо-коллекции</option>
        </select>
        <span className="ml-auto text-[9px] text-[var(--muted)]">{items.length} записей</span>
      </div>

      {error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : loading && items.length === 0 ? (
        <AdminLoading label="Загружаем коллекции…" />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Крышка</th>
                  <th>Владелец</th>
                  <th>Редкость</th>
                  <th>Модель каталога</th>
                  <th>OCR</th>
                  <th>Добавлена</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[11px] text-[var(--muted)]">
                      {mode === "ocr"
                        ? "Все крышки привязаны к каталогу — отличная работа."
                        : "Крышки не найдены."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.productName ?? "Крышка"}
                            className="size-9 shrink-0 rounded-lg border border-[var(--line)] object-cover"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-[11.5px] font-semibold">
                              {item.brandName ?? "Без бренда"}
                              {item.productName ? ` · ${item.productName}` : ""}
                            </p>
                            <p className="max-w-[220px] truncate text-[8.5px] text-[var(--muted)]">
                              {item.manufacturerName ?? "Производитель не указан"}
                              {item.flavor ? ` · ${item.flavor}` : ""}
                              {item.strength ? ` · ${item.strength}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="whitespace-nowrap text-[10.5px] font-medium">{item.user.displayName}</p>
                        <p className="text-[8.5px] text-[var(--muted)]">
                          {item.user.isDemo ? "demo" : "real"} · /u/{item.user.slug}
                        </p>
                      </td>
                      <td>
                        <RarityBadge rarity={item.rarity} />
                      </td>
                      <td>
                        {item.capModel ? (
                          <div>
                            <p className="text-[10px] font-medium">{item.capModel.brand}</p>
                            <p className="text-[8.5px] text-[var(--muted)]">{item.capModel.name}</p>
                          </div>
                        ) : (
                          <AdminBadge tone="warn">нет модели</AdminBadge>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[9.5px] font-semibold tabular-nums"
                            style={{
                              color:
                                (item.ocrConfidence ?? 0) >= 60
                                  ? "var(--accent)"
                                  : (item.ocrConfidence ?? 0) >= 30
                                    ? "#a8782b"
                                    : "#a63c36",
                            }}
                          >
                            {item.ocrConfidence !== null ? `${Math.round(item.ocrConfidence)}%` : "—"}
                          </span>
                          {item.recognizedText ? (
                            <span
                              className="max-w-[150px] truncate font-mono text-[8px] text-[var(--muted)]"
                              title={item.recognizedText}
                            >
                              {item.recognizedText.replace(/\s+/g, " ")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[9px] text-[var(--muted)]">
                        <p>{formatDate(item.createdAt)}</p>
                        <p>{relativeTime(item.createdAt)}</p>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditor(item)}
                            className="icon-btn !size-7 !border-transparent !bg-transparent"
                            aria-label="Редактировать"
                            title="Редактировать"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(item)}
                            disabled={deletingId === item.id}
                            className="icon-btn !size-7 !border-transparent !bg-transparent text-[#a63c36]"
                            aria-label="Удалить"
                            title="Удалить"
                          >
                            {deletingId === item.id ? (
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
        <Camera size={11} className="mt-0.5 shrink-0" />
        Показаны последние 200 записей. Редкость всегда определяется моделью каталога; при отсутствии
        модели — Undetermined. Удаление фото необратимо.
      </p>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Коррекция карточки"
        description={
          editing
            ? `${editing.user.displayName} · добавлено ${formatDate(editing.createdAt)}`
            : undefined
        }
        wide
        footer={
          <>
            {editing ? (
              <button
                type="button"
                onClick={() => void remove(editing)}
                disabled={deletingId === editing.id || saving}
                className="btn btn-danger btn-sm mr-auto"
              >
                {deletingId === editing.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Удалить
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-sm">
              Отмена
            </button>
            <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Сохранить
            </button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Производитель" hint="При выборе модели производитель берётся из каталога.">
                <select
                  value={form.manufacturerId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      manufacturerId: event.target.value,
                      capModelId: "",
                    }))
                  }
                  className="select"
                >
                  <option value="">Не указан</option>
                  {manufacturers.map((manufacturer) => (
                    <option key={manufacturer.id} value={manufacturer.id}>
                      {manufacturer.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Модель каталога" hint="Редкость и достижения пересчитываются автоматически.">
                <select value={form.capModelId} onChange={(event) => chooseModel(event.target.value)} className="select">
                  <option value="">Без модели (Undetermined)</option>
                  {modelOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.manufacturerName} · {model.brand} {model.name}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Бренд">
                <input
                  value={form.brandName}
                  onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
                  className="input"
                  maxLength={80}
                />
              </AdminField>
              <AdminField label="Название / вкус">
                <input
                  value={form.productName}
                  onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
                  className="input"
                  maxLength={120}
                />
              </AdminField>
              <AdminField label="Вкус">
                <input
                  value={form.flavor}
                  onChange={(event) => setForm((current) => ({ ...current, flavor: event.target.value }))}
                  className="input"
                  maxLength={80}
                />
              </AdminField>
              <AdminField label="Крепость">
                <input
                  value={form.strength}
                  onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))}
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
                rows={3}
                maxLength={4000}
              />
            </AdminField>

            <AdminField label="Распознанный текст (OCR)" hint="Исправьте текст, если OCR ошибся — он сохранится в карточке.">
              <textarea
                value={form.recognizedText}
                onChange={(event) => setForm((current) => ({ ...current, recognizedText: event.target.value }))}
                className="textarea font-mono !text-[11px]"
                rows={4}
                maxLength={4000}
              />
            </AdminField>

            <div className="grid gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-[9.5px] text-[var(--muted)] sm:grid-cols-3">
              <span>
                Текущая редкость:{" "}
                <span className="font-semibold" style={{ color: RARITY_META[editing.rarity].color }}>
                  {RARITY_META[editing.rarity].labelEn}
                </span>
              </span>
              <span>OCR: {editing.ocrConfidence !== null ? `${Math.round(editing.ocrConfidence)}%` : "—"}</span>
              <span>ID: <span className="font-mono">{editing.id.slice(-8)}</span></span>
            </div>

            {formError ? (
              <p className="rounded-xl border border-[rgba(176,58,52,0.24)] bg-[rgba(176,58,52,0.08)] px-3 py-2 text-[10.5px] text-[#a63c36]">
                {formError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
