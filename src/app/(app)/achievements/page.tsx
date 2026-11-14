import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserAchievements } from "@/lib/achievements";
import { achievementCount } from "@/lib/format";
import { PageHeader } from "@/components/ui/page";
import { AchievementsView } from "@/components/achievements/achievements-view";
import { Ring } from "@/components/ui/progress";
import { AchievementIcon } from "@/components/ui/achievement-icon";
import { ProgressBar } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Достижения",
  description: "Достижения коллекционера KAPS: первые крышки, редкие находки и полный архив.",
};

export default async function AchievementsPage() {
  const user = await requireUser();
  const achievements = await getUserAchievements(user.id);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const percent = achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0;
  const next = achievements
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Путь коллекционера"
        title="Достижения"
        description={`${achievementCount(unlocked.length)} открыто. Каждая крышка в архиве приближает следующую награду.`}
        actions={
          <Link href="/collection" className="btn btn-ghost">
            Моя коллекция
            <ArrowRight size={15} />
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface flex items-center gap-5 p-5 sm:p-6">
          <Ring value={percent} size={116} stroke={7}>
            <span className="font-display text-[27px] font-[650] tracking-[-0.05em]">{percent}%</span>
            <span className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              открыто
            </span>
          </Ring>
          <div className="min-w-0">
            <p className="eyebrow">Прогресс</p>
            <h2 className="font-display mt-2 text-[24px] font-[640] tracking-[-0.04em]">
              {unlocked.length} / {achievements.length}
            </h2>
            <p className="mt-2 max-w-xs text-[11.5px] leading-5 text-[var(--muted)]">
              Достижения открываются автоматически после добавления крышек и роста коллекции.
            </p>
            <Link
              href="/add"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)]"
            >
              <Sparkles size={12} />
              Добавить крышку
            </Link>
          </div>
        </div>

        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Следующая цель</p>
            <Trophy size={15} className="text-[var(--muted)]" />
          </div>
          {next ? (
            <>
              <div className="mt-3 flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
                  <AchievementIcon icon={next.icon} size={19} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-semibold">{next.title}</h3>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--muted)]">{next.description}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[9.5px] text-[var(--muted)]">
                  <span>Осталось {Math.max(0, next.target - next.progress)}</span>
                  <span>
                    {next.progress} / {next.target}
                  </span>
                </div>
                <ProgressBar
                  value={(next.progress / next.target) * 100}
                  height={6}
                  className="mt-2"
                />
              </div>
            </>
          ) : (
            <div className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
              Все достижения уже открыты. Ты настоящая легенда KAPS.
            </div>
          )}
        </div>
      </div>

      <div className="mt-7">
        <AchievementsView achievements={achievements} />
      </div>
    </div>
  );
}
