export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { tahun } = body;
    const year = tahun || new Date().getFullYear();

    const res = await fetch(`https://api-hari-libur.vercel.app/api?year=${year}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Gagal mengambil data dari API eksternal" }, { status: 502 });
    }

    const result = await res.json();
    const holidays = result?.data || [];

    if (holidays.length === 0) {
      return NextResponse.json({ error: "Tidak ada data libur dari API" }, { status: 404 });
    }

    let synced = 0;
    const syncedDateKeys = new Set<string>();

    for (const h of holidays) {
      try {
        await prisma.hariLibur.upsert({
          where: { tanggal: new Date(h.date) },
          create: { tanggal: new Date(h.date), keterangan: h.description },
          update: { keterangan: h.description },
        });
        synced++;
        syncedDateKeys.add(h.date);
      } catch {
        // skip duplicate
      }
    }

    const targetYear = typeof year === "number" ? year : parseInt(year);
    if (!isNaN(targetYear)) {
      const existing = await prisma.hariLibur.findMany({
        where: {
          tanggal: { gte: new Date(targetYear, 0, 1), lte: new Date(targetYear, 11, 31) },
        },
        select: { id: true, tanggal: true },
      });

      const toDelete = existing.filter((e) => {
        const key = `${e.tanggal.getFullYear()}-${String(e.tanggal.getMonth() + 1).padStart(2, "0")}-${String(e.tanggal.getDate()).padStart(2, "0")}`;
        return !syncedDateKeys.has(key);
      }).map((e) => e.id);

      if (toDelete.length > 0) {
        await prisma.hariLibur.deleteMany({ where: { id: { in: toDelete } } });
      }
    }

    return NextResponse.json({ message: `Berhasil sinkronisasi ${synced} hari libur`, synced });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Gagal sinkronisasi hari libur" }, { status: 500 });
  }
}
