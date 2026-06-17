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
  const role = url.searchParams.get("role");

  const where: any = {};
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nama: true,
      email: true,
      noHp: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}
