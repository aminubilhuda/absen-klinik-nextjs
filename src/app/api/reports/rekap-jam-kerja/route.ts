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
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { unitKerjaId, userId, bulan, tahun } = body;

    if (!bulan || !tahun) {
      return NextResponse.json({ error: "Parameter bulan dan tahun wajib diisi" }, { status: 400 });
    }

    const bulanNum = parseInt(bulan);
    const tahunNum = parseInt(tahun);
    const totalHari = getDaysInMonth(tahunNum, bulanNum);
    const startDate = new Date(tahunNum, bulanNum - 1, 1);
    const endDate = new Date(tahunNum, bulanNum - 1, totalHari);

    const userIdFilter: any = {};
    if (userId && Array.isArray(userId) && userId.length > 0) {
      userIdFilter.id = { in: userId };
    } else {
      userIdFilter.role = "KARYAWAN";
      userIdFilter.status = "ACTIVE";
      if (unitKerjaId) userIdFilter.unitKerjaId = unitKerjaId;
    }

    const userIds = (await prisma.user.findMany({
      where: userIdFilter,
      select: { id: true },
    })).map((u) => u.id);

    const [users, attendances, schedules, hariLiburList, leaveRequests, unitKerja, kategoriList, clinicSetting] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nip: true, nama: true, unitKerjaId: true },
        orderBy: { nama: "asc" },
      }),
      prisma.attendance.findMany({
        where: {
          userId: { in: userIds },
          tanggal: { gte: startDate, lte: endDate },
        },
        select: {
          userId: true,
          tanggal: true,
          waktuCheckin: true,
          waktuCheckout: true,
          status: true,
          menitTerlambat: true,
          kategoriAbsensiId: true,
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
        select: { userId: true, tanggalMulai: true, tanggalAkhir: true, kategoriAbsensiId: true },
      }),
      unitKerjaId
        ? prisma.unitKerja.findUnique({ where: { id: unitKerjaId }, select: { id: true, nama: true } })
        : Promise.resolve(null),
      prisma.kategoriAbsensi.findMany({ orderBy: { kode: "asc" } }),
      prisma.clinicSetting.findFirst({ select: { namaKlinik: true } }),
    ]);

    const kategoriMap = new Map(kategoriList.map((k) => [k.id, k]));

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

    const leaveMap = new Map<string, { mulai: number; akhir: number; kode: string }[]>();
    for (const l of leaveRequests) {
      if (!leaveMap.has(l.userId)) leaveMap.set(l.userId, []);
      const kat = l.kategoriAbsensiId ? kategoriMap.get(l.kategoriAbsensiId) : null;
      leaveMap.get(l.userId)!.push({
        mulai: l.tanggalMulai.getTime(),
        akhir: l.tanggalAkhir.getTime(),
        kode: kat?.kode || "IZN",
      });
    }

    function isOnLeave(userId: string, date: Date): string | null {
      const leaves = leaveMap.get(userId);
      if (!leaves) return null;
      const t = date.getTime();
      const match = leaves.find((l) => t >= l.mulai && t <= l.akhir);
      return match ? match.kode : null;
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
      let totalLembur = 0;
      let totalTks = 0;

      const harian: Array<{
        type: "checkmark" | "hours" | "code" | "empty" | "holiday" | "sunday" | "liburJadwal";
        value: string | null;
        codeLabel?: string;
        warnaLabel?: string;
      }> = [];

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

        if (isLiburNasional) {
          harian.push({ type: "holiday", value: null });
        } else if (isMinggu) {
          harian.push({ type: "sunday", value: null });
        } else if (isClinicLibur) {
          harian.push({ type: "liburJadwal", value: null });
        } else if (att?.kategoriAbsensiId) {
          const kat = kategoriMap.get(att.kategoriAbsensiId);
          harian.push({
            type: "code",
            value: kat?.kode || "?",
            codeLabel: kat?.keterangan,
            warnaLabel: kat?.warnaLabel || undefined,
          });
        } else if (onLeave) {
          harian.push({ type: "code", value: onLeave, codeLabel: "Izin/Cuti" });
        } else if (att && att.waktuCheckin && att.waktuCheckout) {
          const checkin = att.waktuCheckin.getTime();
          const checkout = att.waktuCheckout.getTime();
          const jamAktual = Math.max(0, Math.round((checkout - checkin) / 60000));
          totalJamAktual += jamAktual;

          const jamWajib = schedule?.jamMasuk && schedule?.jamKeluar
            ? parseTimeToMinutes(schedule.jamKeluar) - parseTimeToMinutes(schedule.jamMasuk)
            : 0;

          if (jamAktual >= jamWajib) {
            harian.push({ type: "checkmark", value: "✔" });
          } else {
            harian.push({ type: "hours", value: minutesToHM(jamAktual) });
          }

          if (schedule?.jamKeluar) {
            const jamKeluarMenit = parseTimeToMinutes(schedule.jamKeluar);
            // Hitung menit checkout dalam WIB dari timestamp UTC yang sudah +7
            const checkoutWIB = new Date(checkout);
            const checkoutMenitWIB = checkoutWIB.getUTCHours() * 60 + checkoutWIB.getUTCMinutes();
            const lemburMulai = jamKeluarMenit + 60;
            if (checkoutMenitWIB > lemburMulai) {
              totalLembur += checkoutMenitWIB - lemburMulai;
            }
          }
        } else if (att && att.waktuCheckin && !att.waktuCheckout) {
          harian.push({ type: "empty", value: null });
        } else {
          if (!isHariLibur && !onLeave) {
            totalTks += 1;
          }
          harian.push({ type: "empty", value: null });
        }

        if (!isHariLibur && !onLeave && !att?.kategoriAbsensiId && schedule?.jamMasuk && schedule?.jamKeluar) {
          const jamWajib = parseTimeToMinutes(schedule.jamKeluar) - parseTimeToMinutes(schedule.jamMasuk);
          totalJamWajib += jamWajib;
        }
      }

      const kjkMenit = Math.max(0, totalJamWajib - totalJamAktual);

      return {
        userId: user.id,
        nip: user.nip || null,
        nama: user.nama,
        harian,
        tjk: minutesToHM(totalJamAktual),
        kjk: minutesToHM(kjkMenit),
        totalKjk: minutesToHM(kjkMenit),
        tjl: minutesToHM(totalLembur),
        tks: totalTks,
        tjkMenit: totalJamAktual,
        kjkMenit,
        tjlMenit: totalLembur,
      };
    });

    return NextResponse.json({
      unitKerja,
      clinicName: clinicSetting?.namaKlinik || "Pemerintah Kabupaten Tuban",
      bulan: bulanNum,
      tahun: tahunNum,
      totalHari,
      daftarHari,
      kategoriList,
      data,
    });
  } catch (error) {
    console.error("Error generating rekap jam kerja:", error);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
