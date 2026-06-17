export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");

  const records = await prisma.attendance.findMany({
    where: { userId: session.user.id },
    orderBy: { tanggal: "desc" },
    take: 30,
  });

  return NextResponse.json({ records });
}
