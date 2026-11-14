import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi, assertSameOrigin, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toManufacturerDTO } from "@/lib/dto";
import { manufacturerCreateSchema } from "@/lib/admin-schemas";
import { uniqueEntitySlug, uniqueStrings } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdminApi();
    const manufacturers = await prisma.manufacturer.findMany({
      include: { _count: { select: { models: true, items: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ manufacturers: manufacturers.map(toManufacturerDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireAdminApi();
    const data = manufacturerCreateSchema.parse(await request.json());

    const slug = await uniqueEntitySlug(data.slug || data.name);
    const manufacturer = await prisma.manufacturer.create({
      data: {
        name: data.name,
        slug,
        country: data.country,
        description: data.description,
        accent: data.accent,
        aliases: uniqueStrings([data.name, ...data.aliases]),
        isActive: data.isActive,
      },
      include: { _count: { select: { models: true, items: true } } },
    });

    return NextResponse.json({ manufacturer: toManufacturerDTO(manufacturer) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}