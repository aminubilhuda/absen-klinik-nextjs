export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const schedules = await prisma.workSchedule.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ schedules });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { schedules } = body;

  if (!Array.isArray(schedules)) {
    return NextResponse.json({ error: "Data jadwal tidak valid" }, { status: 400 });
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  for (const s of schedules) {
    if (!s.id || typeof s.id !== "string") {
      return NextResponse.json({ error: "ID jadwal tidak valid" }, { status: 400 });
    }
    if (s.jamMasuk !== null && s.jamMasuk !== undefined && s.jamMasuk !== "" && !timeRegex.test(s.jamMasuk)) {
      return NextResponse.json({ error: `Format jam masuk tidak valid: ${s.jamMasuk}` }, { status: 400 });
    }
    if (s.jamKeluar !== null && s.jamKeluar !== undefined && s.jamKeluar !== "" && !timeRegex.test(s.jamKeluar)) {
      return NextResponse.json({ error: `Format jam keluar tidak valid: ${s.jamKeluar}` }, { status: 400 });
    }

    await prisma.workSchedule.update({
      where: { id: s.id },
      data: {
        jamMasuk: s.jamMasuk || null,
        jamKeluar: s.jamKeluar || null,
        isLibur: Boolean(s.isLibur),
      },
    });
  }

  return NextResponse.json({ message: "Jadwal berhasil disimpan" });
}
