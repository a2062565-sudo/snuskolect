"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Palette, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/client";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  getThemePresetName,
  normalizeTheme,
} from "@/lib/themes";
import type { CustomThemeValues, ThemePreset, ThemeSettings } from "@/lib/types";

export function ThemeEditor({ initialTheme }: { initialTheme: ThemeSettings }) {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState<ThemeSettings>(initialTheme);
  const savedRef = useRef<ThemeSettings>(initialTheme);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    return () => {
      setTheme(savedRef.current);
    };
  }, [setTheme]);

  const dirty = JSON.stringify(theme) !== JSON.stringify(saved);

  async function persist(next: ThemeSettings) {
    setSaving(true);
    try {
      const data = await apiFetch<{ theme: ThemeSettings }>("/api/profile/theme", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      const normalized = normalizeTheme(data.theme);
      setSaved(normalized);
      savedRef.current = normalized;
      setTheme(normalized);
      toast.success("Тема сохранена", "Настройки синхронизированы с профилем.");
      router.refresh();
    } catch (error) {
      toast.error("Не удалось сохранить тему", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  function choosePreset(preset: Exclude<ThemePreset, "custom">) {
    setTheme({ ...theme, preset });
  }

  function updateCustom(key: keyof CustomThemeValues, value: string | number) {
    setTheme({
      preset: "custom",
      custom: { ...theme.custom, [key]: value },
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-[var(--muted)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
            Готовая тема
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEME_PRESETS.map((preset) => {
            const active = theme.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => choosePreset(preset.id)}
                className="relative overflow-hidden rounded-2xl border p-2.5 text-left transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: active ? "var(--accent)" : "var(--line)",
                  background: "var(--card)",
                  boxShadow: active ? "0 0 0 3px var(--accent-soft)" : undefined,
                }}
                aria-pressed={active}
              >
                <div className="flex gap-1">
                  {preset.colors.map((color) => (
                    <span
                      key={color}
                      className="h-8 flex-1 rounded-lg border border-black/5"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="text-[11.5px] font-semibold">{preset.name}</span>
                  {active ? (
                    <span className="grid size-4 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[9px] text-[var(--muted)]">{preset.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[var(--muted)]" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
              Своя тема
            </p>
          </div>
          <span className="text-[9.5px] text-[var(--muted)]">
            Активна: {getThemePresetName(theme.preset)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ColorField
            label="Основной текст"
            value={theme.custom.primary}
            onChange={(value) => updateCustom("primary", value)}
          />
          <ColorField
            label="Акцент"
            value={theme.custom.accent}
            onChange={(value) => updateCustom("accent", value)}
          />
          <ColorField
            label="Фон"
            value={theme.custom.background}
            onChange={(value) => updateCustom("background", value)}
          />
          <ColorField
            label="Карточки"
            value={theme.custom.card}
            onChange={(value) => updateCustom("card", value)}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-[var(--muted)]">Скругление углов</span>
            <span className="tabular-nums text-[var(--muted)]">{theme.custom.radius}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={36}
            step={1}
            value={theme.custom.radius}
            onChange={(event) => updateCustom("radius", Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-2)] accent-[var(--accent)]"
            aria-label="Скругление углов"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-2)] p-3">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-8 place-items-center rounded-lg"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              <Palette size={14} />
            </span>
            <div>
              <p className="text-[11px] font-semibold">Живой предпросмотр</p>
              <p className="text-[9.5px] text-[var(--muted)]">Интерфейс обновляется сразу</p>
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">preview</span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTheme(DEFAULT_THEME);
              void persist(DEFAULT_THEME);
            }}
            disabled={saving}
            className="btn btn-ghost btn-sm"
          >
            <RotateCcw size={13} />
            Сбросить
          </button>
          {dirty ? (
            <button
              type="button"
              onClick={() => setTheme(saved)}
              disabled={saving}
              className="text-[10.5px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Отменить изменения
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)]">
            {dirty ? "Есть несохранённые изменения" : "Сохранено в профиле"}
          </span>
          <button
            type="button"
            onClick={() => void persist(theme)}
            disabled={saving || !dirty}
            className="btn btn-primary btn-sm"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Сохранить тему
          </button>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
          aria-label={`${label}: выбрать цвет`}
        />
        <input
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(next)) onChange(next);
          }}
          maxLength={7}
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] uppercase tracking-[0.04em] outline-none"
          aria-label={`${label}: HEX-код`}
        />
      </div>
    </div>
  );
}
