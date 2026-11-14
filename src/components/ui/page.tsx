import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <h1 className="display-title text-[clamp(32px,5vw,52px)]">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--muted)] sm:text-[15px]">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[20px] font-[640] tracking-[-0.035em] sm:text-[22px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-5 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] text-center ${
        compact ? "px-5 py-9" : "px-6 py-16"
      }`}
    >
      {icon ? (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-[17px] font-[620] tracking-[-0.02em]">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-[12.5px] leading-5 text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
