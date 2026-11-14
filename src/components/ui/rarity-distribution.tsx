import Link from "next/link";
import type { Rarity, UserStatsDTO } from "@/lib/types";
import { RARITY_META, RARITY_ORDER } from "@/lib/rarity";
import { rarityStyle } from "./rarity";

export function RarityDistribution({
  stats,
  hrefBase = "/collection",
  showValues = true,
}: {
  stats: Pick<UserStatsDTO, "rarityCounts" | "totalCaps">;
  hrefBase?: string;
  showValues?: boolean;
}) {
  const total = Math.max(1, stats.totalCaps);
  const visible = RARITY_ORDER.filter((rarity) => rarity !== "UNDETERMINED" || stats.rarityCounts.UNDETERMINED > 0);

  return (
    <div className="space-y-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        {visible.map((rarity) => {
          const count = stats.rarityCounts[rarity] ?? 0;
          if (count === 0) return null;
          return (
            <span
              key={rarity}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(count / total) * 100}%`,
                background: RARITY_META[rarity].color,
                opacity: rarity === "COMMON" ? 0.7 : 1,
              }}
              title={`${RARITY_META[rarity].label}: ${count}`}
            />
          );
        })}
        {stats.totalCaps === 0 ? <span className="h-full w-full bg-[var(--surface-2)]" /> : null}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {RARITY_ORDER.filter((rarity) => ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(rarity)).map(
          (rarity) => {
            const count = stats.rarityCounts[rarity] ?? 0;
            return (
              <Link
                key={rarity}
                href={`${hrefBase}?rarity=${rarity}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-[var(--line)] hover:bg-[var(--surface-2)]"
                style={rarityStyle(rarity as Rarity)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: RARITY_META[rarity as Rarity].color }}
                  />
                  <span className="truncate text-[11.5px] font-medium text-[var(--muted)] group-hover:text-[var(--ink)]">
                    {RARITY_META[rarity as Rarity].labelEn}
                  </span>
                </span>
                {showValues ? (
                  <span className="font-display text-[13px] font-[640] tabular-nums">{count}</span>
                ) : null}
              </Link>
            );
          },
        )}
      </div>
    </div>
  );
}
