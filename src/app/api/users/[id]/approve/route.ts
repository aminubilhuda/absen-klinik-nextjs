export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { id } = await params;
  const body = await req.json();
  const { action, unitKerjaId } = body;

  const data: any = {};

  if (action) {
    const statusMap: Record<string, any> = {
      approve: "ACTIVE",
      reject: "REJECTED",
      deactivate: "DEACTIVATED",
    };
    const status = statusMap[action];
    if (!status) {
      return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
    }
    data.status = status;
  }

  if (unitKerjaId !== undefined) {
    data.unitKerjaId = unitKerjaId || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data,
  });

  const messages: Record<string, string> = {
    approve: "Karyawan berhasil diaktifkan",
    reject: "Karyawan berhasil ditolak",
    deactivate: "Karyawan berhasil dinonaktifkan",
  };

  return NextResponse.json({
    message: (action ? messages[action] : undefined) || "Karyawan berhasil diupdate",
  });
}
