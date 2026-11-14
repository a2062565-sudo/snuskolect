import { createHash } from "crypto";
import sharp from "sharp";

export interface NormalizedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
  phash: string;
}

const MIN_DIMENSION = 240;

export async function normalizeUpload(input: Buffer): Promise<NormalizedImage> {
  const maxBytes = (Number(process.env.MAX_UPLOAD_MB ?? 12) || 12) * 1024 * 1024;
  if (!input.length) throw new Error("Файл пустой");
  if (input.length > maxBytes) {
    throw new Error(`Файл слишком большой. Максимум ${Math.round(maxBytes / 1024 / 1024)} МБ.`);
  }

  let result;
  try {
    result = await sharp(input, { failOn: "error", limitInputPixels: 50_000_000 })
      .rotate()
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new Error("Не удалось прочитать изображение. Поддерживаются JPEG, PNG, WebP и HEIC.");
  }

  if (result.info.width < MIN_DIMENSION || result.info.height < MIN_DIMENSION) {
    throw new Error("Фото слишком маленькое. Приблизьте камеру к крышке и попробуйте снова.");
  }

  const sha256 = createHash("sha256").update(result.data).digest("hex");
  const phash = await perceptualHash(result.data);

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    sha256,
    phash,
  };
}

async function perceptualHash(buffer: Buffer): Promise<string> {
  const raw = await sharp(buffer)
    .resize(9, 8, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  let bits = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits += raw[y * 9 + x] < raw[y * 9 + x + 1] ? "1" : "0";
    }
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
}

export function hammingDistance(a: string, b: string): number {
  try {
    let value = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
    let count = 0;
    while (value > 0n) {
      count += Number(value & 1n);
      value >>= 1n;
    }
    return count;
  } catch {
    return 64;
  }
}

export function isNearDuplicate(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return hammingDistance(a, b) <= 7;
}