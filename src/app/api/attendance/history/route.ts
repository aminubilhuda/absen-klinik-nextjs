export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;

  const where = { userId: session.user.id };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { tanggal: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, totalPages: Math.ceil(total / limit) });
}
