import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Factory,
  Fingerprint,
  Info,
  Pencil,
  ScanText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCollectionItem, itemInclude } from "@/lib/stats";
import { toItemDTO } from "@/lib/dto";
import { formatDate, formatDateTime } from "@/lib/format";
import { RARITY_META } from "@/lib/rarity";
import { Avatar } from "@/components/ui/avatar";
import { CapCard } from "@/components/ui/cap-card";
import { RarityBadge, RarityIcon, RarityName, rarityStyle } from "@/components/ui/rarity";
import { SectionHeading } from "@/components/ui/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getCollectionItem(id);
  if (!item) return { title: "Крышка не найдена" };
  return {
    title: [item.brandName, item.productName].filter(Boolean).join(" ") || "Крышка",
    description: item.description?.slice(0, 160) ?? "Крышка из коллекции KAPS.",
  };
}

export default async function CollectionItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const item = await getCollectionItem(id);
  if (!item || !viewer) notFound();

  const isOwner = item.userId === viewer.id;
  const isStaff = viewer.role === "SUPPORT" || viewer.role === "ADMIN";
  if (!isOwner && !isStaff && !item.user.isPublic) notFound();

  const similar = await prisma.collectionItem.findMany({
    where: {
      userId: item.userId,
      id: { not: item.id },
      ...(item.manufacturerId ? { manufacturerId: item.manufacturerId } : {}),
    },
    include: itemInclude,
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const meta = RARITY_META[item.rarity];
  const ownerName =
    item.user.displayName ||
    [item.user.firstName, item.user.lastName].filter(Boolean).join(" ") ||
    "Коллекционер";
  const title = item.productName || item.brandName || "Крышка без названия";

  return (
    <div className="container-kaps pt-5 sm:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isOwner ? "/collection" : `/u/${item.user.slug}`}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={14} />
          {isOwner ? "К коллекции" : "К профилю коллекционера"}
        </Link>
        <div className="flex items-center gap-2">
          {isOwner ? <RarityBadge rarity={item.rarity} /> : null}
          {isStaff ? (
            <Link
              href={`/admin?tab=items&item=${item.id}`}
              className="btn btn-ghost btn-sm"
            >
              <Pencil size={13} />
              Редактировать
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start">
        <div className="lg:sticky lg:top-[92px]">
          <div
            className="rarity-aura relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] p-2.5"
            style={{ ...rarityStyle(item.rarity), background: "var(--surface)" }}
          >
            <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius-lg)-10px)] bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={`${item.brandName ?? ""} ${item.productName ?? "Крышка"}`.trim()}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/[0.03]" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <RarityBadge rarity={item.rarity} />
                {item.isDemo ? (
                  <span className="rounded-full border border-white/15 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/75 backdrop-blur">
                    demo
                  </span>
                ) : null}
              </div>
              <div className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] text-white/70 backdrop-blur">
                {formatDate(item.createdAt)}
              </div>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="surface flex items-center gap-2.5 p-3">
              <span className="grid size-8 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
                <ScanText size={14} />
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">OCR</p>
                <p className="text-[11.5px] font-semibold">
                  {item.ocrConfidence !== null ? `${Math.round(item.ocrConfidence)}% уверенность` : "Ручная запись"}
                </p>
              </div>
            </div>
            <div className="surface flex items-center gap-2.5 p-3">
              <span className="grid size-8 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
                <ShieldCheck size={14} />
              </span>
              <div>
                <p className="text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">Каталог</p>
                <p className="text-[11.5px] font-semibold">{item.capModel ? "Модель найдена" : "Вне каталога"}</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {item.manufacturerName ? (
              <Link
                href={`/collection?manufacturer=${item.manufacturerId ?? ""}`}
                className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {item.manufacturerName}
              </Link>
            ) : null}
            {item.brandName ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                {item.brandName}
              </span>
            ) : null}
          </div>

          <h1 className="display-title mt-3 text-[clamp(34px,5.5vw,56px)]">{title}</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            {[item.flavor, item.strength].filter(Boolean).join(" · ") || "Вкус и крепость не указаны"}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold"
              style={rarityStyle(item.rarity)}
            >
              <span style={{ color: meta.color }}>
                <RarityIcon rarity={item.rarity} size={13} />
              </span>
              {meta.label} · {meta.labelEn}
            </span>
            {item.capModel ? (
              <span className="tag">{item.capModel.brand} {item.capModel.name}</span>
            ) : (
              <span className="tag">Модель не определена</span>
            )}
          </div>

          <div className="surface mt-5 p-5 sm:p-6">
            <h2 className="font-display text-[15px] font-[640] tracking-[-0.02em]">Описание</h2>
            <p className="mt-2 whitespace-pre-line text-[12.5px] leading-6 text-[var(--muted)]">
              {item.description || "Описание пока не добавлено. Ты можешь уточнить его при следующем сканировании."}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <InfoCell icon={<Factory size={14} />} label="Производитель" value={item.manufacturerName ?? "—"} />
            <InfoCell icon={<Sparkles size={14} />} label="Редкость" value={`${meta.label} / ${meta.labelEn}`} />
            <InfoCell icon={<Fingerprint size={14} />} label="Модель" value={item.productName ?? "—"} />
            <InfoCell icon={<CalendarDays size={14} />} label="Добавлена" value={formatDate(item.createdAt)} />
          </div>

          <div className="surface mt-4 flex items-center gap-3 p-4">
            <Avatar
              user={{
                displayName: ownerName,
                photoUrl: item.user.photoUrl,
                isDemo: item.isDemo,
              }}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">Коллекционер</p>
              <p className="truncate text-[12.5px] font-semibold">{isOwner ? "Это твоя крышка" : ownerName}</p>
            </div>
            <Link
              href={isOwner ? "/profile" : `/u/${item.user.slug}`}
              className="icon-btn !size-9"
              aria-label="Открыть профиль коллекционера"
            >
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {item.description?.includes("Текст с крышки:") ? (
            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                <Info size={12} />
                OCR-текст
              </div>
              <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[var(--muted)]">
                {item.description.split("Текст с крышки:")[1]?.trim()}
              </p>
            </div>
          ) : null}

          {item.recognizedText ? (
            <div className="surface mt-4 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                <ScanText size={12} />
                Распознанный текст
              </div>
              <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-[10.5px] leading-5 text-[var(--muted)]">
                {item.recognizedText}
              </pre>
              <p className="mt-2 text-[9.5px] text-[var(--muted)] opacity-70">
                Скан: {formatDateTime(item.createdAt)} · уверенность{" "}
                {item.ocrConfidence !== null ? `${Math.round(item.ocrConfidence)}%` : "не указана"}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-[var(--line)] p-4" style={rarityStyle(item.rarity)}>
            <RarityName rarity={item.rarity} />
            <p className="mt-1.5 text-[11.5px] leading-5 text-[var(--muted)]">{meta.description}</p>
          </div>
        </div>
      </div>

      {similar.length > 0 ? (
        <section className="mt-10 sm:mt-14">
          <SectionHeading
            title="Из той же коллекции"
            description={item.manufacturerName ? `Ещё крышки ${item.manufacturerName}` : "Другие крышки этого коллекционера"}
          />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            {similar.map((entry) => (
              <CapCard key={entry.id} item={toItemDTO(entry)} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InfoCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="surface flex items-start gap-2.5 p-3.5">
      <span className="mt-0.5 text-[var(--muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[0.09em] text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 break-words text-[11.5px] font-semibold leading-5">{value}</p>
      </div>
    </div>
  );
}
