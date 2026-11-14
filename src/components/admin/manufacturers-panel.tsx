"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Factory,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { ManufacturerDTO } from "@/lib/types";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import {
  AdminBadge,
  AdminError,
  AdminField,
  AdminLoading,
  AdminSearch,
} from "./shared";

interface ManufacturerForm {
  name: string;
  slug: string;
  country: string;
  description: string;
  accent: string;
  aliases: string;
  isActive: boolean;
}

const EMPTY: ManufacturerForm = {
  name: "",
  slug: "",
  country: "",
  description: "",
  accent: "#77776f",
  aliases: "",
  isActive: true,
};

function parseList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ManufacturersPanel() {
  const toast = useToast();
  const [manufacturers, setManufacturers] = useState<ManufacturerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManufacturerDTO | null>(null);
  const [form, setForm] = useState<ManufacturerForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ manufacturers: ManufacturerDTO[] }>("/api/admin/manufacturers");
      setManufacturers(data.manufacturers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить производителей.");
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
    if (!needle) return manufacturers;
    return manufacturers.filter(
      (manufacturer) =>
        manufacturer.name.toLowerCase().includes(needle) ||
        manufacturer.slug.toLowerCase().includes(needle) ||
        (manufacturer.country ?? "").toLowerCase().includes(needle) ||
        manufacturer.aliases.some((alias) => alias.toLowerCase().includes(needle)),
    );
  }, [manufacturers, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(manufacturer: ManufacturerDTO) {
    setEditing(manufacturer);
    setForm({
      name: manufacturer.name,
      slug: manufacturer.slug,
      country: manufacturer.country ?? "",
      description: manufacturer.description ?? "",
      accent: manufacturer.accent,
      aliases: manufacturer.aliases.filter((alias) => alias !== manufacturer.name).join(", "),
      isActive: manufacturer.isActive,
    });
    setFormError(null);
    setOpen(true);
  }

  async function save() {
    if (saving) return;
    if (form.name.trim().length < 2) {
      setFormError("Введите название производителя.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      country: form.country.trim() || null,
      description: form.description.trim() || null,
      accent: form.accent,
      aliases: parseList(form.aliases),
      isActive: form.isActive,
    };
    try {
      if (editing) {
        const data = await apiFetch<{ manufacturer: ManufacturerDTO }>(
          `/api/admin/manufacturers/${editing.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setManufacturers((current) =>
          current.map((entry) => (entry.id === editing.id ? data.manufacturer : entry)),
        );
        toast.success("Производитель обновлён");
      } else {
        const data = await apiFetch<{ manufacturer: ManufacturerDTO }>("/api/admin/manufacturers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setManufacturers((current) => [...current, data.manufacturer].sort((a, b) => a.name.localeCompare(b.name, "ru")));
        toast.success("Производитель создан");
      }
      setOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Не удалось сохранить производителя.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(manufacturer: ManufacturerDTO) {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Удалить производителя «${manufacturer.name}»? Если он используется, запись будет переведена в архив.`,
    );
    if (!confirmed) return;
    setDeletingId(manufacturer.id);
    try {
      const data = await apiFetch<{
        deleted?: boolean;
        deactivated?: boolean;
        manufacturer?: ManufacturerDTO;
        message?: string;
      }>(`/api/admin/manufacturers/${manufacturer.id}`, { method: "DELETE" });
      if (data.deleted) {
        setManufacturers((current) => current.filter((entry) => entry.id !== manufacturer.id));
        toast.success("Производитель удалён");
      } else if (data.manufacturer) {
        setManufacturers((current) =>
          current.map((entry) => (entry.id === manufacturer.id ? data.manufacturer! : entry)),
        );
        toast.info("Производитель в архиве", data.message);
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
          placeholder="Название, slug, страна или алиас"
          className="min-w-[220px] flex-1 sm:max-w-[340px]"
        />
        <span className="text-[9px] text-[var(--muted)]">
          {manufacturers.length} производителей · {manufacturers.filter((entry) => entry.isActive).length} активных
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Обновить
          </button>
          <button type="button" onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={13} />
            Производитель
          </button>
        </div>
      </div>

      {error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : loading && manufacturers.length === 0 ? (
        <AdminLoading label="Загружаем производителей…" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] px-6 py-12 text-center text-[11px] text-[var(--muted)]">
          {manufacturers.length === 0 ? "Производителей пока нет." : "Ничего не найдено."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((manufacturer) => (
            <div key={manufacturer.id} className="surface card-hover overflow-hidden">
              <div
                className="h-1.5 w-full"
                style={{ background: manufacturer.accent }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl text-[12px] font-bold"
                      style={{
                        background: `color-mix(in srgb, ${manufacturer.accent} 14%, transparent)`,
                        color: manufacturer.accent,
                      }}
                    >
                      {manufacturer.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{manufacturer.name}</p>
                      <p className="truncate font-mono text-[8.5px] text-[var(--muted)]">
                        /{manufacturer.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(manufacturer)}
                      className="icon-btn !size-7 !border-transparent !bg-transparent"
                      aria-label={`Редактировать ${manufacturer.name}`}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(manufacturer)}
                      disabled={deletingId === manufacturer.id}
                      className="icon-btn !size-7 !border-transparent !bg-transparent text-[#a63c36]"
                      aria-label={`Удалить ${manufacturer.name}`}
                    >
                      {deletingId === manufacturer.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {!manufacturer.isActive ? (
                    <AdminBadge tone="warn">
                      <Archive size={9} />
                      архив
                    </AdminBadge>
                  ) : (
                    <AdminBadge tone="accent">active</AdminBadge>
                  )}
                  {manufacturer.country ? <AdminBadge>{manufacturer.country}</AdminBadge> : null}
                  <AdminBadge>
                    <Factory size={9} />
                    {manufacturer.modelCount ?? 0} моделей
                  </AdminBadge>
                  <AdminBadge>{manufacturer.itemCount ?? 0} крышек</AdminBadge>
                </div>

                <p className="mt-2.5 line-clamp-2 min-h-[32px] text-[9.5px] leading-4 text-[var(--muted)]">
                  {manufacturer.description || "Описание пока не добавлено."}
                </p>

                {manufacturer.aliases.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {manufacturer.aliases.slice(0, 4).map((alias) => (
                      <span
                        key={alias}
                        className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[8px] text-[var(--muted)]"
                      >
                        {alias}
                      </span>
                    ))}
                    {manufacturer.aliases.length > 4 ? (
                      <span className="text-[8px] text-[var(--muted)]">+{manufacturer.aliases.length - 4}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Редактировать производителя" : "Новый производитель"}
        description="Производитель связывает модели крышек и учитывается в достижении «Brand Explorer»."
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
            <AdminField label="Название">
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input"
                maxLength={80}
                placeholder="Например: Swedish Match"
              />
            </AdminField>
            <AdminField label="Slug" hint="Латиница, цифры и дефис. Пусто — сгенерируется автоматически.">
              <input
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="input font-mono !text-[12px]"
                maxLength={80}
                placeholder="swedish-match"
              />
            </AdminField>
            <AdminField label="Страна">
              <input
                value={form.country}
                onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                className="input"
                maxLength={80}
                placeholder="Швеция"
              />
            </AdminField>
            <AdminField label="Акцентный цвет">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent}
                  onChange={(event) => setForm((current) => ({ ...current, accent: event.target.value }))}
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1"
                  aria-label="Акцентный цвет"
                />
                <input
                  value={form.accent}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                      setForm((current) => ({ ...current, accent: value }));
                    }
                  }}
                  className="input font-mono !text-[12px]"
                  maxLength={7}
                />
              </div>
            </AdminField>
          </div>

          <AdminField label="Описание">
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="textarea"
              rows={3}
              maxLength={1200}
            />
          </AdminField>

          <AdminField label="Алиасы для OCR" hint="Через запятую: альтернативные написания, которые OCR может встретить на крышке.">
            <textarea
              value={form.aliases}
              onChange={(event) => setForm((current) => ({ ...current, aliases: event.target.value }))}
              className="textarea font-mono !text-[11px]"
              rows={2}
              placeholder="SM, Swedish Match, СВЕДИШ МАТЧ"
            />
          </AdminField>

          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="size-4 accent-[var(--accent)]"
            />
            Активен в каталоге и распознавании
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
