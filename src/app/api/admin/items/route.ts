import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAdminApi, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toItemDTO } from "@/lib/dto";
import { displayNameFor } from "@/lib/dto";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi();
    const params = request.nextUrl.searchParams;
    const search = params.get("search")?.trim() ?? "";
    const userId = params.get("userId")?.trim() ?? "";
    const rarity = params.get("rarity")?.trim() ?? "";
    const demo = params.get("demo");

    const where: Prisma.CollectionItemWhereInput = {
      ...(userId ? { userId } : {}),
      ...(rarity && ["UNDETERMINED", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(rarity)
        ? { rarity: rarity as Prisma.EnumRarityFilter["equals"] }
        : {}),
      ...(demo === "true" ? { isDemo: true } : demo === "false" ? { isDemo: false } : {}),
      ...(search
        ? {
            OR: [
              { brandName: { contains: search, mode: "insensitive" } },
              { productName: { contains: search, mode: "insensitive" } },
              { manufacturerName: { contains: search, mode: "insensitive" } },
              { recognizedText: { contains: search, mode: "insensitive" } },
              { user: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const items = await prisma.collectionItem.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      items: items.map((item) => ({
        ...toItemDTO(item),
        user: {
          id: item.user.id,
          displayName: displayNameFor(item.user),
          slug: item.user.slug,
          isDemo: item.user.isDemo,
        },
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}