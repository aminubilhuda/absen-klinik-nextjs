export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;
  const status = url.searchParams.get("status");

  const where: any = {};
  if (session.user.role === "KARYAWAN") {
    where.userId = session.user.id;
  }
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    where.status = status;
  }

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { nama: true, email: true } },
        kategoriAbsensi: { select: { id: true, kode: true, keterangan: true, warnaLabel: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return NextResponse.json({ leaves, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { kategoriAbsensiId, tanggalMulai, tanggalAkhir, alasan, lampiran } = body;

  if (!kategoriAbsensiId || !tanggalMulai || !tanggalAkhir || !alasan) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  const tglMulai = new Date(tanggalMulai);
  const tglAkhir = new Date(tanggalAkhir);

  if (tglAkhir < tglMulai) {
    return NextResponse.json({ error: "Tanggal akhir tidak boleh sebelum tanggal mulai" }, { status: 400 });
  }

  const kategori = await prisma.kategoriAbsensi.findUnique({ where: { id: kategoriAbsensiId } });
  if (!kategori || !kategori.isIzin) {
    return NextResponse.json({ error: "Kategori absensi tidak valid" }, { status: 400 });
  }

  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      AND: [
        { tanggalMulai: { lte: tglAkhir } },
        { tanggalAkhir: { gte: tglMulai } },
      ],
    },
  });
  if (overlapping) {
    return NextResponse.json({ error: "Sudah ada izin disetujui di tanggal tersebut" }, { status: 409 });
  }

  let lampiranUrl: string | null = null;

  if (lampiran?.base64) {
    try {
      const matches = lampiran.base64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
        }

        let ext = "jpg";
        if (mimeType === "application/pdf") ext = "pdf";
        else if (mimeType === "image/png") ext = "png";
        else if (mimeType === "image/webp") ext = "webp";
        else if (mimeType === "image/gif") ext = "gif";

        const dir = path.join(process.cwd(), "public/uploads/leave");
        await mkdir(dir, { recursive: true });

        const now = new Date();
        const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
        const filename = `${session.user.id}_${ts}.${ext}`;
        await writeFile(path.join(dir, filename), buffer);
        lampiranUrl = `/uploads/leave/${filename}`;
      }
    } catch (e) {
      console.error("Gagal menyimpan lampiran:", e);
    }
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      kategoriAbsensiId,
      tanggalMulai: tglMulai,
      tanggalAkhir: tglAkhir,
      alasan,
      lampiranUrl,
      status: "PENDING",
    },
  });

  return NextResponse.json({ message: "Pengajuan izin berhasil", leave });
}
