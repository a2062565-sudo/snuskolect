import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  try {
    const user = await getCurrentUser();

    const { key: parts } = await context.params;
    const key = parts.join("/");
    if (!key.startsWith("items/") && !key.startsWith("scans/")) {
      return new NextResponse("Not found", { status: 404 });
    }

    const staff = Boolean(user && (user.role === "SUPPORT" || user.role === "ADMIN"));

    const item = await prisma.collectionItem.findFirst({
      where: { imageKey: key },
      select: {
        userId: true,
        user: { select: { isPublic: true } },
      },
    });

    if (item) {
      const canView =
        item.user.isPublic || Boolean(user && (staff || item.userId === user.id));
      if (!canView) return new NextResponse("Not found", { status: 404 });
      const object = await getObject(key);
      return new NextResponse(new Uint8Array(object.data), {
        headers: {
          "Content-Type": object.contentType,
          "Cache-Control": item.user.isPublic ? "public, max-age=3600" : "private, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!user) return new NextResponse("Not found", { status: 404 });

    const scan = await prisma.scan.findFirst({
      where: { imageKey: key },
      select: { userId: true },
    });

    if (!scan) return new NextResponse("Not found", { status: 404 });
    if (!staff && scan.userId !== user.id) return new NextResponse("Not found", { status: 404 });

    const object = await getObject(key);
    return new NextResponse(new Uint8Array(object.data), {
      headers: {
        "Content-Type": object.contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}