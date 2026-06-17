export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const schedules = await prisma.workSchedule.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ schedules });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { schedules } = body;

  for (const s of schedules) {
    await prisma.workSchedule.update({
      where: { id: s.id },
      data: {
        jamMasuk: s.jamMasuk || null,
        jamKeluar: s.jamKeluar || null,
        isLibur: s.isLibur,
      },
    });
  }

  return NextResponse.json({ message: "Jadwal berhasil disimpan" });
}
