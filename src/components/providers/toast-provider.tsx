"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (title: string, options?: { description?: string; tone?: ToastTone }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: "var(--accent)",
  error: "#c0564f",
  info: "var(--muted)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastApi["toast"]>(
    (title, options) => {
      const id = ++counter.current;
      const tone = options?.tone ?? "info";
      setItems((current) => [
        ...current.slice(-3),
        { id, title, description: options?.description, tone },
      ]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6500 : 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast(title, { tone: "success", description }),
      error: (title, description) => toast(title, { tone: "error", description }),
      info: (title, description) => toast(title, { tone: "info", description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-3 top-3 z-[220] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2 sm:right-5 sm:top-5"
      >
        {items.map((item) => {
          const Icon = TONE_ICON[item.tone];
          return (
            <div
              key={item.id}
              className="glass animate-rise pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-lg"
              style={{ borderColor: `${TONE_COLOR[item.tone]}33` }}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className="mt-0.5 shrink-0"
                style={{ color: TONE_COLOR[item.tone] }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                onClick={() => dismiss(item.id)}
                className="-mr-1 -mt-1 grid size-7 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
