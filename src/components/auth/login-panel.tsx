"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  ChevronRight,
  Loader2,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { apiFetch } from "@/lib/client";
import { KapsLogo, KapsMark } from "@/components/ui/logo";
import { RarityBadge } from "@/components/ui/rarity";
import { useToast } from "@/components/providers/toast-provider";

declare global {
  interface Window {
    __kapsTelegramAuth?: (user: Record<string, unknown>) => void;
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        colorScheme?: string;
      };
    };
  }
}

type Mode = "idle" | "loading" | "success";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Сканирование по фото",
    text: "Загрузи фото крышки — OCR прочитает бренд, вкус и крепость.",
  },
  {
    icon: Sparkles,
    title: "Редкость из каталога",
    text: "Common, Rare, Epic, Legendary и Mythic определяются сервером.",
  },
  {
    icon: Trophy,
    title: "Достижения и уровни",
    text: "Открывай коллекционные вехи и расти от Новичка до Мифа.",
  },
];

export function LoginPanel({
  botUsername,
  telegramConfigured,
  devLoginEnabled,
}: {
  botUsername: string;
  telegramConfigured: boolean;
  devLoginEnabled: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const widgetRef = useRef<HTMLDivElement>(null);
  const miniAppStarted = useRef(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState<"admin" | "collector" | null>(null);

  async function signIn(
    endpoint: string,
    payload: Record<string, unknown>,
    destination = "/",
  ) {
    setMode("loading");
    setError(null);
    try {
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMode("success");
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setMode("idle");
      const message =
        caught instanceof Error ? caught.message : "Не удалось войти через Telegram.";
      setError(message);
      toast.error("Вход не выполнен", message);
    }
  }

  useEffect(() => {
    if (!telegramConfigured || !botUsername || !widgetRef.current) return;
    const container = widgetRef.current;
    container.innerHTML = "";

    window.__kapsTelegramAuth = (user) => {
      void signIn("/api/auth/telegram", user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "__kapsTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      delete window.__kapsTelegramAuth;
      container.innerHTML = "";
    };
    // signIn is stable for the lifetime of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botUsername, telegramConfigured]);

  useEffect(() => {
    let cancelled = false;

    async function startMiniApp() {
      if (miniAppStarted.current) return;
      miniAppStarted.current = true;

      const existing = document.querySelector<HTMLScriptElement>(
        'script[src*="telegram-web-app.js"]',
      );
      if (!existing) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://telegram.org/js/telegram-web-app.js";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.head.appendChild(script);
        });
      }

      if (cancelled) return;
      const webApp = window.Telegram?.WebApp;
      if (!webApp) return;
      try {
        webApp.ready?.();
        webApp.expand?.();
      } catch {
        // ignore unsupported methods
      }

      const initData = webApp.initData?.trim();
      if (!initData) return;
      await signIn("/api/auth/telegram-miniapp", { initData }, "/");
    }

    void startMiniApp();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function devLogin(as: "admin" | "collector") {
    setDevLoading(as);
    setError(null);
    try {
      await apiFetch("/api/auth/dev", {
        method: "POST",
        body: JSON.stringify({ as }),
      });
      router.replace(as === "admin" ? "/admin" : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Локальный вход недоступен.");
      setDevLoading(null);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-[-20%] size-[520px] rounded-full opacity-[0.16] blur-[100px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="container-kaps relative grid min-h-dvh items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)] lg:gap-16 lg:py-14">
        <section className="animate-rise">
          <div className="flex items-center justify-between gap-4">
            <KapsLogo size={42} />
            <Link
              href="/u/demo"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Демо-коллекция
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="mt-10 max-w-[620px] sm:mt-14">
            <p className="eyebrow">Snus cap archive · 2026</p>
            <h1 className="display-title mt-4 text-[clamp(42px,7vw,76px)]">
              Твоя коллекция
              <br />
              крышек.{" "}
              <span className="shimmer-text">В одном месте.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[14px] leading-7 text-[var(--muted)] sm:text-[15px]">
              Сфотографируй крышку — KAPS распознает модель, определит редкость и сохранит
              находку в личный архив. Никаких ручных каталогов и потерянных экземпляров.
            </p>

            <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="animate-rise rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_72%,transparent)] p-3.5 backdrop-blur"
                    style={{ animationDelay: `${index * 90 + 120}ms` }}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon size={15} strokeWidth={1.9} />
                    </span>
                    <p className="mt-2.5 text-[11.5px] font-semibold">{feature.title}</p>
                    <p className="mt-1 text-[10px] leading-4.5 text-[var(--muted)]">{feature.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-9 hidden items-end gap-3 sm:flex">
            <ShowcaseCard
              src="/demo/siberia-red-80.jpg"
              name="Siberia −80°C Red"
              rarity="MYTHIC"
              className="w-[128px] rotate-[-4deg]"
            />
            <ShowcaseCard
              src="/demo/white-fox-full-charge.jpg"
              name="White Fox Full Charge"
              rarity="RARE"
              className="w-[148px] -translate-y-3"
            />
            <ShowcaseCard
              src="/demo/pablo-exclusive-ice-cold.jpg"
              name="Pablo Exclusive Ice Cold"
              rarity="RARE"
              className="w-[128px] rotate-[4deg]"
            />
            <div className="mb-2 ml-2 hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-[9.5px] font-semibold text-[var(--muted)] md:inline-flex">
              <Camera size={11} />
              14 крышек в демо-архиве
            </div>
          </div>
        </section>

        <section className="animate-rise mx-auto w-full max-w-[440px] lg:mx-0" style={{ animationDelay: "120ms" }}>
          <div className="surface noise-panel overflow-hidden p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <KapsMark size={40} />
              <div>
                <p className="font-display text-[21px] font-[650] tracking-[-0.04em]">
                  Вход в KAPS
                </p>
                <p className="text-[10.5px] text-[var(--muted)]">
                  Telegram · один аккаунт для сайта и бота
                </p>
              </div>
            </div>

            <div className="mt-6">
              {telegramConfigured ? (
                <>
                  <p className="mb-3 text-[11px] leading-5 text-[var(--muted)]">
                    Нажми кнопку ниже и подтверди вход в Telegram. Мы получим только имя,
                    username и аватар.
                  </p>
                  <div
                    ref={widgetRef}
                    className="flex min-h-[52px] items-center justify-center overflow-hidden rounded-xl [&_iframe]:!rounded-xl"
                  />
                  {mode !== "idle" ? (
                    <div
                      className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-medium ${
                        mode === "success"
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                    >
                      {mode === "success" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <Loader2 size={14} className="animate-spin" />
                      )}
                      {mode === "success" ? "Готово, открываем архив…" : "Проверяем подпись Telegram…"}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <div className="flex items-start gap-2.5">
                    <Bot size={16} className="mt-0.5 shrink-0 text-[var(--muted)]" />
                    <div>
                      <p className="text-[11.5px] font-semibold">Telegram-вход ещё не настроен</p>
                      <p className="mt-1 text-[10.5px] leading-5 text-[var(--muted)]">
                        Добавьте <code className="rounded bg-[var(--card)] px-1">TELEGRAM_BOT_TOKEN</code> и{" "}
                        <code className="rounded bg-[var(--card)] px-1">NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>{" "}
                        в окружение сервера. Для локальной проверки включите dev-вход.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[rgba(176,58,52,0.24)] bg-[rgba(176,58,52,0.08)] px-3 py-2.5 text-[10.5px] leading-5 text-[#a63c36]">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--line)]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Mini App
              </span>
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>

            <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[var(--muted)]">
              <LockKeyhole size={13} className="mt-0.5 shrink-0" />
              Если страница открыта внутри Telegram, вход выполнится автоматически через
              подписанные initData. Токен бота никогда не попадает в браузер.
            </p>

            {devLoginEnabled ? (
              <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-[var(--muted)]" />
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                    Локальная разработка
                  </p>
                </div>
                <p className="mt-1.5 text-[9.5px] leading-4 text-[var(--muted)]">
                  Dev-вход выключен в production и создаёт отдельные демо-аккаунты.
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void devLogin("collector")}
                    disabled={devLoading !== null}
                    className="btn btn-ghost btn-sm"
                  >
                    {devLoading === "collector" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : null}
                    Коллекционер
                  </button>
                  <button
                    type="button"
                    onClick={() => void devLogin("admin")}
                    disabled={devLoading !== null}
                    className="btn btn-soft btn-sm"
                  >
                    {devLoading === "admin" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : null}
                    Админ
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
              <p className="max-w-[230px] text-[9.5px] leading-4 text-[var(--muted)]">
                Продолжая, ты принимаешь правила архива и обработку данных Telegram.
              </p>
              <Link
                href="/u/demo"
                className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Смотреть демо
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <p className="mt-4 text-center text-[9.5px] text-[var(--muted)]">
            KAPS · личный архив крышек от снюса
          </p>
        </section>
      </div>
    </main>
  );
}

function ShowcaseCard({
  src,
  name,
  rarity,
  className,
}: {
  src: string;
  name: string;
  rarity: "RARE" | "MYTHIC";
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-xl ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} className="aspect-square w-full rounded-xl object-cover" />
      <div className="px-1 pb-1 pt-2">
        <p className="line-clamp-1 text-[9.5px] font-semibold">{name}</p>
        <div className="mt-1.5">
          <RarityBadge rarity={rarity} />
        </div>
      </div>
    </div>
  );
}
