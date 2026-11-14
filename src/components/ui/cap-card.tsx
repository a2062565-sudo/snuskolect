import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import type { ItemDTO } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { RARITY_META } from "@/lib/rarity";
import { RarityBadge, RarityIcon, rarityStyle } from "./rarity";

export function CapCard({
  item,
  href,
  showDate = true,
  compact = false,
}: {
  item: ItemDTO;
  href?: string;
  showDate?: boolean;
  compact?: boolean;
}) {
  const meta = RARITY_META[item.rarity];
  const title = item.productName || item.brandName || item.manufacturerName || "Крышка";
  const subtitle = item.brandName && item.brandName !== title ? item.brandName : item.manufacturerName;

  return (
    <Link
      href={href ?? `/collection/${item.id}`}
      className="surface card-hover rarity-glow group flex flex-col overflow-hidden"
      style={rarityStyle(item.rarity)}
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--surface-2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={`${item.brandName ?? ""} ${item.productName ?? "Крышка"}`.trim()}
          loading="lazy"
          className="cap-image"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" />

        <div className="absolute left-2.5 top-2.5 flex max-w-[72%] items-center gap-1.5">
          <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white/90 backdrop-blur-md">
            {item.manufacturerName ?? "KAPS"}
          </span>
          {item.isDemo ? (
            <span className="rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/70 backdrop-blur-md">
              demo
            </span>
          ) : null}
        </div>

        <div className="absolute right-2.5 top-2.5">
          <RarityBadge rarity={item.rarity} showIcon />
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
            style={{
              background: "rgba(8,10,8,0.38)",
              color: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <RarityIcon rarity={item.rarity} size={11} />
            {meta.labelEn}
          </span>
          {showDate ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[9.5px] font-medium text-white/75 backdrop-blur-md">
              <CalendarDays size={10} />
              {formatDate(item.createdAt)}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "gap-0.5 px-3.5 py-3" : "gap-1 px-4 py-4"}`}>
        <div className="flex items-center gap-1.5">
          {subtitle ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] line-clamp-1">
              {subtitle}
            </span>
          ) : null}
          {item.flavor ? (
            <span className="text-[10px] text-[var(--muted)] opacity-70">· {item.flavor}</span>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`font-display font-[640] tracking-[-0.03em] ${
              compact ? "text-[14px]" : "text-[16px]"
            } line-clamp-1`}
          >
            {title}
          </h3>
          {item.strength ? (
            <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-1 text-[9px] font-semibold text-[var(--muted)]">
              {item.strength}
            </span>
          ) : null}
        </div>
        {!compact ? (
          <div className="mt-auto flex items-center gap-1.5 pt-1 text-[10px] text-[var(--muted)]">
            <Sparkles size={10} />
            {item.capModel ? "В каталоге KAPS" : "Вне каталога"}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
