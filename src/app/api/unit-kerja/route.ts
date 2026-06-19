export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const list = await prisma.unitKerja.findMany({
      orderBy: { nama: "asc" },
    });
    return NextResponse.json({ data: list });
  } catch {
    return NextResponse.json({ error: "Gagal memuat data unit kerja" }, { status: 500 });
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
    const { nama } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama unit kerja wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.unitKerja.findUnique({ where: { nama: nama.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Unit kerja sudah ada" }, { status: 409 });
    }

    const item = await prisma.unitKerja.create({
      data: { nama: nama.trim() },
    });

    return NextResponse.json({ message: "Unit kerja berhasil ditambahkan", item });
  } catch {
    return NextResponse.json({ error: "Gagal menambah unit kerja" }, { status: 500 });
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

    const usersCount = await prisma.user.count({
      where: { unitKerjaId: { in: ids } },
    });

    if (usersCount > 0) {
      return NextResponse.json({
        error: `Tidak dapat menghapus: ${usersCount} karyawan masih terdaftar di unit ini`,
      }, { status: 409 });
    }

    await prisma.unitKerja.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ message: `${ids.length} unit kerja berhasil dihapus` });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
