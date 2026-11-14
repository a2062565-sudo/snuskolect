import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logEvent } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({ path: z.string().min(1).max(240) });

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = schema.safeParse(payload);
    if (!parsed.success) return new NextResponse(null, { status: 204 });

    const user = await getCurrentUser();
    await logEvent("page_view", {
      userId: user?.id ?? null,
      path: parsed.data.path,
    });
  } catch {
    // Analytics should never surface errors to the client.
  }
  return new NextResponse(null, { status: 204 });
}