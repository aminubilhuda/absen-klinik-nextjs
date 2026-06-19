export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { id } = await params;
    const body = await req.json();
    const { nama } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama unit kerja wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.unitKerja.findUnique({ where: { nama: nama.trim() } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Nama unit kerja sudah digunakan" }, { status: 409 });
    }

    const item = await prisma.unitKerja.update({
      where: { id },
      data: { nama: nama.trim() },
    });

    return NextResponse.json({ message: "Unit kerja berhasil diubah", item });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah unit kerja" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { id } = await params;

    const usersCount = await prisma.user.count({ where: { unitKerjaId: id } });
    if (usersCount > 0) {
      return NextResponse.json({
        error: `Tidak dapat menghapus: ${usersCount} karyawan masih terdaftar di unit ini`,
      }, { status: 409 });
    }

    await prisma.unitKerja.delete({ where: { id } });
    return NextResponse.json({ message: "Unit kerja berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus unit kerja" }, { status: 500 });
  }
}
