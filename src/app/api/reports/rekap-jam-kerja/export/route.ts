export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNowWIB } from "@/lib/date";

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

const HARI_INDONESIA = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function getReportData(unitKerjaId: string | null, bulan: string, tahun: string, userId?: string[]) {
  const { prisma } = await import("@/lib/prisma");

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
      select: { id: true, nip: true, nama: true },
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

  const leaveMap = new Map<string, { mulai: number; akhir: number; kode: string }[]>();
  for (const l of leaveRequests) {
    if (!leaveMap.has(l.userId)) leaveMap.set(l.userId, []);
    const kat = l.kategoriAbsensiId ? kategoriMap.get(l.kategoriAbsensiId) : null;
    leaveMap.get(l.userId)!.push({ mulai: l.tanggalMulai.getTime(), akhir: l.tanggalAkhir.getTime(), kode: kat?.kode || "IZN" });
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
    daftarHari.push({
      tanggal: d,
      namaHari,
      isLiburNasional: !!libur,
      isMinggu,
      keteranganLibur: libur || undefined,
    });
  }

  interface DayCell {
    type: "checkmark" | "hours" | "code" | "empty" | "holiday" | "sunday" | "liburJadwal";
    value: string | null;
    codeLabel?: string;
  }

  const data = users.map((user) => {
    let totalJamAktual = 0;
    let totalJamWajib = 0;
    let totalLembur = 0;
    let totalTks = 0;
    const harian: DayCell[] = [];

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
        harian.push({ type: "code", value: kat?.kode || "?", codeLabel: kat?.keterangan });
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
          const checkoutTotal = checkout - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const checkoutMenitFull = Math.round(checkoutTotal / 60000);
          const lemburMulai = jamKeluarMenit + 60;
          if (checkoutMenitFull > lemburMulai) {
            totalLembur += checkoutMenitFull - lemburMulai;
          }
        }
      } else if (att && att.waktuCheckin && !att.waktuCheckout) {
        harian.push({ type: "empty", value: null });
      } else {
        if (!isHariLibur && !onLeave) totalTks += 1;
        harian.push({ type: "empty", value: null });
      }

      if (!isHariLibur && !onLeave && !att?.kategoriAbsensiId && schedule?.jamMasuk && schedule?.jamKeluar) {
        totalJamWajib += parseTimeToMinutes(schedule.jamKeluar) - parseTimeToMinutes(schedule.jamMasuk);
      }
    }

    const kjkMenit = Math.max(0, totalJamWajib - totalJamAktual);

    return {
      userId: user.id,
      nip: user.nip || null,
      nama: user.nama,
      harian,
      tjkMenit: totalJamAktual,
      kjkMenit,
      tjlMenit: totalLembur,
      tks: totalTks,
    };
  });

  return {
    unitKerja,
    clinicName: clinicSetting?.namaKlinik || "Pemerintah Kabupaten Tuban",
    bulan: bulanNum,
    tahun: tahunNum,
    totalHari,
    daftarHari,
    kategoriList,
    data,
    users,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { unitKerjaId, userId, bulan, tahun, format } = body;

    if (!bulan || !tahun || !format) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    const report = await getReportData(unitKerjaId || null, bulan, tahun, userId);

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
  const pageH = doc.internal.pageSize.getHeight();

  const nowWIB = getNowWIB();
  const cetakStr = `Cetak pada ${HARI_INDONESIA[nowWIB.getUTCDay()]}, ${nowWIB.getUTCDate()} ${BULAN_INDONESIA[nowWIB.getUTCMonth() + 1]} ${nowWIB.getUTCFullYear()} ${String(nowWIB.getUTCHours()).padStart(2, "0")}:${String(nowWIB.getUTCMinutes()).padStart(2, "0")}`;

  let cursorY = 15;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PEMERINTAH KABUPATEN TUBAN", pageW / 2, cursorY, { align: "center" });
  cursorY += 7;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Perhitungan Presensi Bulanan", pageW / 2, cursorY, { align: "center" });
  cursorY += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${BULAN_INDONESIA[report.bulan]} ${report.tahun}`, pageW / 2, cursorY, { align: "center" });
  cursorY += 4;

  // Horizontal line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(14, cursorY, pageW - 14, cursorY);
  cursorY += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const unitStr = report.unitKerja
    ? `Nama Unit Kerja : ${report.unitKerja.nama}`
    : "Nama Unit Kerja : Semua Unit";
  doc.text(unitStr, 14, cursorY);
  doc.text(cetakStr, pageW - 14, cursorY, { align: "right" });
  cursorY += 8;

  const SUM_COLS = 5;
  const headRow1 = [
    { content: "No", rowSpan: 2, styles: { halign: "center", valign: "middle" } },
    { content: "Pegawai", rowSpan: 2, styles: { valign: "middle" } },
    { content: `Total Jam Kerja Harian (${BULAN_INDONESIA[report.bulan]} ${report.tahun})`, colSpan: report.totalHari, styles: { halign: "center" } },
    { content: "Ringkasan", colSpan: SUM_COLS, styles: { halign: "center" } },
  ];

  const headRow2: Array<{ content: string; styles?: any }> = [];
  for (const hari of report.daftarHari) {
    const isRed = hari.isLiburNasional;
    const isYellow = hari.isMinggu;
    headRow2.push({
      content: `${hari.tanggal}/${report.bulan}`,
      styles: {
        halign: "center",
        fillColor: isRed ? [254, 202, 202] : isYellow ? [254, 243, 199] : undefined,
        textColor: isRed ? [185, 28, 28] : isYellow ? [161, 98, 7] : undefined,
        fontSize: 6,
      } as any,
    });
  }
  headRow2.push(
    { content: "TJK", styles: { halign: "center", fontSize: 7 } as any },
    { content: "KJK", styles: { halign: "center", fontSize: 7 } as any },
    { content: "TOTAL\nKJK", styles: { halign: "center", fontSize: 6 } as any },
    { content: "TJL", styles: { halign: "center", fontSize: 7 } as any },
    { content: "TKS", styles: { halign: "center", fontSize: 7 } as any },
  );

  const body = report.data.map((row, i) => {
    const namaDisplay = row.nip ? `${row.nip}\n${row.nama}` : row.nama;
    const rowData: any[] = [
      { content: String(i + 1), styles: { halign: "center" } },
      { content: namaDisplay },
    ];
    for (let j = 0; j < report.totalHari; j++) {
      const h = row.harian[j];
      const hari = report.daftarHari[j];
      const isRed = hari.isLiburNasional;
      const isYellow = hari.isMinggu;

      let fillColor: number[] | undefined;
      let textColor: number[] | undefined;
      let content = "";

      if (h.type === "holiday" || h.type === "sunday" || h.type === "liburJadwal") {
        content = "-";
        fillColor = isRed ? [254, 202, 202] : isYellow ? [254, 243, 199] : [229, 231, 235];
        textColor = isRed ? [185, 28, 28] : isYellow ? [161, 98, 7] : [156, 163, 175];
      } else if (h.type === "checkmark") {
        content = "✔";
        fillColor = [220, 252, 231];
        textColor = [22, 163, 74];
      } else if (h.type === "code") {
        content = h.value || "";
        fillColor = [220, 252, 231];
        textColor = [22, 101, 52];
      } else if (h.type === "hours") {
        content = h.value || "";
      } else {
        content = "";
      }

      rowData.push({
        content,
        styles: {
          halign: "center",
          fillColor,
          textColor,
          fontSize: 6,
        } as any,
      });
    }

    const kjkMenit = row.kjkMenit;
    rowData.push(
      { content: minutesToHM(row.tjkMenit), styles: { halign: "center", fontSize: 7 } as any },
      { content: minutesToHM(kjkMenit), styles: { halign: "center", fontSize: 7, textColor: kjkMenit > 0 ? [220, 38, 38] : undefined } as any },
      { content: minutesToHM(kjkMenit), styles: { halign: "center", fontSize: 7, textColor: kjkMenit > 0 ? [220, 38, 38] : undefined } as any },
      { content: minutesToHM(row.tjlMenit), styles: { halign: "center", fontSize: 7 } as any },
      { content: String(row.tks), styles: { halign: "center", fontSize: 7, textColor: row.tks > 0 ? [220, 38, 38] : undefined } as any },
    );
    return rowData;
  });

  autoTable(doc, {
    startY: cursorY,
    head: [headRow1 as any, headRow2 as any],
    body: body as any,
    theme: "grid",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontSize: 7,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 6,
      cellPadding: 1,
      lineColor: [204, 204, 204],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 6 },
      1: { cellWidth: 35 },
    },
    didParseCell: (data: any) => {
      if (data.section === "head" && data.row.index === 0) {
        if (data.column.index === 0 || data.column.index === 1) {
        }
      }
    },
  });

  // @ts-ignore
  cursorY = (doc as any).lastAutoTable.finalY + 8;

  // === LEGENDS (single autoTable with 6 columns for horizontal layout) ===
  const totalW = pageW - 28;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Legenda", 14, cursorY);

  const legHead = [[
    { content: "a. Kategori Absensi", colSpan: 2, styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 7 } },
    { content: "b. Kode Total", colSpan: 2, styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 7 } },
    { content: "c. Kode Warna", colSpan: 2, styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 7 } },
  ], [
    { content: "Kode", styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold" } },
    { content: "Keterangan", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
    { content: "Kode", styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold" } },
    { content: "Keterangan", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
    { content: "Warna", styles: { halign: "center", fillColor: [243, 244, 246], fontStyle: "bold" } },
    { content: "Keterangan", styles: { fillColor: [243, 244, 246], fontStyle: "bold" } },
  ]];

  const kodeTotalRows = [
    ["TJK", "Total Jam Kerja"],
    ["KJK", "Kekurangan Jam Kerja"],
    ["TOTAL KJK", "Total Akumulasi Kekurangan Jam Kerja"],
    ["TJL", "Total Jam Lembur"],
    ["TKS", "Tanpa Keterangan Sah"],
  ];
  const warnaRows = [
    [{ content: "█", styles: { fillColor: [229, 231, 235], halign: "center" } }, "Tidak Ada Jadwal"],
    [{ content: "█", styles: { fillColor: [254, 202, 202], halign: "center" } }, "Hari Libur"],
    [{ content: "█", styles: { fillColor: [254, 243, 199], halign: "center" } }, "Hari Minggu"],
    [{ content: "█", styles: { fillColor: [220, 252, 231], halign: "center" } }, "Absensi (kode kategori tercatat)"],
  ];

  const maxRows = Math.max(report.kategoriList.length, kodeTotalRows.length, warnaRows.length);
  const legBody: any[] = [];
  for (let i = 0; i < maxRows; i++) {
    const kat = report.kategoriList[i];
    const kt = kodeTotalRows[i];
    const wr = warnaRows[i];
    legBody.push([
      kat ? kat.kode : "",
      kat ? kat.keterangan : "",
      kt ? kt[0] : "",
      kt ? kt[1] : "",
      wr ? wr[0] : "",
      wr ? wr[1] : "",
    ]);
  }

  autoTable(doc, {
    startY: cursorY + 1,
    head: legHead as any,
    body: legBody as any,
    theme: "grid",
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [55, 65, 81],
      fontStyle: "bold",
    },
    styles: { fontSize: 6, cellPadding: 1, lineColor: [204, 204, 204], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: totalW * 0.08, halign: "center" },
      1: { cellWidth: totalW * 0.22 },
      2: { cellWidth: totalW * 0.08, halign: "center" },
      3: { cellWidth: totalW * 0.22 },
      4: { cellWidth: totalW * 0.06, halign: "center" },
      5: { cellWidth: totalW * 0.22 },
    },
    tableWidth: totalW,
    margin: { left: 14 },
  });

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=laporan-presensi-${report.bulan}-${report.tahun}.pdf`,
    },
  });
}

async function generateXlsx(report: Awaited<ReturnType<typeof getReportData>>) {
  const ExcelJS = await import("exceljs");

  const wb = new ExcelJS.default.Workbook();
  wb.creator = "Absensi Puskesmas";
  wb.created = new Date();

  const nowWIB = getNowWIB();
  const cetakStr = `Cetak pada ${HARI_INDONESIA[nowWIB.getUTCDay()]}, ${nowWIB.getUTCDate()} ${BULAN_INDONESIA[nowWIB.getUTCMonth() + 1]} ${nowWIB.getUTCFullYear()} ${String(nowWIB.getUTCHours()).padStart(2, "0")}:${String(nowWIB.getUTCMinutes()).padStart(2, "0")}`;

  const unitStr = report.unitKerja
    ? `Nama Unit Kerja : ${report.unitKerja.nama}`
    : "Nama Unit Kerja : Semua Unit";

  const totalCols = 2 + report.totalHari + 5;

  // ── COLOR PALETTE ──
  const C = {
    white:   { argb: "FFFFFFFF" },
    black:   { argb: "FF000000" },
    headerBg:  { argb: "FF4472C4" },
    headerFg:  { argb: "FFFFFFFF" },
    border:    { argb: "FF999999" },
    accentBg:  { argb: "FFE2EFDA" },
    dangerBg:  { argb: "FFFCE4EC" },
    warnBg:    { argb: "FFFFF8E1" },
    mutedBg:   { argb: "FFF5F5F5" },
    titleBg:   { argb: "FF1F4E79" },
  };

  function borderStyle() {
    return {
      top:    { style: "thin" as const, color: C.border },
      bottom: { style: "thin" as const, color: C.border },
      left:   { style: "thin" as const, color: C.border },
      right:  { style: "thin" as const, color: C.border },
    };
  }

  function fontBase(bold = false, sz = 10, color = C.black) {
    return { name: "Calibri", size: sz, bold, color };
  }

  // ── SHEET 1 : Presensi ──
  const ws = wb.addWorksheet("Presensi Bulanan", {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, margins: {
      left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2,
    }},
  });

  // Row 1 – Title
  const r1 = ws.addRow(["PEMERINTAH KABUPATEN TUBAN"]);
  ws.mergeCells(1, 1, 1, totalCols);
  r1.eachCell((c) => { c.font = fontBase(true, 14, C.white); c.fill = { type: "pattern", pattern: "solid", fgColor: C.titleBg }; c.alignment = { horizontal: "center", vertical: "middle" }; });

  // Row 2 – Subtitle
  const r2 = ws.addRow(["Laporan Perhitungan Presensi Bulanan"]);
  ws.mergeCells(2, 1, 2, totalCols);
  r2.eachCell((c) => { c.font = fontBase(true, 12); c.alignment = { horizontal: "center", vertical: "middle" }; });

  // Row 3 – Month/Year
  const r3 = ws.addRow([`${BULAN_INDONESIA[report.bulan]} ${report.tahun}`]);
  ws.mergeCells(3, 1, 3, totalCols);
  r3.eachCell((c) => { c.font = fontBase(true, 11); c.alignment = { horizontal: "center", vertical: "middle" }; });

  // Row 4 – Info baris
  const r4 = ws.addRow([]);
  ws.mergeCells(4, 1, 4, totalCols - 1);
  r4.getCell(1).value = unitStr;
  r4.getCell(1).font = fontBase(false, 9);
  r4.getCell(totalCols).value = cetakStr;
  r4.getCell(totalCols).font = fontBase(false, 8, { argb: "FF888888" });
  r4.getCell(totalCols).alignment = { horizontal: "right" };

  // Header row 1 (label grup — di-merge horizontal)
  const hd1: (string | null)[] = Array.from({ length: totalCols }, () => null);
  const r5 = ws.addRow(hd1);
  ws.mergeCells(5, 3, 5, 2 + report.totalHari);
  ws.mergeCells(5, 3 + report.totalHari, 5, 7 + report.totalHari);
  ws.getCell(5, 3).value = `Total Jam Kerja Harian (${BULAN_INDONESIA[report.bulan]} ${report.tahun})`;
  ws.getCell(5, 3 + report.totalHari).value = "Ringkasan";

  // Header row 2 — tanggal, No, Pegawai, dan label ringkasan
  const hd2: (string | null)[] = ["No", "Pegawai"];
  for (let i = 0; i < report.totalHari; i++) hd2.push(`${i + 1}/${report.bulan}`);
  hd2.push("TJK", "KJK", "TOTAL KJK", "TJL", "TKS");
  const r6 = ws.addRow(hd2);

  // Merge vertical No & Pegawai (row 5-6)
  ws.mergeCells(5, 1, 6, 1);
  ws.mergeCells(5, 2, 6, 2);
  ws.getCell(5, 1).value = "No";
  ws.getCell(5, 2).value = "Pegawai";

  // Style header rows
  [r5, r6].forEach((row) => {
    row.eachCell((c) => {
      c.font = fontBase(true, 9, C.headerFg);
      c.fill = { type: "pattern", pattern: "solid", fgColor: C.headerBg };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = borderStyle();
    });
  });

  // Data rows
  for (let i = 0; i < report.data.length; i++) {
    const row = report.data[i];
    const vals: any[] = [i + 1, row.nip ? `${row.nip}\n${row.nama}` : row.nama];

    for (let j = 0; j < report.totalHari; j++) {
      const h = row.harian[j];
      if (h.type === "checkmark") vals.push("✔");
      else if (h.type === "code") vals.push(h.value || "");
      else if (h.type === "hours") vals.push(h.value || "");
      else if (h.type === "holiday") vals.push("LIBUR");
      else if (h.type === "sunday") vals.push("MINGGU");
      else if (h.type === "liburJadwal") vals.push("-");
      else vals.push("");
    }
    vals.push(
      minutesToHM(row.tjkMenit),
      minutesToHM(row.kjkMenit),
      minutesToHM(row.kjkMenit),
      minutesToHM(row.tjlMenit),
      row.tks
    );

    const r = ws.addRow(vals);
    const isEven = i % 2 === 0;
    r.eachCell((c, col) => {
      c.font = fontBase(false, 9);
      c.alignment = { horizontal: col === 1 ? "center" : col === 2 ? "left" : "center", vertical: "middle", wrapText: true };
      c.border = borderStyle();
      if (!isEven) c.fill = { type: "pattern", pattern: "solid", fgColor: C.mutedBg };

      // Highlight KJK / TOTAL KJK merah kalau > 0
      const headerLabel = r5.getCell(col).value?.toString() || "";
      if ((headerLabel === "KJK" || headerLabel === "TOTAL KJK") && (typeof c.value === "string" && c.value !== "0J0M")) {
        c.font = fontBase(true, 9, { argb: "FFD32F2F" });
      }
      if (headerLabel === "TKS" && c.value && Number(c.value) > 0) {
        c.font = fontBase(true, 9, { argb: "FFD32F2F" });
      }
    });
  }

  // Column widths
  const colWidths: any[] = [
    { width: 5 },   // No
    { width: 32 },  // Pegawai
    ...report.daftarHari.map(() => ({ width: 6.5 })),
    { width: 8 },   // TJK
    { width: 8 },   // KJK
    { width: 11 },  // TOTAL KJK
    { width: 8 },   // TJL
    { width: 5 },   // TKS
  ];
  ws.columns = colWidths;

  // Row heights
  [1, 2, 3, 4].forEach((rn) => { ws.getRow(rn).height = 22; });
  [5, 6].forEach((rn) => { ws.getRow(rn).height = 32; });
  for (let rn = 7; rn < 7 + report.data.length; rn++) {
    ws.getRow(rn).height = 20;
  }

  // ── SHEET 2 : Legenda ──
  const ws2 = wb.addWorksheet("Legenda");

  const kodeTotalRows = [
    ["TJK", "Total Jam Kerja"],
    ["KJK", "Kekurangan Jam Kerja"],
    ["TOTAL KJK", "Total Akumulasi Kekurangan Jam Kerja"],
    ["TJL", "Total Jam Lembur"],
    ["TKS", "Tanpa Keterangan Sah"],
  ];
  const warnaRows = [
    ["Abu-abu", "Tidak Ada Jadwal"],
    ["Merah", "Hari Libur"],
    ["Kuning", "Hari Minggu"],
    ["Hijau", "Absensi (kode kategori tercatat)"],
  ];

  const maxRows = Math.max(report.kategoriList.length, kodeTotalRows.length, warnaRows.length);

  // Title row
  const lt = ws2.addRow(["a. Kategori Absensi", "", "b. Kode Total", "", "c. Kode Warna", ""]);
  ws2.mergeCells(1, 1, 1, 2);
  ws2.mergeCells(1, 3, 1, 4);
  ws2.mergeCells(1, 5, 1, 6);
  lt.eachCell((c) => { c.font = fontBase(true, 10); c.alignment = { horizontal: "center" }; });

  // Header row
  const lh = ws2.addRow(["Kode", "Keterangan", "Kode", "Keterangan", "Warna", "Keterangan"]);
  lh.eachCell((c) => { c.font = fontBase(true, 9); c.fill = { type: "pattern", pattern: "solid", fgColor: C.headerBg }; c.font = fontBase(true, 9, C.headerFg); c.alignment = { horizontal: "center" }; c.border = borderStyle(); });

  // Body rows
  for (let i = 0; i < maxRows; i++) {
    const kat = report.kategoriList[i];
    const kt = kodeTotalRows[i];
    const wr = warnaRows[i];
    const r = ws2.addRow([
      kat ? kat.kode : "",
      kat ? kat.keterangan : "",
      kt ? kt[0] : "",
      kt ? kt[1] : "",
      wr ? wr[0] : "",
      wr ? wr[1] : "",
    ]);
    r.eachCell((c) => { c.font = fontBase(false, 9); c.alignment = { vertical: "middle" }; c.border = borderStyle(); });
  }

  ws2.columns = [
    { width: 14 },
    { width: 40 },
    { width: 14 },
    { width: 42 },
    { width: 14 },
    { width: 40 },
  ];

  // ── WRITE ──
  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=laporan-presensi-${report.bulan}-${report.tahun}.xlsx`,
    },
  });
}
