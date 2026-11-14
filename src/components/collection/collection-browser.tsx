"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { ItemDTO, Rarity } from "@/lib/types";
import { RARITY_META, RARITY_ORDER, rarityRank } from "@/lib/rarity";
import { CapCard } from "@/components/ui/cap-card";
import { EmptyState } from "@/components/ui/page";
import { RarityIcon, rarityStyle } from "@/components/ui/rarity";

type SortKey = "new" | "old" | "rarity" | "name";

interface InitialQuery {
  q?: string;
  rarity?: string;
  manufacturer?: string;
  sort?: string;
}

const RARITY_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "Все редкости" },
  { value: "LEGENDS", label: "Легенды и мифы" },
  ...RARITY_ORDER.filter((rarity) => rarity !== "UNDETERMINED").map((rarity) => ({
    value: rarity,
    label: RARITY_META[rarity].labelEn,
  })),
  { value: "UNDETERMINED", label: "Без редкости" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "new", label: "Сначала новые" },
  { value: "old", label: "Сначала старые" },
  { value: "rarity", label: "По редкости" },
  { value: "name", label: "По названию" },
];

function normalizeRarity(value: string | undefined): string {
  if (!value) return "ALL";
  const upper = value.toUpperCase();
  if (upper === "LEGENDS") return "LEGENDS";
  return RARITY_ORDER.includes(upper as Rarity) ? upper : "ALL";
}

function normalizeSort(value: string | undefined): SortKey {
  return value === "old" || value === "rarity" || value === "name" ? value : "new";
}

function searchable(item: ItemDTO): string {
  return [
    item.brandName,
    item.productName,
    item.manufacturerName,
    item.flavor,
    item.strength,
    item.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function CollectionBrowser({
  items,
  initialQuery = {},
  title,
}: {
  items: ItemDTO[];
  initialQuery?: InitialQuery;
  title?: string;
}) {
  const [query, setQuery] = useState(initialQuery.q ?? "");
  const [rarity, setRarity] = useState(() => normalizeRarity(initialQuery.rarity));
  const [manufacturer, setManufacturer] = useState(initialQuery.manufacturer ?? "ALL");
  const [sort, setSort] = useState<SortKey>(() => normalizeSort(initialQuery.sort));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const manufacturers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; accent: string | null }>();
    for (const item of items) {
      if (!item.manufacturer) continue;
      const existing = map.get(item.manufacturer.id);
      if (existing) existing.count += 1;
      else
        map.set(item.manufacturer.id, {
          id: item.manufacturer.id,
          name: item.manufacturer.name,
          count: 1,
          accent: item.manufacturer.accent,
        });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = items.filter((item) => {
      if (manufacturer !== "ALL" && item.manufacturerId !== manufacturer) return false;
      if (rarity === "LEGENDS" && item.rarity !== "LEGENDARY" && item.rarity !== "MYTHIC") return false;
      if (rarity !== "ALL" && rarity !== "LEGENDS" && item.rarity !== rarity) return false;
      if (needle && !searchable(item).includes(needle)) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sort === "rarity") {
        const difference = rarityRank(b.rarity) - rarityRank(a.rarity);
        if (difference !== 0) return difference;
      }
      if (sort === "old") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === "name") {
        const nameA = `${a.brandName ?? ""} ${a.productName ?? ""}`.trim();
        const nameB = `${b.brandName ?? ""} ${b.productName ?? ""}`.trim();
        return nameA.localeCompare(nameB, "ru");
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, query, rarity, manufacturer, sort]);

  function syncUrl(next: {
    q?: string;
    rarity?: string;
    manufacturer?: string;
    sort?: SortKey;
  }) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const values = {
      q: next.q ?? query,
      rarity: next.rarity ?? rarity,
      manufacturer: next.manufacturer ?? manufacturer,
      sort: next.sort ?? sort,
    };
    if (values.q.trim()) params.set("q", values.q.trim());
    else params.delete("q");
    if (values.rarity && values.rarity !== "ALL") params.set("rarity", values.rarity);
    else params.delete("rarity");
    if (values.manufacturer && values.manufacturer !== "ALL") params.set("manufacturer", values.manufacturer);
    else params.delete("manufacturer");
    if (values.sort && values.sort !== "new") params.set("sort", values.sort);
    else params.delete("sort");
    const queryString = params.toString();
    window.history.replaceState(null, "", queryString ? `?${queryString}` : window.location.pathname);
  }

  const activeFilters = (query ? 1 : 0) + (rarity !== "ALL" ? 1 : 0) + (manufacturer !== "ALL" ? 1 : 0);

  function reset() {
    setQuery("");
    setRarity("ALL");
    setManufacturer("ALL");
    setSort("new");
    syncUrl({ q: "", rarity: "ALL", manufacturer: "ALL", sort: "new" });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-[92px] lg:self-start">
        <div className="flex items-center justify-between gap-2 lg:mb-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className="btn btn-ghost btn-sm lg:hidden"
          >
            <SlidersHorizontal size={14} />
            Фильтры
            {activeFilters > 0 ? (
              <span className="grid size-4 place-items-center rounded-full bg-[var(--ink)] text-[9px] font-bold text-[var(--bg)]">
                {activeFilters}
              </span>
            ) : null}
          </button>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] lg:block">
            Фильтры
          </span>
          {activeFilters > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="text-[10.5px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Сбросить
            </button>
          ) : null}
        </div>

        <div
          className={`${
            filtersOpen ? "block" : "hidden"
          } surface mt-2 space-y-5 p-4 lg:mt-0 lg:block`}
        >
          <div>
            <label htmlFor="collection-search" className="label">
              Поиск
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                id="collection-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  syncUrl({ q: event.target.value });
                }}
                placeholder="Бренд, вкус, модель…"
                className="input !pl-10 !pr-9"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Очистить поиск"
                  onClick={() => {
                    setQuery("");
                    syncUrl({ q: "" });
                  }}
                  className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-2)]"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <span className="label">Редкость</span>
            <div className="flex flex-wrap gap-1.5">
              {RARITY_FILTERS.map((option) => {
                const active = rarity === option.value;
                const meta =
                  option.value !== "ALL" && option.value !== "LEGENDS" && option.value !== "UNDETERMINED"
                    ? RARITY_META[option.value as Rarity]
                    : option.value === "UNDETERMINED"
                      ? RARITY_META.UNDETERMINED
                      : null;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRarity(option.value);
                      syncUrl({ rarity: option.value });
                    }}
                    data-active={active}
                    className="chip !h-7 !px-2.5 !text-[10.5px]"
                    style={meta ? rarityStyle(meta.value) : undefined}
                  >
                    {meta ? (
                      <span style={{ color: active ? undefined : meta.color }}>
                        <RarityIcon rarity={meta.value} size={10} />
                      </span>
                    ) : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {manufacturers.length > 0 ? (
            <div>
              <span className="label">Производитель</span>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setManufacturer("ALL");
                    syncUrl({ manufacturer: "ALL" });
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11.5px] ${
                    manufacturer === "ALL"
                      ? "bg-[var(--surface-2)] font-semibold text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span>Все производители</span>
                  <span className="text-[10px] opacity-60">{items.length}</span>
                </button>
                <div className="max-h-[248px] overflow-y-auto pr-1">
                  {manufacturers.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setManufacturer(entry.id);
                        syncUrl({ manufacturer: entry.id });
                      }}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11.5px] ${
                        manufacturer === entry.id
                          ? "bg-[var(--surface-2)] font-semibold text-[var(--ink)]"
                          : "text-[var(--muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ background: entry.accent ?? "var(--muted)" }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="text-[10px] opacity-60">{entry.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11.5px] text-[var(--muted)]">
            <LayoutGrid size={14} />
            <span>
              {filtered.length} {filtered.length === 1 ? "крышка" : filtered.length < 5 ? "крышки" : "крышек"}
              {title ? ` · ${title}` : ""}
            </span>
            {filtered.length !== items.length ? (
              <span className="opacity-60">из {items.length}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="collection-sort" className="sr-only">
              Сортировка
            </label>
            <select
              id="collection-sort"
              value={sort}
              onChange={(event) => {
                const value = normalizeSort(event.target.value);
                setSort(value);
                syncUrl({ sort: value });
              }}
              className="select !h-9 !w-auto !rounded-full !pl-3.5 !pr-9 !text-[11.5px]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={items.length === 0 ? <Sparkles size={22} /> : <Search size={22} />}
            title={items.length === 0 ? "В коллекции пока пусто" : "Ничего не найдено"}
            description={
              items.length === 0
                ? "Добавь первую крышку с помощью камеры или загрузи фотографию — KAPS сделает остальное."
                : "Попробуй изменить запрос или сбросить фильтры. Возможно, эта крышка ещё ждёт своего часа."
            }
            action={
              items.length === 0 ? undefined : (
                <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
                  Сбросить фильтры
                </button>
              )
            }
          />
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
                >
                  <CapCard item={item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </div>
  );
}
