import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";
import { assertSameOrigin, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}