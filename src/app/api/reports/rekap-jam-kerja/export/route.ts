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

const BULAN_INDONESIA = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

async function getReportData(unitKerjaId: string | null, bulan: string, tahun: string) {
  const { prisma } = await import("@/lib/prisma");

  const bulanNum = parseInt(bulan);
  const tahunNum = parseInt(tahun);
  const totalHari = getDaysInMonth(tahunNum, bulanNum);
  const startDate = new Date(tahunNum, bulanNum - 1, 1);
  const endDate = new Date(tahunNum, bulanNum - 1, totalHari);

  const userIds = (await prisma.user.findMany({
    where: {
      role: "KARYAWAN",
      status: "ACTIVE",
      ...(unitKerjaId ? { unitKerjaId } : {}),
    },
    select: { id: true },
  })).map((u) => u.id);

  const [users, attendances, schedules, hariLiburList, leaveRequests, unitKerja, clinicSetting] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nama: true },
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
    prisma.clinicSetting.findFirst({ select: { namaKlinik: true } }),
  ]);

  const scheduleMap = new Map<string, { jamMasuk?: string; jamKeluar?: string; isLibur: boolean }>();
  for (const s of schedules) scheduleMap.set(s.day, { jamMasuk: s.jamMasuk ?? undefined, jamKeluar: s.jamKeluar ?? undefined, isLibur: s.isLibur });

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
    leaveMap.get(l.userId)!.push({ mulai: l.tanggalMulai.getTime(), akhir: l.tanggalAkhir.getTime() });
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

    daftarHari.push({
      tanggal: d,
      namaHari,
      isLiburNasional: !!libur,
      isMinggu,
      keteranganLibur: libur || undefined,
    });
  }

  const data = users.map((user) => {
    let totalJamAktual = 0;
    let totalJamWajib = 0;
    const harian: Array<{ jamKerja: string | null; isLibur: boolean; menitTerlambat: number | null }> = [];

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
      let jamKerja: string | null = null;
      let menitTerlambat: number | null = null;

      if (att && att.waktuCheckin && att.waktuCheckout) {
        const checkin = att.waktuCheckin.getTime();
        const checkout = att.waktuCheckout.getTime();
        const jamAktual = Math.max(0, Math.round((checkout - checkin) / 60000));
        totalJamAktual += jamAktual;
        jamKerja = minutesToHM(jamAktual);
        menitTerlambat = att.menitTerlambat;
      } else if (att && att.waktuCheckin && !att.waktuCheckout) {
        jamKerja = null;
      }

      harian.push({ jamKerja, isLibur: isHariLibur || onLeave, menitTerlambat });

      if (!isHariLibur && !onLeave && schedule?.jamMasuk && schedule?.jamKeluar) {
        totalJamWajib += parseTimeToMinutes(schedule.jamKeluar) - parseTimeToMinutes(schedule.jamMasuk);
      }
    }

    const kjkMenit = Math.max(0, totalJamWajib - totalJamAktual);

    return { userId: user.id, nama: user.nama, harian, tjkMenit: totalJamAktual, kjkMenit };
  });

  return {
    unitKerja,
    clinicName: clinicSetting?.namaKlinik || "Absensi Puskesmas",
    bulan: bulanNum,
    tahun: tahunNum,
    totalHari,
    daftarHari,
    data,
    users,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { unitKerjaId, bulan, tahun, format } = body;

    if (!bulan || !tahun || !format) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const report = await getReportData(unitKerjaId || null, bulan, tahun);

    if (format === "pdf") {
      return generatePdf(report);
    }

    if (format === "xlsx") {
      return generateXlsx(report);
    }

    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Gagal mengekspor laporan" }, { status: 500 });
  }
}

async function generatePdf(report: Awaited<ReturnType<typeof getReportData>>) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(report.clinicName, pageW / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.text("Rekap Jam Kerja Harian Pegawai", pageW / 2, 22, { align: "center" });

  doc.setFontSize(9);
  const infoY = 28;
  if (report.unitKerja) {
    doc.text(`Unit Kerja: ${report.unitKerja.nama}`, 14, infoY);
  }
  doc.text(`Periode: ${BULAN_INDONESIA[report.bulan]} ${report.tahun}`, 14, infoY + 5);

  const headRow1 = [
    { content: "No", rowSpan: 2, styles: { halign: "center" } },
    { content: "Pegawai", rowSpan: 2 },
    { content: `Total Jam Kerja Harian (${BULAN_INDONESIA[report.bulan]} ${report.tahun})`, colSpan: report.totalHari, styles: { halign: "center" } },
    { content: "Total", colSpan: 2, styles: { halign: "center" } },
  ];

  const headRow2: Array<{ content: string; styles?: any }> = [];
  for (const hari of report.daftarHari) {
    const isRed = hari.isLiburNasional;
    const isYellow = hari.isMinggu;
    headRow2.push({
      content: String(hari.tanggal),
      styles: {
         halign: "center",
         fillColor: isRed ? [254, 202, 202] : isYellow ? [254, 243, 199] : undefined,
         textColor: isRed ? [185, 28, 28] : isYellow ? [161, 98, 7] : undefined,
       } as any,
     });
   }
   headRow2.push(
     { content: "TJK", styles: { halign: "center" } as any },
     { content: "KJK", styles: { halign: "center" } as any },
  );

  const body = report.data.map((row) => {
    const rowData = [
      { content: "", styles: { halign: "center" } },
      row.nama,
    ];
    for (let j = 0; j < report.totalHari; j++) {
      const h = row.harian[j];
      const hari = report.daftarHari[j];
      const isRed = hari.isLiburNasional;
      const isYellow = hari.isMinggu;
      rowData.push({
        content: h.jamKerja || "-",
        styles: {
          halign: "center",
          fillColor: isRed ? [254, 202, 202] : isYellow ? [254, 243, 199] : undefined,
          textColor: isRed ? [185, 28, 28] : isYellow ? [161, 98, 7] : undefined,
        } as any,
      });
    }
    rowData.push(
      { content: minutesToHM(row.tjkMenit), styles: { halign: "center" } as any },
      { content: minutesToHM(row.kjkMenit), styles: { halign: "center", textColor: row.kjkMenit > 0 ? [220, 38, 38] : undefined } as any },
    );
    return rowData;
  });

  autoTable(doc, {
    startY: 38,
    head: [headRow1 as any, headRow2 as any],
    body: body as any,
    theme: "grid",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontSize: 8,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 40 },
    },
    didParseCell: (data: any) => {
      if (data.section === "head" && data.row.index === 0) {
        if (data.column.index === 0 || data.column.index === 1) {
          // No, Pegawai - already handled via rowSpan
        }
      }
    },
  });

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=rekap-jam-kerja-${report.bulan}-${report.tahun}.pdf`,
    },
  });
}

async function generateXlsx(report: Awaited<ReturnType<typeof getReportData>>) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const headerRow1 = [""];
  const headerRow2 = ["No", "Pegawai"];

  for (const hari of report.daftarHari) {
    headerRow1.push(String(hari.tanggal));
    headerRow2.push("");
  }
  headerRow1.push("TJK", "KJK");
  headerRow2.push("TJK", "KJK");

  const dataRows = report.data.map((row, i) => {
    const r: any[] = [i + 1, row.nama];
    for (let j = 0; j < report.totalHari; j++) {
      r.push(row.harian[j].jamKerja || "-");
    }
    r.push(minutesToHM(row.tjkMenit));
    r.push(minutesToHM(row.kjkMenit));
    return r;
  });

  const wsData = [headerRow1, headerRow2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 0, c: 1 + report.totalHari } },
    { s: { r: 0, c: 2 + report.totalHari }, e: { r: 0, c: 3 + report.totalHari } },
  ];

  ws["!cols"] = [
    { wch: 5 },
    { wch: 25 },
    ...report.daftarHari.map(() => ({ wch: 7 })),
    { wch: 8 },
    { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Jam Kerja");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=rekap-jam-kerja-${report.bulan}-${report.tahun}.xlsx`,
    },
  });
}
