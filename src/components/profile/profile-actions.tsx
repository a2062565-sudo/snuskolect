"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, Globe2, Loader2 } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/client";
import type { PublicUserDTO } from "@/lib/types";

export function ProfilePrivacy({
  initialPublic,
  slug,
}: {
  initialPublic: boolean;
  slug: string;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function toggle() {
    const next = !isPublic;
    setSaving(true);
    try {
      await apiFetch<{ user: PublicUserDTO }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ isPublic: next }),
      });
      setIsPublic(next);
      toast.success(
        next ? "Профиль открыт" : "Профиль скрыт",
        next ? "Другие коллекционеры смогут видеть твою коллекцию." : "Коллекция доступна только тебе и команде KAPS.",
      );
      router.refresh();
    } catch {
      toast.error("Не удалось изменить приватность", "Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`);
      setCopied(true);
      toast.success("Ссылка скопирована");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Не удалось скопировать ссылку", `Адрес: /u/${slug}`);
    }
  }

  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            {isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
          </span>
          <div>
            <p className="text-[12px] font-semibold">{isPublic ? "Публичный профиль" : "Приватный профиль"}</p>
            <p className="text-[10px] text-[var(--muted)]">
              {isPublic ? "Виден другим коллекционерам" : "Виден только тебе"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Публичность профиля"
          disabled={saving}
          onClick={() => void toggle()}
          className="relative h-6 w-11 shrink-0 rounded-full border transition-colors"
          style={{
            background: isPublic ? "var(--accent)" : "var(--surface-2)",
            borderColor: isPublic ? "var(--accent)" : "var(--line)",
          }}
        >
          <span
            className="absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-[left] duration-200"
            style={{ left: isPublic ? 22 : 2 }}
          />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-2">
          <Globe2 size={12} className="shrink-0 text-[var(--muted)]" />
          <span className="truncate text-[10.5px] text-[var(--muted)]">/u/{slug}</span>
        </div>
        <button type="button" onClick={() => void copy()} className="btn btn-ghost btn-sm shrink-0">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Готово" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

export function ProfileNameForm({
  initialName,
}: {
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function save() {
    if (name.trim().length < 2) {
      toast.error("Имя слишком короткое", "Минимум 2 символа.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch<{ user: PublicUserDTO }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ displayName: name.trim() }),
      });
      toast.success("Имя обновлено");
      router.refresh();
    } catch (error) {
      toast.error("Не удалось сохранить имя", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={48}
        className="input"
        aria-label="Отображаемое имя"
        placeholder="Как тебя показывать в KAPS"
      />
      <button type="submit" disabled={saving || name.trim() === initialName} className="btn btn-primary shrink-0">
        {saving ? <Loader2 size={15} className="animate-spin" /> : null}
        Сохранить
      </button>
    </form>
  );
}
