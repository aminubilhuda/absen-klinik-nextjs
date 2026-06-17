export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { haversineDistance } from "@/lib/haversine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");

  const body = await req.json();
  const { latitude, longitude } = body;

  const clinic = await prisma.clinicSetting.findFirst();
  if (!clinic) {
    return NextResponse.json({ error: "Lokasi klinik belum diatur" }, { status: 400 });
  }

  const distance = haversineDistance(latitude, longitude, clinic.latitude, clinic.longitude);
  if (distance > clinic.radiusMeter) {
    return NextResponse.json(
      { error: `Anda berada di luar radius absen (${Math.round(distance)}m dari klinik)` },
      { status: 403 }
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: { userId: session.user.id, tanggal: today },
  });

  if (!existing?.waktuCheckin) {
    return NextResponse.json({ error: "Anda belum check-in hari ini" }, { status: 400 });
  }

  if (existing.waktuCheckout) {
    return NextResponse.json({ error: "Anda sudah check-out hari ini" }, { status: 400 });
  }

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      waktuCheckout: new Date(),
      latCheckout: latitude,
      lngCheckout: longitude,
      jarakCheckout: Math.round(distance),
    },
  });

  return NextResponse.json({ message: "Absen keluar berhasil" });
}
