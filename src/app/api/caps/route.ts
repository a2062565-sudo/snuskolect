import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ApiError, assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { evaluateAchievements } from "@/lib/achievements";
import { getCollectionStats, itemInclude } from "@/lib/stats";
import { toItemDTO } from "@/lib/dto";
import type { ScanRecognition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  scanId: z.string().min(1).max(64),
  description: z.string().max(4000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Войдите через Telegram.", 401, "UNAUTHORIZED");

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Проверьте данные перед сохранением.", 422, "VALIDATION");
    }

    const scan = await prisma.scan.findUnique({ where: { id: parsed.data.scanId } });
    if (!scan || scan.userId !== user.id) {
      return jsonError("Скан не найден.", 404, "SCAN_NOT_FOUND");
    }
    if (scan.status !== "COMPLETED") {
      return jsonError("Этот скан уже использован или устарел. Сделайте новое фото.", 409, "SCAN_CONSUMED");
    }
    if (scan.expiresAt.getTime() < Date.now()) {
      return jsonError("Скан устарел. Сделайте новое фото крышки.", 410, "SCAN_EXPIRED");
    }

    const recognition = scan.recognition as unknown as ScanRecognition | null;
    if (!recognition) {
      return jsonError("Не удалось восстановить результат распознавания.", 409, "SCAN_INVALID");
    }

    let item;
    try {
      item = await prisma.$transaction(async (tx) => {
        const fresh = await tx.scan.findFirst({
          where: { id: scan.id, userId: user.id, status: "COMPLETED" },
        });
        if (!fresh) throw new ApiError("Скан уже использован.", 409, "SCAN_CONSUMED");

        const model = recognition.capModelId
          ? await tx.capModel.findUnique({
              where: { id: recognition.capModelId },
              include: { manufacturer: true },
            })
          : null;

        const manufacturer = model?.manufacturer
          ? model.manufacturer
          : recognition.manufacturerId
            ? await tx.manufacturer.findUnique({ where: { id: recognition.manufacturerId } })
            : null;

        const description =
          parsed.data.description?.trim().slice(0, 4000) || recognition.description.slice(0, 4000);

        const created = await tx.collectionItem.create({
          data: {
            userId: user.id,
            scanId: scan.id,
            manufacturerId: manufacturer?.id ?? null,
            capModelId: model?.id ?? null,
            manufacturerName: manufacturer?.name ?? null,
            brandName: model?.brand ?? null,
            productName: model?.name ?? null,
            flavor: model?.flavor ?? recognition.flavor,
            strength: model?.strength ?? recognition.strength,
            description,
            recognizedText: recognition.recognizedText,
            rarity: model?.rarity ?? "UNDETERMINED",
            imageUrl: scan.imageUrl,
            imageKey: scan.imageKey,
            imageHash: scan.imageHash,
            phash: scan.phash,
            ocrConfidence: recognition.confidence,
            isDemo: false,
          },
        });

        const updated = await tx.scan.updateMany({
          where: { id: scan.id, status: "COMPLETED" },
          data: { status: "CONSUMED" },
        });
        if (updated.count !== 1) throw new ApiError("Скан уже использован.", 409, "SCAN_CONSUMED");

        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return jsonError("Эта крышка уже есть в коллекции.", 409, "DUPLICATE_IMAGE");
      }
      throw error;
    }

    let newAchievements: Awaited<ReturnType<typeof evaluateAchievements>> = [];
    try {
      newAchievements = await evaluateAchievements(user.id);
    } catch (error) {
      console.error("[caps] achievement evaluation failed", error);
    }

    const [fullItem, stats] = await Promise.all([
      prisma.collectionItem.findUnique({ where: { id: item.id }, include: itemInclude }),
      getCollectionStats(user.id),
    ]);

    await logEvent("cap_added", {
      userId: user.id,
      meta: {
        itemId: item.id,
        rarity: item.rarity,
        manufacturerId: item.manufacturerId,
      },
    });

    return NextResponse.json(
      {
        item: fullItem ? toItemDTO(fullItem) : null,
        newAchievements,
        stats,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}