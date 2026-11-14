import {
  Award,
  CircleDot,
  Compass,
  Crown,
  Diamond,
  Flame,
  Gem,
  Globe2,
  Layers,
  Map,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  layers: Layers,
  compass: Compass,
  award: Award,
  flame: Flame,
  gem: Gem,
  map: Map,
  crown: Crown,
  diamond: Diamond,
  globe: Globe2,
  trophy: Trophy,
  star: Star,
  circle: CircleDot,
};

export function AchievementIcon({
  icon,
  size = 20,
  strokeWidth = 1.9,
}: {
  icon: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = MAP[icon] ?? Award;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
}

export const ACHIEVEMENT_ICON_OPTIONS = [
  "award",
  "sparkles",
  "layers",
  "compass",
  "flame",
  "gem",
  "map",
  "crown",
  "diamond",
  "globe",
  "trophy",
  "star",
];
