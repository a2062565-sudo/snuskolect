import type { Rarity } from "./types";

export interface RarityMeta {
  value: Rarity;
  label: string;
  labelEn: string;
  description: string;
  color: string;
  soft: string;
  border: string;
  order: number;
  icon: "circle" | "diamond" | "gem" | "sparkles" | "flame" | "crown" | "help";
}

export const RARITY_ORDER: Rarity[] = [
  "UNDETERMINED",
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
];

export const RARITY_META: Record<Rarity, RarityMeta> = {
  UNDETERMINED: {
    value: "UNDETERMINED",
    label: "Не определена",
    labelEn: "Undetermined",
    description: "Крышка распознана, но модели нет в каталоге. Редкость не assigned.",
    color: "#8a8a82",
    soft: "rgba(138,138,130,0.10)",
    border: "rgba(138,138,130,0.32)",
    order: 0,
    icon: "help",
  },
  COMMON: {
    value: "COMMON",
    label: "Обычная",
    labelEn: "Common",
    description: "Массовые серии в свободной продаже.",
    color: "#8d8d84",
    soft: "rgba(141,141,132,0.10)",
    border: "rgba(141,141,132,0.28)",
    order: 1,
    icon: "circle",
  },
  UNCOMMON: {
    value: "UNCOMMON",
    label: "Необычная",
    labelEn: "Uncommon",
    description: "Классические вкусы и региональные линейки.",
    color: "#60896c",
    soft: "rgba(96,137,108,0.11)",
    border: "rgba(96,137,108,0.32)",
    order: 2,
    icon: "diamond",
  },
  RARE: {
    value: "RARE",
    label: "Редкая",
    labelEn: "Rare",
    description: "Сильные форматы, лимитированные вкусы, старые партии.",
    color: "#4c86b8",
    soft: "rgba(76,134,184,0.11)",
    border: "rgba(76,134,184,0.34)",
    order: 3,
    icon: "gem",
  },
  EPIC: {
    value: "EPIC",
    label: "Эпическая",
    labelEn: "Epic",
    description: "Снятые с производства и коллекционные выпуски.",
    color: "#8267bd",
    soft: "rgba(130,103,189,0.12)",
    border: "rgba(130,103,189,0.36)",
    order: 4,
    icon: "sparkles",
  },
  LEGENDARY: {
    value: "LEGENDARY",
    label: "Легендарная",
    labelEn: "Legendary",
    description: "Исторические крышки, которые почти не встречаются.",
    color: "#b6812e",
    soft: "rgba(182,129,46,0.12)",
    border: "rgba(182,129,46,0.38)",
    order: 5,
    icon: "flame",
  },
  MYTHIC: {
    value: "MYTHIC",
    label: "Мифическая",
    labelEn: "Mythic",
    description: "Ультраредкие крышки с культовым статусом.",
    color: "#a45bbd",
    soft: "rgba(164,91,189,0.13)",
    border: "rgba(164,91,189,0.4)",
    order: 6,
    icon: "crown",
  },
};

export const RARITY_POINTS: Record<Rarity, number> = {
  UNDETERMINED: 2,
  COMMON: 5,
  UNCOMMON: 8,
  RARE: 15,
  EPIC: 30,
  LEGENDARY: 60,
  MYTHIC: 100,
};

export const RARITY_OPTIONS = RARITY_ORDER.filter((r) => r !== "UNDETERMINED").map((value) => ({
  value,
  label: RARITY_META[value].label,
}));

export function isRarity(value: string): value is Rarity {
  return value in RARITY_META;
}

export function rarityRank(rarity: Rarity): number {
  return RARITY_META[rarity].order;
}