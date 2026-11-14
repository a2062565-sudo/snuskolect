import { prisma } from "./prisma";
import type { Rarity } from "./types";
import type { CatalogManufacturer } from "./recognition";

export async function getCatalog(): Promise<CatalogManufacturer[]> {
  const manufacturers = await prisma.manufacturer.findMany({
    where: { isActive: true },
    include: { models: { where: { isActive: true } } },
  });

  return manufacturers.map((manufacturer) => ({
    id: manufacturer.id,
    name: manufacturer.name,
    aliases: manufacturer.aliases,
    models: manufacturer.models.map((model) => ({
      id: model.id,
      brand: model.brand,
      name: model.name,
      rarity: model.rarity as Rarity,
      flavor: model.flavor,
      strength: model.strength,
      description: model.description,
      aliases: model.aliases,
      keywords: model.keywords,
    })),
  }));
}