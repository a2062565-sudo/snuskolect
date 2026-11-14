import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toCapModelDTO } from "@/lib/dto";
import { capModelPatchSchema } from "@/lib/admin-schemas";
import { evaluateUsers, syncModelToItems, uniqueEntitySlug, uniqueStrings } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;
    const data = capModelPatchSchema.parse(await request.json());

    const existing = await prisma.capModel.findUnique({ where: { id } });
    if (!existing) return jsonError("Модель не найдена.", 404, "NOT_FOUND");

    if (data.manufacturerId) {
      const manufacturer = await prisma.manufacturer.findUnique({
        where: { id: data.manufacturerId },
        select: { id: true },
      });
      if (!manufacturer) return jsonError("Производитель не найден.", 404, "MANUFACTURER_NOT_FOUND");
    }

    let slug = existing.slug;
    if (data.slug && data.slug !== existing.slug) {
      slug = await uniqueEntitySlug(data.slug, id);
    }

    const brand = data.brand ?? existing.brand;
    const name = data.name ?? existing.name;

    const model = await prisma.capModel.update({
      where: { id },
      data: {
        ...(data.manufacturerId !== undefined ? { manufacturerId: data.manufacturerId } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        slug,
        ...(data.rarity !== undefined ? { rarity: data.rarity } : {}),
        ...(data.flavor !== undefined ? { flavor: data.flavor } : {}),
        ...(data.strength !== undefined ? { strength: data.strength } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.aliases !== undefined
          ? { aliases: uniqueStrings([`${brand} ${name}`, ...data.aliases]) }
          : {}),
        ...(data.keywords !== undefined
          ? { keywords: uniqueStrings([brand, name, ...data.keywords]) }
          : {}),
        ...(data.releaseYear !== undefined ? { releaseYear: data.releaseYear } : {}),
        ...(data.isLimited !== undefined ? { isLimited: data.isLimited } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        manufacturer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    const affectedUsers = await syncModelToItems(id);
    await evaluateUsers(affectedUsers);

    return NextResponse.json({ model: toCapModelDTO(model) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;

    const model = await prisma.capModel.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!model) return jsonError("Модель не найдена.", 404, "NOT_FOUND");

    if (model._count.items > 0) {
      const updated = await prisma.capModel.update({
        where: { id },
        data: { isActive: false },
        include: {
          manufacturer: { select: { name: true } },
          _count: { select: { items: true } },
        },
      });
      return NextResponse.json({
        model: toCapModelDTO(updated),
        deactivated: true,
        message: "Крышка используется в коллекциях и переведена в архив.",
      });
    }

    await prisma.capModel.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}