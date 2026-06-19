export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.clinicSetting.findFirst();
  return NextResponse.json(setting || { latitude: 0, longitude: 0, radiusMeter: 100, namaKlinik: "Absensi Puskesmas" });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { latitude, longitude, radiusMeter, namaKlinik } = body;

  if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
    return NextResponse.json({ error: "Latitude tidak valid (-90 s.d. 90)" }, { status: 400 });
  }
  if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Longitude tidak valid (-180 s.d. 180)" }, { status: 400 });
  }
  if (typeof radiusMeter !== "number" || radiusMeter <= 0) {
    return NextResponse.json({ error: "Radius harus lebih dari 0" }, { status: 400 });
  }
  if (!namaKlinik || typeof namaKlinik !== "string" || namaKlinik.trim().length === 0) {
    return NextResponse.json({ error: "Nama puskesmas tidak boleh kosong" }, { status: 400 });
  }

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

  return NextResponse.json({ message: "Lokasi puskesmas berhasil disimpan" });
}
