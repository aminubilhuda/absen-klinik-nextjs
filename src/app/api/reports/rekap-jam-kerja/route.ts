export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DAY_NAMES = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHM(totalMinutes: number): string {
  const abs = Math.max(0, totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}J${m}M`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { unitKerjaId, bulan, tahun } = body;

    if (!bulan || !tahun) {
      return NextResponse.json({ error: "Parameter bulan dan tahun wajib diisi" }, { status: 400 });
    }

    const bulanNum = parseInt(bulan);
    const tahunNum = parseInt(tahun);
    const totalHari = getDaysInMonth(tahunNum, bulanNum);
    const startDate = new Date(tahunNum, bulanNum - 1, 1);
    const endDate = new Date(tahunNum, bulanNum - 1, totalHari);

    const [users, attendances, schedules, hariLiburList, leaveRequests, unitKerja] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "KARYAWAN",
          status: "ACTIVE",
          ...(unitKerjaId ? { unitKerjaId } : {}),
        },
        select: { id: true, nama: true, unitKerjaId: true },
        orderBy: { nama: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          userId: { in: (await prisma.user.findMany({
            where: {
              role: "KARYAWAN",
              status: "ACTIVE",
              ...(unitKerjaId ? { unitKerjaId } : {}),
            },
            select: { id: true },
          })).map((u) => u.id) },
          tanggal: { gte: startDate, lte: endDate },
        },
        select: {
          userId: true,
          tanggal: true,
          waktuCheckin: true,
          waktuCheckout: true,
          status: true,
          menitTerlambat: true,
        },
      }),
      prisma.workSchedule.findMany(),
      prisma.hariLibur.findMany({
        where: { tanggal: { gte: startDate, lte: endDate } },
        select: { tanggal: true, keterangan: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          tanggalMulai: { lte: endDate },
          tanggalAkhir: { gte: startDate },
        },
        select: { userId: true, tanggalMulai: true, tanggalAkhir: true },
      }),
      unitKerjaId
        ? prisma.unitKerja.findUnique({ where: { id: unitKerjaId }, select: { id: true, nama: true } })
        : Promise.resolve(null),
    ]);

    const scheduleMap = new Map<string, { jamMasuk?: string; jamKeluar?: string; isLibur: boolean }>();
    for (const s of schedules) {
      scheduleMap.set(s.day, { jamMasuk: s.jamMasuk ?? undefined, jamKeluar: s.jamKeluar ?? undefined, isLibur: s.isLibur });
    }

    const holidaySet = new Map<string, string>();
    for (const h of hariLiburList) {
      const key = `${h.tanggal.getFullYear()}-${String(h.tanggal.getMonth() + 1).padStart(2, "0")}-${String(h.tanggal.getDate()).padStart(2, "0")}`;
      holidaySet.set(key, h.keterangan);
    }

    const attendanceMap = new Map<string, typeof attendances[0]>();
    for (const a of attendances) {
      const key = `${a.userId}-${a.tanggal.toISOString().split("T")[0]}`;
      attendanceMap.set(key, a);
    }

    const leaveMap = new Map<string, { mulai: number; akhir: number }[]>();
    for (const l of leaveRequests) {
      if (!leaveMap.has(l.userId)) leaveMap.set(l.userId, []);
      leaveMap.get(l.userId)!.push({
        mulai: l.tanggalMulai.getTime(),
        akhir: l.tanggalAkhir.getTime(),
      });
    }

    function isOnLeave(userId: string, date: Date): boolean {
      const leaves = leaveMap.get(userId);
      if (!leaves) return false;
      const t = date.getTime();
      return leaves.some((l) => t >= l.mulai && t <= l.akhir);
    }

    function formatDate(dateNum: number): string {
      return `${tahunNum}-${String(bulanNum).padStart(2, "0")}-${String(dateNum).padStart(2, "0")}`;
    }

    const daftarHari: Array<{
      tanggal: number;
      namaHari: string;
      isLiburNasional: boolean;
      isMinggu: boolean;
      keteranganLibur?: string;
    }> = [];

    for (let d = 1; d <= totalHari; d++) {
      const date = new Date(tahunNum, bulanNum - 1, d);
      const dateStr = formatDate(d);
      const dayOfWeek = date.getDay();
      const namaHari = DAY_NAMES[dayOfWeek];
      const isMinggu = dayOfWeek === 0;
      const libur = holidaySet.get(dateStr);
      const isLiburNasional = !!libur;

      daftarHari.push({
        tanggal: d,
        namaHari,
        isLiburNasional,
        isMinggu,
        keteranganLibur: libur || undefined,
      });
    }

    const data = users.map((user) => {
      let totalJamAktual = 0;
      let totalJamWajib = 0;

      const harian: Array<string | null> = [];

      for (let d = 1; d <= totalHari; d++) {
        const date = new Date(tahunNum, bulanNum - 1, d);
        const dateStr = formatDate(d);
        const dayOfWeek = date.getDay();
        const dayName = DAY_NAMES[dayOfWeek];
        const schedule = scheduleMap.get(dayName);
        const isLiburNasional = holidaySet.has(dateStr);
        const isMinggu = dayOfWeek === 0;
        const isClinicLibur = schedule?.isLibur ?? false;
        const isHariLibur = isLiburNasional || isMinggu || isClinicLibur;
        const onLeave = isOnLeave(user.id, date);

        const attKey = `${user.id}-${dateStr}`;
        const att = attendanceMap.get(attKey);

        if (att && att.waktuCheckin && att.waktuCheckout) {
          const checkin = att.waktuCheckin.getTime();
          const checkout = att.waktuCheckout.getTime();
          const jamAktual = Math.max(0, Math.round((checkout - checkin) / 60000));
          totalJamAktual += jamAktual;
          harian.push(minutesToHM(jamAktual));
        } else if (att && att.waktuCheckin && !att.waktuCheckout) {
          harian.push(null);
        } else {
          harian.push(null);
        }

        if (!isHariLibur && !onLeave && schedule?.jamMasuk && schedule?.jamKeluar) {
          const jamWajib = parseTimeToMinutes(schedule.jamKeluar) - parseTimeToMinutes(schedule.jamMasuk);
          totalJamWajib += jamWajib;
        }
      }

      const kjkMenit = Math.max(0, totalJamWajib - totalJamAktual);

      return {
        userId: user.id,
        nama: user.nama,
        harian,
        tjk: minutesToHM(totalJamAktual),
        kjk: minutesToHM(kjkMenit),
        tjkMenit: totalJamAktual,
        kjkMenit,
      };
    });

    return NextResponse.json({
      unitKerja,
      bulan: bulanNum,
      tahun: tahunNum,
      totalHari,
      daftarHari,
      data,
    });
  } catch (error) {
    console.error("Error generating rekap jam kerja:", error);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
