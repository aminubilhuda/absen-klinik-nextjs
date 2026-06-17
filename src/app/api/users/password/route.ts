export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { passwordLama, passwordBaru } = await req.json();

  if (!passwordLama || !passwordBaru) {
    return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
  }

  if (passwordBaru.length < 6) {
    return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(passwordLama, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(passwordBaru, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return NextResponse.json({ message: "Password berhasil diubah" });
}
