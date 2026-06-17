export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const where: any = {};

  if ((session.user as any)?.role === "KARYAWAN") {
    where.userId = session.user.id;
  }

  const leaves = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { nama: true, email: true } } },
  });

  return NextResponse.json({ leaves });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { jenis, tanggalMulai, tanggalAkhir, alasan } = body;

  if (!jenis || !tanggalMulai || !tanggalAkhir || !alasan) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      jenis,
      tanggalMulai: new Date(tanggalMulai),
      tanggalAkhir: new Date(tanggalAkhir),
      alasan,
      status: "PENDING",
    },
  });

  return NextResponse.json({ message: "Pengajuan izin berhasil", leave });
}
