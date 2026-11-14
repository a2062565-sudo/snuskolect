"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { ApiClientError, apiFetch } from "@/lib/client";
import { useToast } from "@/components/providers/toast-provider";
import { roleLabel } from "@/lib/dto";
import type { Role } from "@/lib/types";

interface UpgradeResponse {
  ok: boolean;
  role: Role;
  already: boolean;
}

export function SupportUpgrade({ role }: { role: Role }) {
  const router = useRouter();
  const toast = useToast();
  const [key, setKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = role === "SUPPORT" || role === "ADMIN";

  async function submit() {
    if (!key.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = await apiFetch<UpgradeResponse>("/api/support/upgrade", {
        method: "POST",
        body: JSON.stringify({ key: key.trim() }),
      });
      setKey("");
      toast.success(
        result.already ? "Доступ уже активен" : "Роль Support активирована",
        result.already
          ? "Ваша учётная запись уже имеет доступ к обращениям."
          : "Теперь вам доступна консоль поддержки пользователей.",
      );
      router.refresh();
    } catch (caught) {
      const apiError = caught instanceof ApiClientError ? caught : null;
      const payload = apiError?.data as
        | { attemptsLeft?: number; lockedUntil?: string }
        | null;
      if (typeof payload?.attemptsLeft === "number") {
        setAttemptsLeft(payload.attemptsLeft);
      }
      setError(apiError?.message ?? "Не удалось проверить ключ. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  if (active) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[var(--accent-soft)] p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-ink)]">
          <ShieldCheck size={18} />
        </span>
        <div>
          <p className="text-[12.5px] font-semibold">Доступ поддержки активен</p>
          <p className="mt-1 text-[10.5px] leading-5 text-[var(--muted)]">
            Роль {roleLabel(role)} открывает консоль обращений, ответы пользователям и управление
            статусами тикетов. Ключ повторно вводить не нужно.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-3"
    >
      <label className="label" htmlFor="support-key">
        Ключ поддержки
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <KeyRound
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            id="support-key"
            type={revealed ? "text" : "password"}
            value={key}
            onChange={(event) => {
              setKey(event.target.value);
              setError(null);
              setAttemptsLeft(null);
            }}
            autoComplete="off"
            spellCheck={false}
            maxLength={240}
            placeholder="Введите секретный ключ команды"
            className="input !pl-10 !pr-11"
            aria-describedby="support-key-hint"
          />
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Скрыть ключ" : "Показать ключ"}
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button type="submit" disabled={saving || !key.trim()} className="btn btn-primary shrink-0">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          Активировать
        </button>
      </div>

      <p id="support-key-hint" className="text-[10.5px] leading-5 text-[var(--muted)]">
        Ключ проверяется на сервере и хранится только в виде хеша. После пяти неверных попыток
        ввод временно блокируется. Не передавайте ключ третьим лицам.
      </p>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(176,58,52,0.24)] bg-[rgba(176,58,52,0.08)] px-3 py-2.5 text-[11px] leading-5 text-[#a63c36]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {error}
            {attemptsLeft !== null ? ` Осталось попыток: ${attemptsLeft}.` : ""}
          </span>
        </div>
      ) : null}

      {attemptsLeft === 0 && !error ? (
        <p className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
          <CheckCircle2 size={12} />
          Попытки исчерпаны. Повторите позже.
        </p>
      ) : null}
    </form>
  );
}
