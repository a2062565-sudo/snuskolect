import type { CSSProperties, ReactNode } from "react";
import {
  Circle,
  Crown,
  Diamond,
  Flame,
  Gem,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { RARITY_META } from "@/lib/rarity";
import type { Rarity } from "@/lib/types";

const ICONS: Record<Rarity, LucideIcon> = {
  UNDETERMINED: HelpCircle,
  COMMON: Circle,
  UNCOMMON: Diamond,
  RARE: Gem,
  EPIC: Sparkles,
  LEGENDARY: Flame,
  MYTHIC: Crown,
};

export function rarityStyle(rarity: Rarity): CSSProperties {
  const meta = RARITY_META[rarity];
  return {
    "--rarity": meta.color,
    "--rarity-soft": meta.soft,
    "--rarity-border": meta.border,
  } as CSSProperties;
}

export function RarityIcon({ rarity, size = 14 }: { rarity: Rarity; size?: number }) {
  const Icon = ICONS[rarity] ?? Circle;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

export function RarityBadge({
  rarity,
  showIcon = true,
  className = "",
  label,
}: {
  rarity: Rarity;
  showIcon?: boolean;
  className?: string;
  label?: string;
}) {
  const meta = RARITY_META[rarity];
  return (
    <span
      className={`rarity-chip ${className}`}
      style={rarityStyle(rarity)}
      title={meta.description}
    >
      {showIcon ? <RarityIcon rarity={rarity} size={11} /> : null}
      {label ?? meta.labelEn}
    </span>
  );
}

export function RarityName({ rarity }: { rarity: Rarity }) {
  const meta = RARITY_META[rarity];
  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-semibold" style={rarityStyle(rarity)}>
      <span className="rarity-text inline-flex">
        <RarityIcon rarity={rarity} size={14} />
      </span>
      <span>{meta.label}</span>
    </span>
  );
}

export function RarityLegend({ children }: { children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--muted)]">
      {children}
    </div>
  );
}
