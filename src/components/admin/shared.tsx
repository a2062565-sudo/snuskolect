"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import type { AdminStatsDTO } from "@/lib/types";

export function AdminSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[21px] font-[640] tracking-[-0.035em]">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface overflow-hidden ${className}`}>{children}</div>;
}

export function AdminStat({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </p>
        {icon ? (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-lg"
            style={{
              color: accent ?? "var(--muted)",
              background: accent
                ? `color-mix(in srgb, ${accent} 12%, transparent)`
                : "var(--surface-2)",
            }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="font-display mt-2 text-[28px] font-[650] leading-none tracking-[-0.05em]">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[9px] leading-4 text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function AdminLoading({ label = "Загружаем данные…" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
      <Loader2 size={22} className="animate-spin" />
      <p className="text-[11px]">{label}</p>
    </div>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--line)] px-6 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-[rgba(176,58,52,0.1)] text-[#a63c36]">
        <AlertCircle size={18} />
      </span>
      <p className="text-[12px] font-semibold">Не удалось загрузить данные</p>
      <p className="max-w-md text-[10.5px] leading-5 text-[var(--muted)]">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-ghost btn-sm">
          <RefreshCw size={13} />
          Повторить
        </button>
      ) : null}
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder = "Поиск",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input !h-10 !pl-9 text-[12.5px]"
        aria-label={placeholder}
      />
    </div>
  );
}

export function AdminField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-[9.5px] leading-4 text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function AdminBadge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "warn" | "danger";
}) {
  const style =
    tone === "accent"
      ? {
          color: "var(--accent)",
          background: "var(--accent-soft)",
          borderColor: "color-mix(in srgb, var(--accent) 22%, transparent)",
        }
      : tone === "warn"
        ? { color: "#a8782b", background: "rgba(182,129,46,0.1)", borderColor: "rgba(182,129,46,0.28)" }
        : tone === "danger"
          ? { color: "#a63c36", background: "rgba(176,58,52,0.09)", borderColor: "rgba(176,58,52,0.24)" }
          : { color: "var(--muted)", background: "var(--surface-2)", borderColor: "var(--line)" };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.06em]"
      style={style}
    >
      {children}
    </span>
  );
}

export function ActivityChart({
  chart,
  height = 230,
  compact = false,
}: {
  chart: AdminStatsDTO["chart"];
  height?: number;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const width = 760;
  const padding = { top: 16, right: 12, bottom: compact ? 24 : 32, left: 30 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(
    1,
    ...chart.map((point) => point.pageViews),
    ...chart.map((point) => point.caps),
    ...chart.map((point) => point.signups),
  );
  const x = (index: number) =>
    padding.left + (chart.length <= 1 ? innerWidth / 2 : (index / (chart.length - 1)) * innerWidth);
  const y = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;

  const series = [
    { key: "pageViews" as const, color: "var(--accent)", label: "Просмотры", dashed: false },
    { key: "caps" as const, color: "var(--ink)", label: "Крышки", dashed: true },
    { key: "signups" as const, color: "var(--muted)", label: "Регистрации", dashed: true },
  ];

  const linePath = (key: "pageViews" | "caps" | "signups") =>
    chart.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(" ");

  const areaPath = `${linePath("pageViews")} L${x(chart.length - 1).toFixed(1)},${(padding.top + innerHeight).toFixed(1)} L${x(0).toFixed(1)},${(padding.top + innerHeight).toFixed(1)} Z`;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5 text-[9.5px] text-[var(--muted)]">
            <span
              className="inline-block h-[2px] w-4 rounded-full"
              style={{
                background: item.dashed
                  ? `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)`
                  : item.color,
              }}
            />
            {item.label}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-[var(--muted)]">14 дней</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="График активности KAPS за 14 дней"
      >
        <defs>
          <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + innerHeight * ratio}
              y2={padding.top + innerHeight * ratio}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 6}
              y={padding.top + innerHeight * ratio + 3}
              textAnchor="end"
              fontSize="8"
              fill="var(--muted)"
            >
              {Math.round(max * (1 - ratio))}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={`url(#area-${id})`} />
        {series.map((item) => (
          <path
            key={item.key}
            d={linePath(item.key)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.key === "pageViews" ? 2 : 1.4}
            strokeDasharray={item.dashed ? "3 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {chart.map((point, index) =>
          index % 2 === 0 || index === chart.length - 1 ? (
            <text
              key={point.date}
              x={x(index)}
              y={height - 8}
              textAnchor="middle"
              fontSize="7.5"
              fill="var(--muted)"
            >
              {point.label}
            </text>
          ) : null,
        )}
        {chart.map((point, index) =>
          point.pageViews > 0 ? (
            <circle key={`dot-${point.date}`} cx={x(index)} cy={y(point.pageViews)} r="2.2" fill="var(--accent)">
              <title>{`${point.label}: ${point.pageViews} просмотров, ${point.caps} крышек, ${point.signups} регистраций`}</title>
            </circle>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function RarityBar({
  label,
  color,
  count,
  total,
}: {
  label: string;
  color: string;
  count: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="size-1.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular-nums text-[var(--muted)]">
          {count} <span className="opacity-60">· {percent}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}
