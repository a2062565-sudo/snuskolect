import type { ReactNode } from "react";
import type { UserStatsDTO } from "@/lib/types";
import type { PublicUserDTO } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "K";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function Avatar({
  user,
  size = 44,
  className = "",
  ring = false,
}: {
  user: Pick<PublicUserDTO, "displayName" | "photoUrl" | "isDemo">;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--surface-2)] font-semibold text-[var(--muted)] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.32)),
        boxShadow: ring ? "0 0 0 2px var(--card), 0 0 0 3px var(--accent)" : undefined,
      }}
    >
      {user.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.photoUrl}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(user.displayName)
      )}
    </span>
  );
}

export function LevelRing({
  stats,
  size = 76,
  stroke = 5,
}: {
  stats: Pick<UserStatsDTO, "level">;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.level.progress / 100) * circumference;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <span className="absolute flex flex-col items-center leading-none">
        <span className="font-display text-[19px] font-[650] tracking-[-0.04em]">{stats.level.level}</span>
        <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          level
        </span>
      </span>
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warn" | "danger";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--line)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)] border-[color-mix(in_srgb,var(--accent)_22%,transparent)]",
    warn: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    danger: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
