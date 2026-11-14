import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет должен быть в формате #RRGGBB");
const text = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null));

const stringArray = z
  .array(z.string().trim().min(1).max(80))
  .max(80)
  .optional()
  .default([]);

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис")
  .min(2)
  .max(80);

export const manufacturerPatchSchema = z.object({
  name: z.string().trim().min(2, "Введите название").max(80).optional(),
  slug: slug.optional(),
  country: text(80),
  description: text(1200),
  accent: hex.optional(),
  aliases: stringArray.optional(),
  isActive: z.boolean().optional(),
});

export const manufacturerCreateSchema = z.object({
  name: z.string().trim().min(2, "Введите название").max(80),
  slug: slug.optional(),
  country: text(80),
  description: text(1200),
  accent: hex.optional().default("#77776f"),
  aliases: stringArray,
  isActive: z.boolean().optional().default(true),
});

export const capModelPatchSchema = z.object({
  manufacturerId: z.string().min(1).optional(),
  brand: z.string().trim().min(1, "Введите бренд").max(60).optional(),
  name: z.string().trim().min(1, "Введите название").max(80).optional(),
  slug: slug.optional(),
  rarity: z.enum(["UNDETERMINED", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]).optional(),
  flavor: text(80),
  strength: text(80),
  description: text(2000),
  aliases: stringArray.optional(),
  keywords: stringArray.optional(),
  releaseYear: z.number().int().min(1800).max(2100).nullable().optional(),
  isLimited: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const capModelCreateSchema = z.object({
  manufacturerId: z.string().min(1, "Выберите производителя"),
  brand: z.string().trim().min(1, "Введите бренд").max(60),
  name: z.string().trim().min(1, "Введите название").max(80),
  slug: slug.optional(),
  rarity: z.enum(["UNDETERMINED", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"]).default("UNDETERMINED"),
  flavor: text(80),
  strength: text(80),
  description: text(2000),
  aliases: stringArray,
  keywords: stringArray,
  releaseYear: z.number().int().min(1800).max(2100).nullable().optional(),
  isLimited: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const itemPatchSchema = z.object({
  manufacturerId: z.string().nullable().optional(),
  capModelId: z.string().nullable().optional(),
  brandName: text(80),
  productName: text(120),
  flavor: text(80),
  strength: text(80),
  description: text(4000),
  recognizedText: text(4000),
});

const achievementRarity = z
  .enum(["UNDETERMINED", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"])
  .nullable();

export const achievementPatchSchema = z.object({
  key: slug.optional(),
  title: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(2).max(500).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  metric: z.enum(["CAP_COUNT", "RARITY_COUNT", "MANUFACTURER_COUNT"]).optional(),
  target: z.number().int().min(1).max(1000).optional(),
  rarity: achievementRarity.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

export const achievementCreateSchema = z.object({
  key: slug,
  title: z.string().trim().min(2, "Введите название").max(80),
  description: z.string().trim().min(2, "Введите описание").max(500),
  icon: z.string().trim().min(1).max(40).default("award"),
  metric: z.enum(["CAP_COUNT", "RARITY_COUNT", "MANUFACTURER_COUNT"]).default("CAP_COUNT"),
  target: z.number().int().min(1).max(1000).default(1),
  rarity: achievementRarity.optional().default(null),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const userRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "SUPPORT", "ADMIN"]),
});