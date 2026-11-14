"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Portal монтируется только на клиенте — иначе hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`surface animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none sm:rounded-b-[var(--radius)] ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
        style={{ boxShadow: "0 40px 120px -30px rgba(0,0,0,0.55)" }}
      >
        <header className="flex items-start gap-4 border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[20px] font-[650] tracking-[-0.03em]">{title}</h2>
            {description ? (
              <p className="mt-1 text-[12.5px] leading-5 text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="icon-btn !size-9 !border-transparent !bg-[var(--surface-2)]"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
