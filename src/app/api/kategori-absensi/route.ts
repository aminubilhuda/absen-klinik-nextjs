export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { searchParams } = new URL(req.url);
    const isIzin = searchParams.get("isIzin");
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isIzin === "true") where.isIzin = true;
    if (search) {
      where.OR = [
        { kode: { contains: search } },
        { keterangan: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.kategoriAbsensi.findMany({
        where,
        orderBy: { kode: "asc" },
        skip,
        take: limit,
      }),
      prisma.kategoriAbsensi.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { kode, keterangan, warnaLabel, isIzin } = body;

    if (!kode || !keterangan) {
      return NextResponse.json({ error: "Kode dan keterangan wajib diisi" }, { status: 400 });
    }

    if (warnaLabel && !/^#[0-9a-fA-F]{6}$/.test(warnaLabel)) {
      return NextResponse.json({ error: "Format warna tidak valid (gunakan #RRGGBB)" }, { status: 400 });
    }

    const existing = await prisma.kategoriAbsensi.findUnique({ where: { kode } });
    if (existing) {
      return NextResponse.json({ error: "Kode sudah ada" }, { status: 409 });
    }

    const data = await prisma.kategoriAbsensi.create({
      data: { kode, keterangan, warnaLabel: warnaLabel || null, isIzin: isIzin || false },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    await prisma.kategoriAbsensi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
