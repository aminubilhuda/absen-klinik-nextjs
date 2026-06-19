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
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  const nowWIB = getNowWIB();
  const cetakStr = `Cetak pada ${HARI_INDONESIA[nowWIB.getUTCDay()]}, ${nowWIB.getUTCDate()} ${BULAN_INDONESIA[nowWIB.getUTCMonth() + 1]} ${nowWIB.getUTCFullYear()} ${String(nowWIB.getUTCHours()).padStart(2, "0")}:${String(nowWIB.getUTCMinutes()).padStart(2, "0")}`;

  const unitStr = report.unitKerja
    ? `Nama Unit Kerja : ${report.unitKerja.nama}`
    : "Nama Unit Kerja : Semua Unit";

  const totalCols = 2 + report.totalHari + 5;

  const titleRow: any[] = new Array(totalCols).fill("");
  titleRow[0] = "PEMERINTAH KABUPATEN TUBAN";

  const subtitleRow: any[] = new Array(totalCols).fill("");
  subtitleRow[0] = "Laporan Perhitungan Presensi Bulanan";

  const monthRow: any[] = new Array(totalCols).fill("");
  monthRow[0] = `${BULAN_INDONESIA[report.bulan]} ${report.tahun}`;

  const infoRow: any[] = new Array(totalCols).fill("");
  infoRow[0] = unitStr;
  infoRow[totalCols - 1] = cetakStr;

  const emptyRow: any[] = new Array(totalCols).fill("");

  const headerRow1: any[] = ["", ""];
  const headerRow2: any[] = ["No", "Pegawai"];

  for (const hari of report.daftarHari) {
    headerRow1.push(`${hari.tanggal}/${report.bulan}`);
    headerRow2.push("");
  }
  headerRow1.push("TJK", "KJK", "TOTAL KJK", "TJL", "TKS");
  headerRow2.push("TJK", "KJK", "TOTAL KJK", "TJL", "TKS");

  const dataRows = report.data.map((row, i) => {
    const r: any[] = [i + 1, row.nip ? `${row.nip}\n${row.nama}` : row.nama];
    for (let j = 0; j < report.totalHari; j++) {
      const h = row.harian[j];
      if (h.type === "checkmark") r.push("✔");
      else if (h.type === "code") r.push(h.value || "");
      else if (h.type === "hours") r.push(h.value || "");
      else if (h.type === "holiday") r.push("LIBUR");
      else if (h.type === "sunday") r.push("MINGGU");
      else if (h.type === "liburJadwal") r.push("-");
      else r.push("");
    }
    r.push(minutesToHM(row.tjkMenit));
    r.push(minutesToHM(row.kjkMenit));
    r.push(minutesToHM(row.kjkMenit));
    r.push(minutesToHM(row.tjlMenit));
    r.push(row.tks);
    return r;
  });

  const wsData = [titleRow, subtitleRow, monthRow, infoRow, emptyRow, headerRow1, headerRow2, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 1 + report.totalHari } },
    { s: { r: 5, c: 2 + report.totalHari }, e: { r: 5, c: 6 + report.totalHari } },
  ];
  ws["!merges"] = merges;

  ws["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    ...report.daftarHari.map(() => ({ wch: 6 })),
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 5 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Presensi Bulanan");

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

  const legTitleRow: any[] = ["a. Kategori Absensi", "", "b. Kode Total", "", "c. Kode Warna", ""];
  const legHeaderRow: any[] = ["Kode", "Keterangan", "Kode", "Keterangan", "Warna", "Keterangan"];
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

  const legData = [legTitleRow, legHeaderRow, ...legBody];
  const ws2 = XLSX.utils.aoa_to_sheet(legData);

  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 5 } },
  ];

  ws2["!cols"] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 40 },
    { wch: 12 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Legenda");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=laporan-presensi-${report.bulan}-${report.tahun}.xlsx`,
    },
  });
}
