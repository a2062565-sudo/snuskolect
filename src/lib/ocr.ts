import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

export interface OcrCandidate {
  text: string;
  confidence: number;
  variant: "photo" | "binary";
}

export interface OcrResult {
  candidates: OcrCandidate[];
  text: string;
  confidence: number;
  languages: string[];
}

interface MinimalWorker {
  recognize: (image: Buffer) => Promise<{ data: { text: string; confidence: number } }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}

const globalForOcr = globalThis as unknown as {
  __kapsOcrWorker?: Promise<MinimalWorker>;
  __kapsOcrQueue?: Promise<unknown>;
};

function languages(): string[] {
  return (process.env.OCR_LANGS || "eng+rus")
    .split("+")
    .map((lang) => lang.trim())
    .filter(Boolean);
}

async function getWorker(): Promise<MinimalWorker> {
  if (!globalForOcr.__kapsOcrWorker) {
    globalForOcr.__kapsOcrWorker = (async () => {
      const cachePath = path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        process.env.OCR_CACHE_DIR || "storage/tesseract",
      );
      await mkdir(cachePath, { recursive: true });
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(languages(), 1, {
        cachePath,
        logger: () => undefined,
        errorHandler: (error: unknown) => {
          console.error("[ocr-worker]", error);
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: "6" as import("tesseract.js").PSM,
        preserve_interword_spaces: "1",
      });
      return worker as unknown as MinimalWorker;
    })();
  }
  return globalForOcr.__kapsOcrWorker;
}

async function preparePhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .grayscale()
    .normalize()
    .sharpen({ sigma: 0.8 })
    .resize(1800, 1800, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
}

async function prepareBinary(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .grayscale()
    .normalize()
    .threshold(175)
    .resize(1800, 1800, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
}

export async function recognizeImage(buffer: Buffer): Promise<OcrResult> {
  const previous = globalForOcr.__kapsOcrQueue ?? Promise.resolve();

  const job = previous.then(async () => {
    const worker = await getWorker();
    const [photo, binary] = await Promise.all([preparePhoto(buffer), prepareBinary(buffer)]);
    const candidates: OcrCandidate[] = [];

    // Two complementary preprocessing passes make OCR resilient to both
    // low-contrast photos and high-contrast printed lids.
    for (const [variant, image] of [
      ["photo", photo],
      ["binary", binary],
    ] as const) {
      const result = await worker.recognize(image);
      candidates.push({
        variant,
        text: result.data.text ?? "",
        confidence: result.data.confidence ?? 0,
      });
    }

    const best = [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
    return {
      candidates,
      text: best?.text ?? "",
      confidence: best?.confidence ?? 0,
      languages: languages(),
    };
  });

  globalForOcr.__kapsOcrQueue = job.catch(async () => {
    // Reset the worker after a failure so the next scan starts cleanly.
    try {
      const worker = await globalForOcr.__kapsOcrWorker;
      await worker?.terminate();
    } catch {
      // ignore
    }
    globalForOcr.__kapsOcrWorker = undefined;
  });

  return job;
}

export async function terminateOcr(): Promise<void> {
  try {
    const worker = await globalForOcr.__kapsOcrWorker;
    await worker?.terminate();
  } catch {
    // ignore
  } finally {
    globalForOcr.__kapsOcrWorker = undefined;
    globalForOcr.__kapsOcrQueue = undefined;
  }
}