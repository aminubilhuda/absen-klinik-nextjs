export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { haversineDistance } from "@/lib/haversine";
import { getDateInWIB, getDayNameInWIB, getNowWIB } from "@/lib/date";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");

  const body = await req.json();
  const { latitude, longitude, foto } = body;

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 400 });
  }

  const clinic = await prisma.clinicSetting.findFirst();
  if (!clinic) {
    return NextResponse.json({ error: "Lokasi puskesmas belum diatur" }, { status: 400 });
  }

  const distance = haversineDistance(latitude, longitude, clinic.latitude, clinic.longitude);

  if (distance > clinic.radiusMeter) {
    return NextResponse.json(
      { error: `Anda berada di luar radius absen (${Math.round(distance)}m dari puskesmas)` },
      { status: 403 }
    );
  }

  const today = getDateInWIB();

  const existingLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      tanggalMulai: { lte: today },
      tanggalAkhir: { gte: today },
    },
    select: { id: true },
  });

  if (existingLeave) {
    return NextResponse.json({ error: "Anda sedang dalam masa cuti/izin" }, { status: 400 });
  }

  const existing = await prisma.attendance.findFirst({
    where: { userId: session.user.id, tanggal: today },
  });

  if (existing?.waktuCheckin) {
    return NextResponse.json({ error: "Anda sudah check-in hari ini" }, { status: 400 });
  }

  const schedule = await prisma.workSchedule.findFirst({
    where: { day: getDayNameInWIB() as any },
  });

  let status: "TEPAT_WAKTU" | "TERLAMBAT" = "TEPAT_WAKTU";
  let menitTerlambat: number | null = null;

  if (schedule && !schedule.isLibur && schedule.jamMasuk) {
    const [h, m] = schedule.jamMasuk.split(":").map(Number);
    const nowWIB = getNowWIB();
    const jamMasukWIB = new Date(nowWIB);
    jamMasukWIB.setUTCHours(h, m, 0, 0);
    const selisih = (nowWIB.getTime() - jamMasukWIB.getTime()) / 60000;
    if (selisih > 0) {
      status = "TERLAMBAT";
      menitTerlambat = Math.round(selisih);
    }
  }

  let fotoCheckin: string | null = null;

  if (foto) {
    try {
      const base64Data = foto.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.length <= 2 * 1024 * 1024) {
        const now = new Date();
        const filename = `${session.user.id}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`;
        const dir = path.join(process.cwd(), "public", "uploads", "attendance");
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, filename), buffer);
        fotoCheckin = `/uploads/attendance/${filename}`;
      }
    } catch {
      // foto gagal disimpan, tetap lanjut tanpa foto
    }
  }

  await prisma.attendance.upsert({
    where: { userId_tanggal: { userId: session.user.id, tanggal: today } },
    update: {
      waktuCheckin: getNowWIB(),
      latCheckin: latitude,
      lngCheckin: longitude,
      jarakCheckin: Math.round(distance),
      status,
      menitTerlambat,
      fotoCheckin,
    },
    create: {
      userId: session.user.id,
      tanggal: today,
      waktuCheckin: getNowWIB(),
      latCheckin: latitude,
      lngCheckin: longitude,
      jarakCheckin: Math.round(distance),
      status,
      menitTerlambat,
      fotoCheckin,
    },
  });

  return NextResponse.json({
    message: status === "TEPAT_WAKTU" ? "Absen masuk berhasil (Tepat Waktu)" : `Absen masuk berhasil (Terlambat ${menitTerlambat} menit)`,
    status,
    menitTerlambat,
  });
}
