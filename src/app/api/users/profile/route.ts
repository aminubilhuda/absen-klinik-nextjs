export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nama, noHp } = await req.json();

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(nama !== undefined && { nama }),
      ...(noHp !== undefined && { noHp }),
    },
  });

  return NextResponse.json({
    message: "Profil berhasil diperbarui",
    user: { id: user.id, nama: user.nama, email: user.email, noHp: user.noHp },
  });
}
