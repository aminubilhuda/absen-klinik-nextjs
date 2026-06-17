export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const { prisma } = await import("@/lib/prisma");
  const att = await prisma.attendance.findFirst({
    where: {
      userId: session.user.id,
      tanggal: today,
    },
  });

  return NextResponse.json({
    checkin: !!att?.waktuCheckin,
    checkout: !!att?.waktuCheckout,
    waktuCheckin: att?.waktuCheckin || null,
    waktuCheckout: att?.waktuCheckout || null,
    status: att?.status || null,
    menitTerlambat: att?.menitTerlambat || null,
    jarakCheckin: att?.jarakCheckin || null,
    jarakCheckout: att?.jarakCheckout || null,
  });
}
