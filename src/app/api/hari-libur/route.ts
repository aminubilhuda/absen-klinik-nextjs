export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    const where: any = {};
    if (year) {
      const y = parseInt(year);
      if (month) {
        const m = parseInt(month);
        where.tanggal = {
          gte: new Date(y, m - 1, 1),
          lte: new Date(y, m, 0),
        };
      } else {
        where.tanggal = {
          gte: new Date(y, 0, 1),
          lte: new Date(y, 11, 31),
        };
      }
    }

    const data = await prisma.hariLibur.findMany({
      where,
      orderBy: { tanggal: "asc" },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { tanggal, keterangan } = body;

    if (!tanggal || !keterangan) {
      return NextResponse.json({ error: "Tanggal dan keterangan wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.hariLibur.findUnique({
      where: { tanggal: new Date(tanggal) },
    });

    if (existing) {
      return NextResponse.json({ error: "Tanggal ini sudah terdaftar sebagai hari libur" }, { status: 409 });
    }

    const item = await prisma.hariLibur.create({
      data: { tanggal: new Date(tanggal), keterangan },
    });

    return NextResponse.json({ message: "Hari libur berhasil ditambahkan", item });
  } catch {
    return NextResponse.json({ error: "Gagal menambah hari libur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "IDs wajib diisi" }, { status: 400 });
    }

    await prisma.hariLibur.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ message: `${ids.length} hari libur berhasil dihapus` });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
