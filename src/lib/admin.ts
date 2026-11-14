import type { Manufacturer, Role } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluateAchievements } from "./achievements";
import { slugify } from "./slug";
import { randomBytes } from "crypto";

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export async function uniqueEntitySlug(desired: string, excludeId?: string): Promise<string> {
  const base = slugify(desired).slice(0, 60) || "item";
  let candidate = base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const [manufacturer, model] = await Promise.all([
      prisma.manufacturer.findUnique({ where: { slug: candidate }, select: { id: true } }),
      prisma.capModel.findUnique({ where: { slug: candidate }, select: { id: true } }),
    ]);
    const conflict = [manufacturer, model].some((entry) => entry && entry.id !== excludeId);
    if (!conflict) return candidate;
    candidate = `${base}-${randomBytes(2).toString("hex")}`;
  }
  return `${base}-${randomBytes(6).toString("hex")}`;
}

export async function syncModelToItems(modelId: string): Promise<string[]> {
  const model = await prisma.capModel.findUnique({
    where: { id: modelId },
    include: { manufacturer: true },
  });
  if (!model) return [];

  const affected = await prisma.collectionItem.findMany({
    where: { capModelId: modelId },
    select: { userId: true },
    distinct: ["userId"],
  });

  await prisma.collectionItem.updateMany({
    where: { capModelId: modelId },
    data: {
      manufacturerId: model.manufacturerId,
      manufacturerName: model.manufacturer.name,
      brandName: model.brand,
      productName: model.name,
      flavor: model.flavor,
      strength: model.strength,
      rarity: model.rarity,
    },
  });

  return affected.map((entry) => entry.userId);
}

export async function evaluateUsers(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    try {
      await evaluateAchievements(userId);
    } catch (error) {
      console.error("[admin] achievement re-evaluation failed", error);
    }
  }
}

export async function syncManufacturerToItems(manufacturer: Manufacturer): Promise<void> {
  await prisma.collectionItem.updateMany({
    where: { manufacturerId: manufacturer.id },
    data: { manufacturerName: manufacturer.name },
  });
}

export function roleNotification(role: Role): { title: string; body: string } {
  if (role === "ADMIN") {
    return {
      title: "Роль Admin назначена",
      body: "Вам открыт полный доступ к панели администратора KAPS.",
    };
  }
  if (role === "SUPPORT") {
    return {
      title: "Роль Support назначена",
      body: "Вам открыт доступ к обращениям пользователей.",
    };
  }
  return {
    title: "Роль обновлена",
    body: "Ваша роль на сайте изменена администратором.",
  };
}