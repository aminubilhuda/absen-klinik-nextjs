export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNowWIB } from "@/lib/date";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { id } = await params;
  const body = await req.json();
  const { status, catatanAdmin } = body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Pengajuan sudah diproses" }, { status: 409 });
  }

  const userExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });

  try {
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        catatanAdmin: catatanAdmin || null,
        ...(userExists ? { reviewedBy: session.user.id } : {}),
        reviewedAt: getNowWIB(),
      },
    });

    if (status === "APPROVED") {
      const tglMulai = new Date(existing.tanggalMulai);
      const tglAkhir = new Date(existing.tanggalAkhir);
      const attendanceRecords: { userId: string; tanggal: Date; kategoriAbsensiId: string | null }[] = [];

      const current = new Date(tglMulai);
      while (current <= tglAkhir) {
        attendanceRecords.push({
          userId: existing.userId,
          tanggal: new Date(current),
          kategoriAbsensiId: existing.kategoriAbsensiId,
        });
        current.setDate(current.getDate() + 1);
      }

      for (const rec of attendanceRecords) {
        await prisma.attendance.upsert({
          where: { userId_tanggal: { userId: rec.userId, tanggal: rec.tanggal } },
          update: { kategoriAbsensiId: rec.kategoriAbsensiId },
          create: {
            userId: rec.userId,
            tanggal: rec.tanggal,
            kategoriAbsensiId: rec.kategoriAbsensiId,
            status: "TEPAT_WAKTU",
          },
        });
      }
    }

    return NextResponse.json({ message: `Pengajuan ${status === "APPROVED" ? "disetujui" : "ditolak"}`, leave });
  } catch (e) {
    console.error("Gagal review pengajuan:", e);
    return NextResponse.json({ error: "Gagal memproses pengajuan" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const { id } = await params;
  const body = await req.json();
  const { kategoriAbsensiId, tanggalMulai, tanggalAkhir, alasan, lampiran } = body;

  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Hanya pengajuan pending yang bisa diubah" }, { status: 409 });
  }

  const updateData: any = {};
  if (kategoriAbsensiId) {
    const katExists = await prisma.kategoriAbsensi.findUnique({ where: { id: kategoriAbsensiId }, select: { id: true } });
    if (!katExists) {
      return NextResponse.json({ error: "Jenis izin tidak valid" }, { status: 400 });
    }
    updateData.kategoriAbsensiId = kategoriAbsensiId;
  }
  if (tanggalMulai && tanggalAkhir) {
    const tglMulai = new Date(tanggalMulai);
    const tglAkhir = new Date(tanggalAkhir);
    if (tglAkhir < tglMulai) {
      return NextResponse.json({ error: "Tanggal akhir tidak boleh sebelum tanggal mulai" }, { status: 400 });
    }
    updateData.tanggalMulai = tglMulai;
    updateData.tanggalAkhir = tglAkhir;
  }
  if (alasan) updateData.alasan = alasan;

  if (lampiran?.base64) {
    try {
      const matches = lampiran.base64.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        const { writeFile, mkdir } = await import("fs/promises");
        const pathMod = await import("path");
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
        const dir = pathMod.default.join(process.cwd(), "public/uploads/leave");
        await mkdir(dir, { recursive: true });
        const now = new Date();
        const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
        const filename = `${session.user.id}_${ts}.${ext}`;
        await writeFile(pathMod.default.join(dir, filename), buffer);
        updateData.lampiranUrl = `/uploads/leave/${filename}`;
      }
    } catch (e) {
      console.error("Gagal menyimpan lampiran:", e);
    }
  }

  try {
    const leave = await prisma.leaveRequest.update({ where: { id }, data: updateData });
    return NextResponse.json({ message: "Pengajuan berhasil diubah", leave });
  } catch (e) {
    console.error("Gagal mengubah pengajuan:", e);
    return NextResponse.json({ error: "Gagal mengubah pengajuan" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const { id } = await params;

  const existing = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (existing.userId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (existing.status !== "PENDING" && !isAdmin) {
    return NextResponse.json({ error: "Hanya pengajuan pending yang bisa dihapus" }, { status: 409 });
  }

  try {
    if (existing.status === "APPROVED") {
      const tglMulai = new Date(existing.tanggalMulai);
      const tglAkhir = new Date(existing.tanggalAkhir);
      const dates: Date[] = [];
      const current = new Date(tglMulai);
      while (current <= tglAkhir) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      for (const tanggal of dates) {
        await prisma.attendance.deleteMany({
          where: { userId: existing.userId, tanggal, kategoriAbsensiId: existing.kategoriAbsensiId },
        });
      }
    }

    await prisma.leaveRequest.delete({ where: { id } });
    return NextResponse.json({ message: "Pengajuan berhasil dihapus" });
  } catch (e) {
    console.error("Gagal menghapus pengajuan:", e);
    return NextResponse.json({ error: "Gagal menghapus pengajuan" }, { status: 500 });
  }
}
