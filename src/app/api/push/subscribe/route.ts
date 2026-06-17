export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { endpoint, keys, userId } = body;

  const sub = await prisma.pushSubscription.upsert({
    where: { id: endpoint },
    create: { userId, endpoint, keys: JSON.stringify(keys) },
    update: { keys: JSON.stringify(keys) },
  });

  return NextResponse.json({ message: "Subscribed" });
}
