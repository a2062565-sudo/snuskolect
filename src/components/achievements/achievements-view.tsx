"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Lock, Sparkles, Trophy } from "lucide-react";
import type { AchievementDTO } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { RARITY_META } from "@/lib/rarity";
import { RarityBadge, rarityStyle } from "@/components/ui/rarity";
import { AchievementIcon } from "@/components/ui/achievement-icon";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/page";

type Filter = "all" | "unlocked" | "locked";

export function AchievementsView({ achievements }: { achievements: AchievementDTO[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  const visible = useMemo(() => {
    if (filter === "unlocked") return achievements.filter((achievement) => achievement.unlocked);
    if (filter === "locked") return achievements.filter((achievement) => !achievement.unlocked);
    return achievements;
  }, [achievements, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="scroll-x gap-1.5">
          {[
            { value: "all" as const, label: "Все", count: achievements.length },
            { value: "unlocked" as const, label: "Получено", count: unlockedCount },
            { value: "locked" as const, label: "В процессе", count: achievements.length - unlockedCount },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              data-active={filter === option.value}
              className="chip"
            >
              {option.label}
              <span className="tabular-nums opacity-60">{option.count}</span>
            </button>
          ))}
        </div>
        <span className="text-[10.5px] text-[var(--muted)]">
          {unlockedCount} из {achievements.length} открыто
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={filter === "unlocked" ? <Lock size={22} /> : <Sparkles size={22} />}
          title={filter === "unlocked" ? "Пока ни одного достижения" : "Всё уже открыто"}
          description={
            filter === "unlocked"
              ? "Добавь первую крышку — и первое достижение появится автоматически."
              : "Ты собрал все доступные достижения. Отличная работа!"
          }
        />
      ) : (
        <motion.div layout className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((achievement) => (
              <motion.div
                key={achievement.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <AchievementCard achievement={achievement} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDTO }) {
  const percent = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  const meta = achievement.rarity ? RARITY_META[achievement.rarity] : null;

  return (
    <article
      className={`surface card-hover relative h-full overflow-hidden p-5 ${
        achievement.unlocked ? "" : "bg-[color-mix(in_srgb,var(--surface)_60%,transparent)]"
      }`}
      style={achievement.rarity ? rarityStyle(achievement.rarity) : undefined}
    >
      {achievement.unlocked && meta ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-[0.13] blur-2xl"
          style={{ background: meta.color }}
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <span
          className={`grid size-12 place-items-center rounded-2xl ${
            achievement.unlocked
              ? "text-[var(--accent-ink)]"
              : "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
          }`}
          style={
            achievement.unlocked
              ? achievement.rarity
                ? { background: meta?.soft, color: meta?.color, border: `1px solid ${meta?.border}` }
                : { background: "var(--accent)", color: "var(--accent-ink)" }
              : undefined
          }
        >
          <AchievementIcon icon={achievement.icon} size={22} />
        </span>
        <div className="flex items-center gap-1.5">
          {achievement.rarity ? <RarityBadge rarity={achievement.rarity} showIcon={false} /> : null}
          {achievement.unlocked ? (
            <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Trophy size={12} />
            </span>
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
              <Lock size={11} />
            </span>
          )}
        </div>
      </div>

      <h3
        className={`font-display relative mt-4 text-[19px] font-[640] tracking-[-0.03em] ${
          achievement.unlocked ? "" : "text-[var(--muted)]"
        }`}
      >
        {achievement.title}
      </h3>
      <p className="relative mt-1.5 min-h-10 text-[11.5px] leading-5 text-[var(--muted)]">
        {achievement.description}
      </p>

      <div className="relative mt-4">
        {achievement.unlocked ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
              <Award size={11} />
              Получено
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {achievement.unlockedAt ? formatDate(achievement.unlockedAt) : ""}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[9.5px] text-[var(--muted)]">
              <span>Прогресс</span>
              <span className="tabular-nums">
                {achievement.progress} / {achievement.target}
              </span>
            </div>
            <ProgressBar value={percent} height={5} className="mt-2" />
          </>
        )}
      </div>
    </article>
  );
}
