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
  const { action, catatan } = body;

  const statusMap: Record<string, any> = {
    approve: "ACTIVE",
    reject: "REJECTED",
    deactivate: "DEACTIVATED",
  };
  const status = statusMap[action];
  if (!status) {
    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { status },
  });

  const messages: Record<string, string> = {
    approve: "Karyawan berhasil diaktifkan",
    reject: "Karyawan berhasil ditolak",
    deactivate: "Karyawan berhasil dinonaktifkan",
  };

  return NextResponse.json({
    message: messages[action] || `Karyawan berhasil diupdate`,
  });
}
