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

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 400 });
  }

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

  if (existing?.waktuCheckin) {
    return NextResponse.json({ error: "Anda sudah check-in hari ini" }, { status: 400 });
  }

  const schedule = await prisma.workSchedule.findFirst({
    where: { day: ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"][new Date().getDay()] as any },
  });

  let status: "TEPAT_WAKTU" | "TERLAMBAT" = "TEPAT_WAKTU";
  let menitTerlambat: number | null = null;

  if (schedule && !schedule.isLibur && schedule.jamMasuk) {
    const [h, m] = schedule.jamMasuk.split(":").map(Number);
    const jamMasuk = new Date();
    jamMasuk.setHours(h, m, 0, 0);
    const selisih = (Date.now() - jamMasuk.getTime()) / 60000;
    if (selisih > 0) {
      status = "TERLAMBAT";
      menitTerlambat = Math.round(selisih);
    }
  }

  await prisma.attendance.upsert({
    where: { userId_tanggal: { userId: session.user.id, tanggal: today } },
    update: {
      waktuCheckin: new Date(),
      latCheckin: latitude,
      lngCheckin: longitude,
      jarakCheckin: Math.round(distance),
      status,
      menitTerlambat,
    },
    create: {
      userId: session.user.id,
      tanggal: today,
      waktuCheckin: new Date(),
      latCheckin: latitude,
      lngCheckin: longitude,
      jarakCheckin: Math.round(distance),
      status,
      menitTerlambat,
    },
  });

  return NextResponse.json({
    message: status === "TEPAT_WAKTU" ? "Absen masuk berhasil (Tepat Waktu)" : `Absen masuk berhasil (Terlambat ${menitTerlambat} menit)`,
    status,
    menitTerlambat,
  });
}
