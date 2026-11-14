import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toItemDTO } from "@/lib/dto";
import { itemPatchSchema } from "@/lib/admin-schemas";
import { evaluateAchievements } from "@/lib/achievements";

export const runtime = "nodejs";

async function loadItem(id: string) {
  return prisma.collectionItem.findUnique({
    where: { id },
    include: {
      manufacturer: { select: { id: true, name: true, slug: true, accent: true } },
      capModel: { select: { id: true, brand: true, name: true, slug: true } },
      user: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          slug: true,
          isDemo: true,
        },
      },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;
    const data = itemPatchSchema.parse(await request.json());

    const existing = await loadItem(id);
    if (!existing) return jsonError("Крышка не найдена.", 404, "NOT_FOUND");

    const nextModelId = data.capModelId !== undefined ? data.capModelId : existing.capModelId;
    const model = nextModelId
      ? await prisma.capModel.findUnique({ where: { id: nextModelId }, include: { manufacturer: true } })
      : null;
    if (nextModelId && !model) return jsonError("Модель крышки не найдена.", 404, "MODEL_NOT_FOUND");

    const nextManufacturerId = model
      ? model.manufacturerId
      : data.manufacturerId !== undefined
        ? data.manufacturerId
        : existing.manufacturerId;
    const manufacturer = nextManufacturerId
      ? await prisma.manufacturer.findUnique({ where: { id: nextManufacturerId } })
      : null;
    if (nextManufacturerId && !manufacturer) {
      return jsonError("Производитель не найден.", 404, "MANUFACTURER_NOT_FOUND");
    }

    const rarity = model?.rarity ?? "UNDETERMINED";

    const updated = await prisma.collectionItem.update({
      where: { id },
      data: {
        manufacturerId: manufacturer?.id ?? null,
        capModelId: model?.id ?? null,
        manufacturerName: manufacturer?.name ?? null,
        rarity,
        ...(data.brandName !== undefined
          ? { brandName: data.brandName }
          : model
            ? { brandName: model.brand }
            : {}),
        ...(data.productName !== undefined
          ? { productName: data.productName }
          : model
            ? { productName: model.name }
            : {}),
        ...(data.flavor !== undefined
          ? { flavor: data.flavor }
          : model
            ? { flavor: model.flavor }
            : {}),
        ...(data.strength !== undefined
          ? { strength: data.strength }
          : model
            ? { strength: model.strength }
            : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.recognizedText !== undefined ? { recognizedText: data.recognizedText } : {}),
      },
      include: {
        manufacturer: { select: { id: true, name: true, slug: true, accent: true } },
        capModel: { select: { id: true, brand: true, name: true, slug: true } },
        user: {
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            slug: true,
            isDemo: true,
          },
        },
      },
    });

    if (existing.user.isDemo === false) {
      await prisma.notification.create({
        data: {
          userId: existing.userId,
          type: "catalog",
          title: "Карточка крышки обновлена",
          body: "Администратор уточнил данные в вашей коллекции.",
          href: `/collection/${id}`,
        },
      });
    }

    let newAchievements: Awaited<ReturnType<typeof evaluateAchievements>> = [];
    try {
      newAchievements = await evaluateAchievements(existing.userId);
    } catch (error) {
      console.error("[admin] achievement evaluation failed", error);
    }

    return NextResponse.json({
      item: toItemDTO(updated),
      newAchievements,
      user: {
        id: updated.user.id,
        displayName:
          updated.user.displayName ||
          [updated.user.firstName, updated.user.lastName].filter(Boolean).join(" ") ||
          "Коллекционер",
        slug: updated.user.slug,
        isDemo: updated.user.isDemo,
      },
    });
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
    const existing = await prisma.collectionItem.findUnique({ where: { id } });
    if (!existing) return jsonError("Крышка не найдена.", 404, "NOT_FOUND");

    await prisma.collectionItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}