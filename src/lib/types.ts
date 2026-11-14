export type Role = "USER" | "SUPPORT" | "ADMIN";

export type Rarity =
  | "UNDETERMINED"
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

export type ThemePreset = "light" | "dark" | "midnight" | "graphite" | "aurora" | "custom";

export interface CustomThemeValues {
  primary: string;
  accent: string;
  background: string;
  card: string;
  radius: number;
}

export interface ThemeSettings {
  preset: ThemePreset;
  custom: CustomThemeValues;
}

export interface PublicUserDTO {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  slug: string;
  photoUrl: string | null;
  role: Role;
  isPublic: boolean;
  isDemo: boolean;
  createdAt: string;
}

export interface ItemDTO {
  id: string;
  userId: string;
  manufacturerId: string | null;
  capModelId: string | null;
  manufacturerName: string | null;
  brandName: string | null;
  productName: string | null;
  flavor: string | null;
  strength: string | null;
  description: string | null;
  recognizedText: string | null;
  rarity: Rarity;
  imageUrl: string;
  ocrConfidence: number | null;
  isDemo: boolean;
  createdAt: string;
  manufacturer: {
    id: string;
    name: string;
    slug: string;
    accent: string | null;
  } | null;
  capModel: {
    id: string;
    brand: string;
    name: string;
    slug: string;
  } | null;
}

export interface AchievementDTO {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  metric: "CAP_COUNT" | "RARITY_COUNT" | "MANUFACTURER_COUNT";
  target: number;
  rarity: Rarity | null;
  sortOrder: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

export interface CollectorLevel {
  level: number;
  title: string;
  totalXp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  progress: number;
  nextTitle: string | null;
}

export interface UserStatsDTO {
  totalCaps: number;
  uniqueModels: number;
  catalogTotal: number;
  progress: number;
  manufacturerCount: number;
  achievementCount: number;
  rarityCounts: Record<Rarity, number>;
  level: CollectorLevel;
  rarest: ItemDTO | null;
  firstAddedAt: string | null;
  lastAddedAt: string | null;
  daysCollecting: number;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface TicketSummaryDTO {
  id: string;
  subject: string;
  status: "OPEN" | "ANSWERED" | "RESOLVED";
  createdAt: string;
  lastMessageAt: string;
  preview: string;
  userName: string;
  userSlug: string;
  assignedToName: string | null;
  messageCount: number;
}

export interface TicketMessageDTO {
  id: string;
  authorRole: "USER" | "SUPPORT" | "ADMIN" | "SYSTEM";
  authorName: string | null;
  body: string;
  viaBot: boolean;
  createdAt: string;
}

export interface TicketDetailDTO extends TicketSummaryDTO {
  userId: string;
  messages: TicketMessageDTO[];
}

export interface ManufacturerDTO {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  description: string | null;
  accent: string;
  aliases: string[];
  isActive: boolean;
  modelCount?: number;
  itemCount?: number;
}

export interface CapModelDTO {
  id: string;
  slug: string;
  brand: string;
  name: string;
  manufacturerId: string;
  manufacturerName: string;
  rarity: Rarity;
  flavor: string | null;
  strength: string | null;
  description: string | null;
  aliases: string[];
  keywords: string[];
  releaseYear: number | null;
  isLimited: boolean;
  isActive: boolean;
  itemCount?: number;
}

export interface AdminUserDTO {
  id: string;
  telegramId: string;
  displayName: string;
  username: string | null;
  slug: string;
  role: Role;
  isPublic: boolean;
  isDemo: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  caps: number;
  achievements: number;
}

export interface AdminItemDTO extends ItemDTO {
  user: {
    id: string;
    displayName: string;
    slug: string;
    isDemo: boolean;
  };
}

export interface AdminAchievementDTO extends AchievementDTO {
  isActive: boolean;
  unlockedCount: number;
}

export interface AdminStatsDTO {
  realUsers: number;
  demoUsers: number;
  totalCaps: number;
  demoCaps: number;
  catalogModels: number;
  openTickets: number;
  scansToday: number;
  pageViewsToday: number;
  pageViews7d: number;
  chart: { date: string; label: string; pageViews: number; signups: number; caps: number }[];
  rarity: Record<Rarity, number>;
  recentUsers: AdminUserDTO[];
  recentCaps: AdminItemDTO[];
  topManufacturers: { name: string; count: number; accent: string }[];
}

export interface ScanRecognition {
  manufacturerId: string | null;
  manufacturerName: string | null;
  capModelId: string | null;
  brandName: string | null;
  productName: string | null;
  flavor: string | null;
  strength: string | null;
  rarity: Rarity;
  description: string;
  recognizedText: string;
  confidence: number;
  warning: string | null;
  matchedAlias: string | null;
  source: "tesseract" | "vision" | "mixed";
}

export interface ScanResultDTO {
  scanId: string;
  imageUrl: string;
  recognition: ScanRecognition;
}