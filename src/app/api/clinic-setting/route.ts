export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.clinicSetting.findFirst();
  return NextResponse.json(setting || { latitude: 0, longitude: 0, radiusMeter: 100, namaKlinik: "Klinik" });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { latitude, longitude, radiusMeter, namaKlinik } = body;

  const existing = await prisma.clinicSetting.findFirst();

  if (existing) {
    await prisma.clinicSetting.update({
      where: { id: existing.id },
      data: { latitude, longitude, radiusMeter, namaKlinik },
    });
  } else {
    await prisma.clinicSetting.create({
      data: { latitude, longitude, radiusMeter, namaKlinik },
    });
  }

  return NextResponse.json({ message: "Lokasi klinik berhasil disimpan" });
}
