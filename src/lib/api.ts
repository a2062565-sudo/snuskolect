import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodSchema } from "zod";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: message, code }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.status, error.code);
  }
  console.error("[api]", error);
  return jsonError("Внутренняя ошибка сервера. Попробуйте ещё раз.", 500, "INTERNAL");
}

export async function parseJson<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("Некорректный JSON в запросе", 400, "INVALID_JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Проверьте введённые данные";
    throw new ApiError(message, 422, "VALIDATION");
  }
  return parsed.data;
}

export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowed = new Set<string>([new URL(request.url).origin]);
  try {
    allowed.add(new URL(process.env.APP_URL || request.url).origin);
  } catch {
    // ignore malformed APP_URL
  }

  if (!allowed.has(origin)) {
    throw new ApiError("Запрос отклонён: неверный источник", 403, "CSRF");
  }
}

export async function requireAdminApi(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Нужна авторизация.", 401, "UNAUTHORIZED");
  if (user.role !== "ADMIN") throw new ApiError("Недостаточно прав.", 403, "FORBIDDEN");
  return user;
}

export async function requireStaffApi(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Нужна авторизация.", 401, "UNAUTHORIZED");
  if (user.role !== "SUPPORT" && user.role !== "ADMIN") {
    throw new ApiError("Недостаточно прав.", 403, "FORBIDDEN");
  }
  return user;
}

export function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function logEvent(
  type: string,
  data: { userId?: string | null; path?: string | null; meta?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await prisma.siteEvent.create({
      data: {
        type,
        userId: data.userId ?? null,
        path: data.path ?? null,
        meta: data.meta ? (data.meta as object) : undefined,
      },
    });
  } catch {
    // Analytics must never break the main action.
  }
}

export function parsePositiveInt(value: string | null, fallback: number, max = 100): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), max);
}