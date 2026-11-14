import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toManufacturerDTO } from "@/lib/dto";
import { manufacturerPatchSchema } from "@/lib/admin-schemas";
import { syncManufacturerToItems, uniqueEntitySlug, uniqueStrings } from "@/lib/admin";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const { id } = await context.params;
    const data = manufacturerPatchSchema.parse(await request.json());

    const existing = await prisma.manufacturer.findUnique({ where: { id } });
    if (!existing) return jsonError("Производитель не найден.", 404, "NOT_FOUND");

    let slug = existing.slug;
    if (data.slug && data.slug !== existing.slug) {
      slug = await uniqueEntitySlug(data.slug, id);
    }

    const manufacturer = await prisma.manufacturer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        slug,
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.accent !== undefined ? { accent: data.accent } : {}),
        ...(data.aliases !== undefined
          ? { aliases: uniqueStrings([data.name ?? existing.name, ...data.aliases]) }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { _count: { select: { models: true, items: true } } },
    });

    if (data.name && data.name !== existing.name) {
      await syncManufacturerToItems(manufacturer);
    }

    return NextResponse.json({ manufacturer: toManufacturerDTO(manufacturer) });
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

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id },
      include: { _count: { select: { models: true, items: true } } },
    });
    if (!manufacturer) return jsonError("Производитель не найден.", 404, "NOT_FOUND");

    if (manufacturer._count.models > 0 || manufacturer._count.items > 0) {
      const updated = await prisma.manufacturer.update({
        where: { id },
        data: { isActive: false },
        include: { _count: { select: { models: true, items: true } } },
      });
      return NextResponse.json({
        manufacturer: toManufacturerDTO(updated),
        deactivated: true,
        message: "Производитель используется и переведён в архив.",
      });
    }

    await prisma.manufacturer.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}