import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { ApiError, assertSameOrigin, handleApiError, jsonError, logEvent } from "@/lib/api";
import { isNearDuplicate, normalizeUpload } from "@/lib/image";
import { getCatalog } from "@/lib/catalog";
import { recognizeImage } from "@/lib/ocr";
import { recognizeCatalogText, type RecognitionOutcome } from "@/lib/recognition";
import { analyzeImageWithVision, isVisionConfigured } from "@/lib/vision";
import { imageUrlForKey, newImageKey, putObject, deleteObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { ScanRecognition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function rankOutcome(outcome: RecognitionOutcome): number {
  if (!outcome.reliable) return Number.NEGATIVE_INFINITY;
  const recognition = outcome.recognition;
  let score = 0;
  if (recognition.capModelId) score += 1000;
  else if (recognition.manufacturerId) score += 500;
  if (recognition.matchedAlias) score += 150;
  score += recognition.confidence * 2;
  score += Math.min(100, recognition.recognizedText.length) * 0.2;
  return score;
}

function better(a: RecognitionOutcome, b: RecognitionOutcome): RecognitionOutcome {
  return rankOutcome(a) >= rankOutcome(b) ? a : b;
}

export async function POST(request: NextRequest) {
  let storedKey: string | null = null;
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) return jsonError("Войдите через Telegram, чтобы добавить крышку.", 401, "UNAUTHORIZED");

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentScans = await prisma.scan.count({
      where: { userId: user.id, createdAt: { gte: hourAgo } },
    });
    if (recentScans >= 40) {
      return jsonError("Слишком много сканирований за час. Попробуйте позже.", 429, "RATE_LIMITED");
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Отправьте фотографию в формате multipart/form-data.", 415, "INVALID_CONTENT_TYPE");
    }

    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string") {
      return jsonError("Фотография не найдена в запросе.", 400, "NO_IMAGE");
    }

    const maxBytes = (Number(process.env.MAX_UPLOAD_MB ?? 12) || 12) * 1024 * 1024;
    if (file.size > maxBytes) {
      return jsonError(`Фотография больше ${Math.round(maxBytes / 1024 / 1024)} МБ.`, 413, "FILE_TOO_LARGE");
    }

    const arrayBuffer = await file.arrayBuffer();
    let normalized;
    try {
      normalized = await normalizeUpload(Buffer.from(arrayBuffer));
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Не удалось обработать фото", 422, "INVALID_IMAGE");
    }

    const [existingItem, existingScan, recentItems, recentScansWithHash] = await Promise.all([
      prisma.collectionItem.findUnique({
        where: { userId_imageHash: { userId: user.id, imageHash: normalized.sha256 } },
        select: { id: true },
      }),
      prisma.scan.findFirst({
        where: { userId: user.id, imageHash: normalized.sha256 },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.collectionItem.findMany({
        where: { userId: user.id, phash: { not: null } },
        select: { phash: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
      prisma.scan.findMany({
        where: { userId: user.id, phash: { not: null } },
        select: { phash: true },
        orderBy: { createdAt: "desc" },
        take: 250,
      }),
    ]);

    if (existingItem || existingScan) {
      return jsonError("Эта фотография уже добавлена в коллекцию или уже сканировалась.", 409, "DUPLICATE_IMAGE");
    }

    const allHashes = [...recentItems, ...recentScansWithHash]
      .map((row) => row.phash)
      .filter((hash): hash is string => Boolean(hash));
    if (allHashes.some((hash) => isNearDuplicate(hash, normalized.phash))) {
      return jsonError(
        "Похоже, эта крышка уже есть в коллекции. Добавьте другое фото или другую крышку.",
        409,
        "DUPLICATE_IMAGE",
      );
    }

    const catalog = await getCatalog();

    let ocr;
    try {
      ocr = await recognizeImage(normalized.buffer);
    } catch (error) {
      console.error("[scan] OCR failed", error);
      return jsonError(
        "Сервис распознавания временно недоступен. Попробуйте ещё раз через минуту.",
        503,
        "OCR_UNAVAILABLE",
      );
    }

    let candidates = ocr.candidates.map((candidate) =>
      recognizeCatalogText(candidate.text, {
        catalog,
        confidence: candidate.confidence,
        source: "tesseract",
      }),
    );

    let best = candidates.reduce(better);

    // Optional AI fallback: only when local OCR did not find a catalog match.
    if (!best.recognition.capModelId && !best.recognition.manufacturerId && isVisionConfigured()) {
      const vision = await analyzeImageWithVision(normalized.buffer);
      if (vision) {
        const combinedText = [ocr.text, vision.text, vision.manufacturer, vision.brand, vision.flavor, vision.strength]
          .filter((part) => part && part.trim().length > 0)
          .join("\n");
        const visionOutcome = recognizeCatalogText(combinedText, {
          catalog,
          confidence: Math.max(70, best.recognition.confidence),
          source: ocr.text.trim() ? "mixed" : "vision",
        });
        candidates = [...candidates, visionOutcome];
        best = better(best, visionOutcome);
      }
    }

    if (!best.reliable) {
      return jsonError(
        best.failureReason ??
          "Крышка не распознана. Сделайте чёткое фото без бликов, чтобы текст был читаемым.",
        422,
        "CAP_NOT_RECOGNIZED",
      );
    }

    const key = newImageKey("scans", user.id);
    await putObject(key, normalized.buffer, "image/jpeg");
    storedKey = key;

    const imageUrl = imageUrlForKey(key);
    const recognition: ScanRecognition = best.recognition;
    const scan = await prisma.scan.create({
      data: {
        userId: user.id,
        imageKey: key,
        imageUrl,
        imageHash: normalized.sha256,
        phash: normalized.phash,
        ocrText: recognition.recognizedText,
        ocrConfidence: recognition.confidence,
        rawOcr: {
          candidates: ocr.candidates.map((candidate) => ({
            variant: candidate.variant,
            confidence: Math.round(candidate.confidence),
            text: candidate.text.slice(0, 1200),
          })),
          visionUsed: candidates.some((candidate) => candidate.recognition.source === "vision" || candidate.recognition.source === "mixed"),
        } as Prisma.InputJsonValue,
        recognition: recognition as unknown as Prisma.InputJsonValue,
        status: "COMPLETED",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await logEvent("scan", {
      userId: user.id,
      meta: { manufacturerId: recognition.manufacturerId, modelId: recognition.capModelId },
    });

    return NextResponse.json(
      {
        scanId: scan.id,
        imageUrl,
        recognition,
      },
      { status: 201 },
    );
  } catch (error) {
    if (storedKey) await deleteObject(storedKey);
    return handleApiError(error);
  }
}