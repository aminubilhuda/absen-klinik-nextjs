export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDateInWIB } from "@/lib/date";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const today = getDateInWIB();

  const [totalKaryawan, hadirHariIni, pendingLeaves, pendingUsers] = await Promise.all([
    prisma.user.count({ where: { role: "KARYAWAN", status: "ACTIVE" } }),
    prisma.attendance.count({
      where: { tanggal: today, waktuCheckin: { not: null } },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
  ]);

  return NextResponse.json({
    totalKaryawan,
    hadirHariIni,
    pendingLeaves,
    pendingUsers,
  });
}
