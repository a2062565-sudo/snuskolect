import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  BarChart3,
  Boxes,
  CircleDot,
  Factory,
  Layers,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCollectionStats, getRecentItems } from "@/lib/stats";
import { getUserAchievements } from "@/lib/achievements";
import { capCount, formatDate, plural } from "@/lib/format";
import { RARITY_META } from "@/lib/rarity";
import { CapCard } from "@/components/ui/cap-card";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/page";
import { RarityBadge, RarityIcon, rarityStyle } from "@/components/ui/rarity";
import { RarityDistribution } from "@/components/ui/rarity-distribution";
import { ProgressBar } from "@/components/ui/progress";
import { AchievementIcon } from "@/components/ui/achievement-icon";
import type { AchievementDTO, ItemDTO, UserStatsDTO } from "@/lib/types";

export const metadata: Metadata = {
  title: "Главная",
};

export default async function HomePage() {
  const user = await requireUser();
  const [stats, recent, achievements] = await Promise.all([
    getCollectionStats(user.id),
    getRecentItems(user.id, 4),
    getUserAchievements(user.id),
  ]);

  const firstName = (user.displayName || user.firstName || "коллекционер").split(" ")[0];
  const unlocked = achievements
    .filter((achievement) => achievement.unlocked)
    .sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""));
  const next = achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress / b.target - a.progress / a.target);
  const achievementPreview = [...unlocked.slice(0, 2), ...next.slice(0, 2)];
  const daysCollecting = stats.daysCollecting;

  return (
    <div className="container-kaps space-y-8 pt-5 sm:space-y-10 sm:pt-8">
      <section className="animate-rise">
        <div
          className="noise-panel relative overflow-hidden rounded-[30px] px-6 py-8 sm:rounded-[36px] sm:px-10 sm:py-11 lg:px-14 lg:py-14"
          style={{
            background:
              "linear-gradient(122deg, color-mix(in srgb, var(--accent) 30%, #0a0c09) 0%, #0b0d0a 58%, #080a08 100%)",
            color: "#f3f4ee",
            boxShadow: "0 34px 100px -50px rgba(0, 0, 0, 0.65)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full opacity-30 blur-[90px]"
            style={{ background: "var(--accent)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 left-1/4 size-[340px] rounded-full opacity-10 blur-[80px]"
            style={{ background: "#dfe8d9" }}
          />

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/65 backdrop-blur">
                  <CircleDot size={11} />
                  Твой архив
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/65 backdrop-blur">
                  <Trophy size={11} />
                  Level {stats.level.level} · {stats.level.title}
                </span>
              </div>

              <h1 className="display-title mt-5 text-[clamp(38px,7vw,68px)] text-[#f5f6f0]">
                {firstName},
                <br />
                <span className="text-white/45">коллекция растёт.</span>
              </h1>

              <p className="mt-4 max-w-xl text-[13px] leading-6 text-white/55 sm:text-[14px]">
                {stats.totalCaps === 0
                  ? "Сделай первое фото крышки — KAPS распознает бренд, вкус и редкость, а затем сохранит её в личный архив."
                  : `В архиве ${capCount(stats.totalCaps)}, ${stats.uniqueModels} ${plural(stats.uniqueModels, "модель", "модели", "моделей")} из каталога и ${stats.achievementCount} ${plural(stats.achievementCount, "достижение", "достижения", "достижений")}.`}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                <Link
                  href="/add"
                  className="btn btn-lg"
                  style={{ background: "#f4f5ef", color: "#101410" }}
                >
                  <Plus size={17} strokeWidth={2.2} />
                  Добавить крышку
                </Link>
                <Link
                  href="/collection"
                  className="btn btn-lg"
                  style={{
                    border: "1px solid rgba(255,255,255,0.17)",
                    background: "rgba(255,255,255,0.07)",
                    color: "#f4f5ef",
                  }}
                >
                  Вся коллекция
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.11em] text-white/40">
                <span>{stats.manufacturerCount} производителей</span>
                <span className="size-1 rounded-full bg-white/20" />
                <span>{stats.progress}% каталога</span>
                <span className="size-1 rounded-full bg-white/20" />
                <span>{stats.level.totalXp} XP</span>
              </div>
            </div>

            <HeroOrbit stats={stats} recent={recent} />
          </div>
        </div>
      </section>

      <Reveal>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <QuickStat
            icon={<Layers size={16} />}
            label="Всего крышек"
            value={stats.totalCaps}
            hint={`${stats.uniqueModels} уникальных моделей`}
          />
          <QuickStat
            icon={<Boxes size={16} />}
            label="Каталог KAPS"
            value={`${stats.progress}%`}
            hint={`${stats.uniqueModels} из ${stats.catalogTotal}`}
          />
          <QuickStat
            icon={<Factory size={16} />}
            label="Производители"
            value={stats.manufacturerCount}
            hint="в твоей коллекции"
          />
          <QuickStat
            icon={<Award size={16} />}
            label="Достижения"
            value={stats.achievementCount}
            hint={`из ${achievements.length} возможных`}
          />
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Reveal className="min-w-0">
          <section>
            <SectionHeading
              title="Последние находки"
              description="Свежие крышки в твоём архиве"
              action={
                <Link
                  href="/collection"
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  Все крышки
                  <ArrowRight size={13} />
                </Link>
              }
            />
            {recent.length === 0 ? (
              <div className="surface flex flex-col items-center px-6 py-12 text-center">
                <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles size={22} />
                </span>
                <h3 className="font-display text-[19px] font-[640] tracking-[-0.03em]">
                  Архив ждёт первую крышку
                </h3>
                <p className="mt-2 max-w-sm text-[12.5px] leading-5 text-[var(--muted)]">
                  Сфотографируй крышку снюса. Мы распознаем текст, найдём модель в каталоге и определим её редкость.
                </p>
                <Link href="/add" className="btn btn-accent btn-sm mt-5">
                  <Plus size={14} />
                  Начать сканирование
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
                {recent.map((item) => (
                  <CapCard key={item.id} item={item} compact />
                ))}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={0.08} className="min-w-0">
          <section className="surface h-full p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Коллекция</p>
                <h2 className="font-display mt-2.5 text-[22px] font-[640] tracking-[-0.04em]">
                  {stats.progress}% каталога
                </h2>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <BarChart3 size={19} />
              </span>
            </div>

            <div className="mt-4">
              <ProgressBar value={stats.progress} height={8} />
              <div className="mt-2 flex items-center justify-between text-[10.5px] text-[var(--muted)]">
                <span>{stats.uniqueModels} моделей собрано</span>
                <span>{stats.catalogTotal} в каталоге</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--surface-2)] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                    Уровень {stats.level.level}
                  </p>
                  <p className="font-display mt-0.5 text-[16px] font-[640] tracking-[-0.025em]">
                    {stats.level.title}
                  </p>
                </div>
                <span className="font-display text-[24px] font-[650] tracking-[-0.05em] text-[var(--accent)]">
                  {stats.level.totalXp}
                  <span className="ml-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    xp
                  </span>
                </span>
              </div>
              <ProgressBar value={stats.level.progress} height={5} className="mt-3" />
              <p className="mt-2 text-[10px] text-[var(--muted)]">
                {stats.level.nextLevelXp
                  ? `До уровня «${stats.level.nextTitle}»: ${Math.max(0, stats.level.nextLevelXp - stats.level.totalXp)} XP`
                  : "Максимальный уровень достигнут"}
              </p>
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                Редкости
              </p>
              <RarityDistribution stats={stats} />
            </div>

            {daysCollecting > 0 ? (
              <p className="mt-4 text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                Собираешь {daysCollecting} {plural(daysCollecting, "день", "дня", "дней")}
              </p>
            ) : null}
          </section>
        </Reveal>
      </div>

      <Reveal>
        <section>
          <SectionHeading
            title="Достижения"
            description="Маленькие вехи на длинном пути коллекционера"
            action={
              <Link
                href="/achievements"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Все достижения
                <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            {achievementPreview.map((achievement) => (
              <AchievementPreview key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="surface flex flex-col items-start justify-between gap-5 overflow-hidden p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-ink)]">
              <Plus size={21} />
            </span>
            <div>
              <h2 className="font-display text-[22px] font-[640] tracking-[-0.04em]">
                Ещё одна крышка — ещё одна история
              </h2>
              <p className="mt-1 max-w-xl text-[12.5px] leading-5 text-[var(--muted)]">
                Фотография с телефона, распознавание текста и автоматическая редкость. Без ручного ввода и лишних шагов.
              </p>
            </div>
          </div>
          <Link href="/add" className="btn btn-primary shrink-0">
            Сканировать крышку
            <ArrowRight size={15} />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="surface flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </span>
        <span className="grid size-8 place-items-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
          {icon}
        </span>
      </div>
      <span className="stat-value mt-4">{value}</span>
      <span className="mt-1 text-[10px] text-[var(--muted)]">{hint}</span>
    </div>
  );
}

function AchievementPreview({ achievement }: { achievement: AchievementDTO }) {
  const percent = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  return (
    <Link
      href="/achievements"
      className="surface card-hover flex flex-col p-4"
      style={achievement.rarity ? rarityStyle(achievement.rarity) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`grid size-10 place-items-center rounded-2xl ${
            achievement.unlocked
              ? "bg-[var(--accent)] text-[var(--accent-ink)]"
              : "bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
          style={
            achievement.unlocked && achievement.rarity
              ? { background: "var(--rarity-soft)", color: "var(--rarity)" }
              : undefined
          }
        >
          <AchievementIcon icon={achievement.icon} size={18} />
        </span>
        {achievement.rarity ? <RarityBadge rarity={achievement.rarity} showIcon={false} /> : null}
      </div>
      <h3 className="mt-4 text-[13.5px] font-semibold">{achievement.title}</h3>
      <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-[var(--muted)]">
        {achievement.description}
      </p>
      <div className="mt-auto pt-3">
        {achievement.unlocked ? (
          <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
            <Trophy size={10} />
            Получено {achievement.unlockedAt ? formatDate(achievement.unlockedAt) : ""}
          </span>
        ) : (
          <>
            <ProgressBar value={percent} height={4} />
            <span className="mt-1.5 block text-[9.5px] text-[var(--muted)]">
              {achievement.progress} / {achievement.target}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

function HeroOrbit({ stats, recent }: { stats: UserStatsDTO; recent: ItemDTO[] }) {
  const size = 230;
  const stroke = 2;
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.progress / 100) * circumference;
  const orbitImages = recent.slice(0, 3);

  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-[330px] sm:block">
      <div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full border border-white/10"
        style={{ transform: "rotate(-18deg)" }}
      />
      <div
        aria-hidden="true"
        className="animate-spin-slow absolute inset-[3%] rounded-full border border-dashed border-white/10"
      />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(255,255,255,0.025)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#c6e6d2"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">Каталог</span>
        <span className="font-display mt-1 text-[54px] font-[650] leading-none tracking-[-0.07em] text-white">
          {stats.progress}
          <span className="ml-0.5 align-top text-[20px] font-medium text-white/50">%</span>
        </span>
        <span className="mt-2 text-[10px] text-white/45">
          {stats.uniqueModels} из {stats.catalogTotal} моделей
        </span>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60">
          <Award size={10} />
          {stats.totalCaps} {plural(stats.totalCaps, "крышка", "крышки", "крышек")}
        </span>
      </div>

      {orbitImages.map((item, index) => {
        const positions = [
          { top: "1%", right: "4%" },
          { bottom: "5%", left: "0%" },
          { bottom: "10%", right: "-2%" },
        ][index];
        return (
          <span
            key={item.id}
            className="absolute grid size-[58px] place-items-center overflow-hidden rounded-full border border-white/25 bg-white/10 shadow-2xl backdrop-blur-md"
            style={{ ...positions, animation: `floaty ${5 + index * 0.9}s ease-in-out infinite` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
          </span>
        );
      })}

      {stats.rarest ? (
        <div
          className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#0b0d0a]/80 px-3 py-1.5 backdrop-blur-md"
          style={rarityStyle(stats.rarest.rarity)}
        >
          <RarityIcon rarity={stats.rarest.rarity} size={11} />
          <span className="text-[9.5px] font-semibold text-white/80">
            {RARITY_META[stats.rarest.rarity].labelEn}
          </span>
          <span className="max-w-[110px] truncate text-[9.5px] text-white/45">
            {stats.rarest.productName ?? stats.rarest.brandName}
          </span>
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="animate-pulse-glow absolute inset-[22%] -z-10 rounded-full"
        style={{ background: "rgba(169,216,191,0.4)", filter: "blur(60px)" }}
      />
    </div>
  );
}
