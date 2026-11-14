import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toCapModelDTO } from "@/lib/dto";
import { capModelCreateSchema } from "@/lib/admin-schemas";
import { uniqueEntitySlug, uniqueStrings } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const models = await prisma.capModel.findMany({
      where: search
        ? {
            OR: [
              { brand: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { manufacturer: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: {
        manufacturer: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ manufacturer: { name: "asc" } }, { name: "asc" }],
      take: 300,
    });
    return NextResponse.json({ models: models.map(toCapModelDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const data = capModelCreateSchema.parse(await request.json());

    const manufacturer = await prisma.manufacturer.findUnique({
      where: { id: data.manufacturerId },
    });
    if (!manufacturer) return jsonError("Производитель не найден.", 404, "MANUFACTURER_NOT_FOUND");

    const slug = await uniqueEntitySlug(data.slug || `${data.brand} ${data.name}`);
    const model = await prisma.capModel.create({
      data: {
        manufacturerId: data.manufacturerId,
        slug,
        brand: data.brand,
        name: data.name,
        rarity: data.rarity,
        flavor: data.flavor,
        strength: data.strength,
        description: data.description,
        aliases: uniqueStrings([`${data.brand} ${data.name}`, ...data.aliases]),
        keywords: uniqueStrings([data.brand, data.name, ...data.keywords]),
        releaseYear: data.releaseYear ?? null,
        isLimited: data.isLimited,
        isActive: data.isActive,
      },
      include: {
        manufacturer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json({ model: toCapModelDTO(model) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}