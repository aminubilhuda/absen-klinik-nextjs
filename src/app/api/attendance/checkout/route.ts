export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { haversineDistance } from "@/lib/haversine";
import { getDateInWIB, getNowWIB, getDayNameInWIB, getTimeInWIB } from "@/lib/date";
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

  const existing = await prisma.attendance.findFirst({
    where: { userId: session.user.id, tanggal: today },
  });

  if (!existing?.waktuCheckin) {
    return NextResponse.json({ error: "Anda belum check-in hari ini" }, { status: 400 });
  }

  const sudahCheckout = !!existing.waktuCheckout;

  // Cek batas waktu absen pulang
  const schedule = await prisma.workSchedule.findFirst({
    where: { day: getDayNameInWIB() as any },
  });

  if (schedule && !schedule.isLibur && schedule.jamKeluar) {
    const { hours: nowH, minutes: nowM } = getTimeInWIB();

    if (schedule.batasAwalKeluar) {
      const [bukaH, bukaM] = schedule.batasAwalKeluar.split(":").map(Number);
      if (nowH < bukaH || (nowH === bukaH && nowM < bukaM)) {
        return NextResponse.json({ error: `Absen pulang belum dibuka (buka pukul ${schedule.batasAwalKeluar} WIB)` }, { status: 403 });
      }
    }

    if (schedule.batasAkhirKeluar) {
      const [tutupH, tutupM] = schedule.batasAkhirKeluar.split(":").map(Number);
      if (nowH > tutupH || (nowH === tutupH && nowM > tutupM)) {
        return NextResponse.json({ error: `Absen pulang sudah ditutup (tutup pukul ${schedule.batasAkhirKeluar} WIB)` }, { status: 403 });
      }
    }
  }

  let fotoCheckout: string | null = null;

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
        fotoCheckout = `/uploads/attendance/${filename}`;
      }
    } catch {
      // foto gagal disimpan, tetap lanjut tanpa foto
    }
  }

  await prisma.attendance.update({
    where: { id: existing.id },
    data: {
      waktuCheckout: getNowWIB(),
      latCheckout: latitude,
      lngCheckout: longitude,
      jarakCheckout: Math.round(distance),
      fotoCheckout,
    },
  });

  return NextResponse.json({ message: sudahCheckout ? "Absen keluar berhasil diperbarui" : "Absen keluar berhasil" });
}
