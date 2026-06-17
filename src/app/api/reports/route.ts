export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const where: any = {};
  if (userId) where.userId = userId;
  if (startDate) where.tanggal = { ...(where.tanggal || {}), gte: new Date(startDate) };
  if (endDate) where.tanggal = { ...(where.tanggal || {}), lte: new Date(endDate) };

  const records = await prisma.attendance.findMany({
    where,
    include: { user: { select: { nama: true, email: true } } },
    orderBy: { tanggal: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { format, userId, startDate, endDate } = body;

  const where: any = {};
  if (userId) where.userId = userId;
  if (startDate) where.tanggal = { ...(where.tanggal || {}), gte: new Date(startDate) };
  if (endDate) where.tanggal = { ...(where.tanggal || {}), lte: new Date(endDate) };

  const records = await prisma.attendance.findMany({
    where,
    include: { user: { select: { nama: true } } },
    orderBy: [{ userId: "asc" }, { tanggal: "asc" }],
  });

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const data = records.map((r) => ({
      Nama: r.user.nama,
      Tanggal: r.tanggal.toISOString().split("T")[0],
      "Check-in": r.waktuCheckin?.toLocaleTimeString("id-ID"),
      "Check-out": r.waktuCheckout?.toLocaleTimeString("id-ID"),
      Status: r.status === "TEPAT_WAKTU" ? "Tepat Waktu" : `Terlambat ${r.menitTerlambat}m`,
      Jarak: r.jarakCheckin ? `${r.jarakCheckin}m` : "-",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=laporan-absensi.xlsx`,
      },
    });
  }

  if (format === "pdf") {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.text("Laporan Absensi Klinik", 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [["Nama", "Tanggal", "Masuk", "Keluar", "Status"]],
      body: records.map((r) => [
        r.user.nama,
        r.tanggal.toISOString().split("T")[0],
        r.waktuCheckin?.toLocaleTimeString("id-ID") || "-",
        r.waktuCheckout?.toLocaleTimeString("id-ID") || "-",
        r.status === "TEPAT_WAKTU" ? "Tepat Waktu" : `Terlambat ${r.menitTerlambat}m`,
      ]),
    });
    const buf = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=laporan-absensi.pdf`,
      },
    });
  }

  return NextResponse.json({ records });
}
