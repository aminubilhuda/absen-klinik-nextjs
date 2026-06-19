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

  const now = new Date();
  const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));
  const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));

  const awalBulan = new Date(year, month - 1, 1);
  const awalBulanBerikutnya = new Date(year, month, 1);

  const where: any = {
    userId: session.user.id,
    tanggal: { gte: awalBulan, lt: awalBulanBerikutnya },
  };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { tanggal: "desc" },
      skip,
      take: limit,
      include: {
        kategoriAbsensi: { select: { id: true, kode: true, keterangan: true, warnaLabel: true } },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, totalPages: Math.ceil(total / limit) });
}
