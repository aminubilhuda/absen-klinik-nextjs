export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDateInWIB, getDayNameInWIB } from "@/lib/date";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getDateInWIB();

  const { prisma } = await import("@/lib/prisma");
  const [att, leave, schedule] = await Promise.all([
    prisma.attendance.findFirst({
      where: { userId: session.user.id, tanggal: today },
    }),
    prisma.leaveRequest.findFirst({
      where: {
        userId: session.user.id,
        status: "APPROVED",
        tanggalMulai: { lte: today },
        tanggalAkhir: { gte: today },
      },
      select: {
        kategoriAbsensi: { select: { id: true, kode: true, keterangan: true, warnaLabel: true } },
      },
    }),
    prisma.workSchedule.findFirst({
      where: { day: getDayNameInWIB() as any },
      select: {
        jamMasuk: true,
        jamKeluar: true,
        batasAwalMasuk: true,
        batasAkhirMasuk: true,
        batasAwalKeluar: true,
        batasAkhirKeluar: true,
        isLibur: true,
      },
    }),
  ]);

  return NextResponse.json({
    checkin: !!att?.waktuCheckin,
    checkout: !!att?.waktuCheckout,
    waktuCheckin: att?.waktuCheckin ?? null,
    waktuCheckout: att?.waktuCheckout ?? null,
    status: att?.status ?? null,
    menitTerlambat: att?.menitTerlambat ?? null,
    jarakCheckin: att?.jarakCheckin ?? null,
    jarakCheckout: att?.jarakCheckout ?? null,
    fotoCheckin: att?.fotoCheckin ?? null,
    fotoCheckout: att?.fotoCheckout ?? null,
    isOnLeave: !!leave,
    kategoriCuti: leave?.kategoriAbsensi ?? null,
    schedule: schedule
      ? {
          jamMasuk: schedule.jamMasuk,
          jamKeluar: schedule.jamKeluar,
          batasAwalMasuk: schedule.batasAwalMasuk,
          batasAkhirMasuk: schedule.batasAkhirMasuk,
          batasAwalKeluar: schedule.batasAwalKeluar,
          batasAkhirKeluar: schedule.batasAkhirKeluar,
          isLibur: schedule.isLibur,
        }
      : null,
  });
}
