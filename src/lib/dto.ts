import type {
  Achievement,
  CapModel,
  CollectionItem,
  Manufacturer,
  Notification,
  Role,
  SupportMessage,
  SupportTicket,
  User,
  UserAchievement,
} from "@prisma/client";
import type {
  AchievementDTO,
  AdminUserDTO,
  CapModelDTO,
  ItemDTO,
  ManufacturerDTO,
  NotificationDTO,
  PublicUserDTO,
  Rarity,
  Role as AppRole,
  TicketDetailDTO,
  TicketMessageDTO,
  TicketSummaryDTO,
} from "./types";

type ItemWithRelations = CollectionItem & {
  manufacturer?: Pick<Manufacturer, "id" | "name" | "slug" | "accent"> | null;
  capModel?: Pick<CapModel, "id" | "brand" | "name" | "slug"> | null;
};

export function displayNameFor(user: Pick<User, "displayName" | "firstName" | "lastName">): string {
  return (
    user.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "Коллекционер"
  );
}

export function toPublicUserDTO(user: User): PublicUserDTO {
  return {
    id: user.id,
    displayName: displayNameFor(user),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    slug: user.slug,
    photoUrl: user.photoUrl,
    role: user.role as AppRole,
    isPublic: user.isPublic,
    isDemo: user.isDemo,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toItemDTO(item: ItemWithRelations): ItemDTO {
  return {
    id: item.id,
    userId: item.userId,
    manufacturerId: item.manufacturerId,
    capModelId: item.capModelId,
    manufacturerName: item.manufacturerName ?? item.manufacturer?.name ?? null,
    brandName: item.brandName ?? item.capModel?.brand ?? null,
    productName: item.productName ?? item.capModel?.name ?? null,
    flavor: item.flavor,
    strength: item.strength,
    description: item.description,
    recognizedText: item.recognizedText,
    rarity: item.rarity as Rarity,
    imageUrl: item.imageUrl,
    ocrConfidence: item.ocrConfidence,
    isDemo: item.isDemo,
    createdAt: item.createdAt.toISOString(),
    manufacturer: item.manufacturer
      ? {
          id: item.manufacturer.id,
          name: item.manufacturer.name,
          slug: item.manufacturer.slug,
          accent: item.manufacturer.accent,
        }
      : null,
    capModel: item.capModel
      ? {
          id: item.capModel.id,
          brand: item.capModel.brand,
          name: item.capModel.name,
          slug: item.capModel.slug,
        }
      : null,
  };
}

export function toAchievementDTO(
  achievement: Achievement,
  unlocked: UserAchievement | null,
  progress: number,
): AchievementDTO {
  return {
    id: achievement.id,
    key: achievement.key,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
    metric: achievement.metric,
    target: achievement.target,
    rarity: (achievement.rarity as Rarity | null) ?? null,
    sortOrder: achievement.sortOrder,
    unlocked: Boolean(unlocked),
    unlockedAt: unlocked?.unlockedAt.toISOString() ?? null,
    progress: Math.min(progress, achievement.target),
  };
}

export function toNotificationDTO(notification: Notification): NotificationDTO {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    read: Boolean(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toManufacturerDTO(
  manufacturer: Manufacturer & { _count?: { models?: number; items?: number } },
): ManufacturerDTO {
  return {
    id: manufacturer.id,
    slug: manufacturer.slug,
    name: manufacturer.name,
    country: manufacturer.country,
    description: manufacturer.description,
    accent: manufacturer.accent,
    aliases: manufacturer.aliases,
    isActive: manufacturer.isActive,
    modelCount: manufacturer._count?.models,
    itemCount: manufacturer._count?.items,
  };
}

export function toCapModelDTO(
  model: CapModel & { manufacturer: Pick<Manufacturer, "name">; _count?: { items?: number } },
): CapModelDTO {
  return {
    id: model.id,
    slug: model.slug,
    brand: model.brand,
    name: model.name,
    manufacturerId: model.manufacturerId,
    manufacturerName: model.manufacturer.name,
    rarity: model.rarity as Rarity,
    flavor: model.flavor,
    strength: model.strength,
    description: model.description,
    aliases: model.aliases,
    keywords: model.keywords,
    releaseYear: model.releaseYear,
    isLimited: model.isLimited,
    isActive: model.isActive,
    itemCount: model._count?.items,
  };
}

type AdminUserWithCounts = User & {
  _count: { collection: number; achievements: number };
};

export function toAdminUserDTO(user: AdminUserWithCounts): AdminUserDTO {
  return {
    id: user.id,
    telegramId: user.telegramId,
    displayName: displayNameFor(user),
    username: user.username,
    slug: user.slug,
    role: user.role as AppRole,
    isPublic: user.isPublic,
    isDemo: user.isDemo,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    caps: user._count.collection,
    achievements: user._count.achievements,
  };
}

type TicketWithRelations = SupportTicket & {
  user: Pick<User, "firstName" | "lastName" | "displayName" | "slug">;
  assignedTo: Pick<User, "firstName" | "lastName" | "displayName"> | null;
  _count?: { messages: number };
  messages?: Pick<SupportMessage, "body" | "createdAt">[];
};

export function toTicketSummaryDTO(ticket: TicketWithRelations): TicketSummaryDTO {
  const preview = ticket.messages?.[0]?.body?.replace(/\s+/g, " ").slice(0, 110) ?? "";
  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    preview,
    userName: displayNameFor(ticket.user),
    userSlug: ticket.user.slug,
    assignedToName: ticket.assignedTo ? displayNameFor(ticket.assignedTo) : null,
    messageCount: ticket._count?.messages ?? 0,
  };
}

type MessageWithAuthor = SupportMessage & {
  author?: Pick<User, "firstName" | "lastName" | "displayName"> | null;
};

export function toTicketMessageDTO(message: MessageWithAuthor): TicketMessageDTO {
  return {
    id: message.id,
    authorRole: message.authorRole,
    authorName: message.author ? displayNameFor(message.author) : null,
    body: message.body,
    viaBot: message.viaBot,
    createdAt: message.createdAt.toISOString(),
  };
}

export function toTicketDetailDTO(
  ticket: TicketWithRelations & {
    messages: MessageWithAuthor[];
  },
): TicketDetailDTO {
  return {
    ...toTicketSummaryDTO(ticket),
    userId: ticket.userId,
    messages: ticket.messages.map(toTicketMessageDTO),
  };
}

export function roleLabel(role: Role | AppRole): string {
  if (role === "ADMIN") return "Admin";
  if (role === "SUPPORT") return "Support";
  return "User";
}