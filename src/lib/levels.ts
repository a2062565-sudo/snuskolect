import type { CollectorLevel, Rarity } from "./types";
import { RARITY_POINTS } from "./rarity";

interface LevelDefinition {
  level: number;
  title: string;
  minXp: number;
}

export const LEVELS: LevelDefinition[] = [
  { level: 1, title: "Новичок", minXp: 0 },
  { level: 2, title: "Собиратель", minXp: 40 },
  { level: 3, title: "Коллекционер", minXp: 120 },
  { level: 4, title: "Хранитель", minXp: 280 },
  { level: 5, title: "Знаток", minXp: 550 },
  { level: 6, title: "Мастер", minXp: 950 },
  { level: 7, title: "Легенда", minXp: 1500 },
  { level: 8, title: "Миф", minXp: 2300 },
];

export function calculateXp(
  rarityCounts: Partial<Record<Rarity, number>>,
  achievements: number,
): number {
  let xp = 0;
  for (const [rarity, count] of Object.entries(rarityCounts)) {
    xp += (RARITY_POINTS[rarity as Rarity] ?? 0) * (count ?? 0);
  }
  xp += achievements * 25;
  return xp;
}

export function getCollectorLevel(
  rarityCounts: Partial<Record<Rarity, number>>,
  achievements: number,
): CollectorLevel {
  const totalXp = calculateXp(rarityCounts, achievements);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const levelStartXp = current.minXp;
  const nextLevelXp = next?.minXp ?? null;
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((totalXp - levelStartXp) / (next.minXp - levelStartXp)) * 100)))
    : 100;

  return {
    level: current.level,
    title: current.title,
    totalXp,
    levelStartXp,
    nextLevelXp,
    progress,
    nextTitle: next?.title ?? null,
  };
}