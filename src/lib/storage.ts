import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function s3Enabled(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return s3Client;
}

function uploadRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || "storage/uploads");
}

function localPath(key: string): string {
  const root = uploadRoot();
  const resolved = path.resolve(/* turbopackIgnore: true */ root, key);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Недопустимый ключ файла");
  }
  return resolved;
}

function mimeForKey(key: string): string {
  const ext = path.extname(key).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export function isS3Storage(): boolean {
  return s3Enabled();
}

export async function putObject(key: string, data: Buffer, contentType = "image/jpeg"): Promise<void> {
  if (s3Enabled()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
        CacheControl: "private, max-age=31536000",
      }),
    );
    return;
  }

  const filePath = localPath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export async function getObject(key: string): Promise<{ data: Buffer; contentType: string }> {
  if (s3Enabled()) {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    if (!result.Body) throw new Error("Файл не найден");
    const bytes = await result.Body.transformToByteArray();
    return {
      data: Buffer.from(bytes),
      contentType: result.ContentType || mimeForKey(key),
    };
  }

  const data = await readFile(localPath(key));
  return { data, contentType: mimeForKey(key) };
}

export async function deleteObject(key: string): Promise<void> {
  try {
    if (s3Enabled()) {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
      );
      return;
    }
    await unlink(localPath(key));
  } catch {
    // File may already be gone.
  }
}

export function imageUrlForKey(key: string): string {
  return `/api/media/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function newImageKey(prefix: "scans" | "items", userId: string): string {
  return `${prefix}/${userId}/${crypto.randomUUID()}.jpg`;
}