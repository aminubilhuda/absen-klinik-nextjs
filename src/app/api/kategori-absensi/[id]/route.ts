export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
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
    const { kode, keterangan, warnaLabel, isIzin } = body;

    if (!kode || !keterangan) {
      return NextResponse.json({ error: "Kode dan keterangan wajib diisi" }, { status: 400 });
    }

    if (warnaLabel && !/^#[0-9a-fA-F]{6}$/.test(warnaLabel)) {
      return NextResponse.json({ error: "Format warna tidak valid (gunakan #RRGGBB)" }, { status: 400 });
    }

    const existing = await prisma.kategoriAbsensi.findFirst({
      where: { kode, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Kode sudah digunakan" }, { status: 409 });
    }

    const data = await prisma.kategoriAbsensi.update({
      where: { id },
      data: { kode, keterangan, warnaLabel: warnaLabel || null, isIzin: isIzin || false },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate data" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { id } = await params;

    await prisma.kategoriAbsensi.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}
