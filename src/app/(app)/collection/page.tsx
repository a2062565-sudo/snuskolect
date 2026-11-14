import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCollectionItems, getCollectionStats } from "@/lib/stats";
import { capCount } from "@/lib/format";
import { PageHeader } from "@/components/ui/page";
import { CollectionBrowser } from "@/components/collection/collection-browser";
import { RarityDistribution } from "@/components/ui/rarity-distribution";
import { ProgressBar } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Коллекция",
  description: "Все крышки твоего личного архива KAPS: поиск, фильтры по редкости и производителю.",
};

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [stats, items] = await Promise.all([getCollectionStats(user.id), getCollectionItems(user.id)]);

  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Личный архив"
        title="Коллекция"
        description={`${capCount(stats.totalCaps)} · ${stats.uniqueModels} уникальных моделей · ${stats.progress}% каталога KAPS`}
        actions={
          <>
            <Link href={`/u/${user.slug}`} className="btn btn-ghost">
              Публичный профиль
              <ArrowUpRight size={15} />
            </Link>
            <Link href="/add" className="btn btn-primary">
              <Plus size={16} />
              Добавить
            </Link>
          </>
        }
      >
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <span className="font-display text-[17px] font-[650] text-[var(--ink)]">{stats.progress}%</span>
            <span className="w-24">
              <ProgressBar value={stats.progress} height={4} />
            </span>
          </div>
          <span>{stats.manufacturerCount} производителей</span>
          <span>{stats.achievementCount} достижений</span>
        </div>
      </PageHeader>

      <div className="mt-6">
        <CollectionBrowser
          items={items}
          initialQuery={{
            q: first(params.q),
            rarity: first(params.rarity),
            manufacturer: first(params.manufacturer),
            sort: first(params.sort),
          }}
        />
      </div>

      {items.length > 0 ? (
        <div className="surface mt-8 grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="eyebrow">Состав архива</p>
            <h2 className="font-display mt-2.5 text-[22px] font-[640] tracking-[-0.04em]">
              {stats.progress}% каталога собрано
            </h2>
            <p className="mt-2 max-w-sm text-[12px] leading-5 text-[var(--muted)]">
              Каждая новая модель приближает тебя к полному архиву. Легендарные и мифические крышки открывают
              особые достижения.
            </p>
            {stats.progress >= 100 ? (
              <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)]">
                <Sparkles size={13} />
                Каталог собран полностью
              </span>
            ) : null}
          </div>
          <RarityDistribution stats={stats} showValues />
        </div>
      ) : null}
    </div>
  );
}
