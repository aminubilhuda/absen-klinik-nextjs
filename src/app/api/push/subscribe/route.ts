export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint tidak valid" }, { status: 400 });
  }
  if (!keys || typeof keys !== "object" || !keys.p256dh || !keys.auth) {
    return NextResponse.json({ error: "Keys tidak valid (p256dh dan auth diperlukan)" }, { status: 400 });
  }

  const userId = session.user.id;
  const endpointHash = createHash("sha256").update(endpoint).digest("hex");

  await prisma.pushSubscription.upsert({
    where: { userId_endpointHash: { userId, endpointHash } },
    create: { userId, endpoint, endpointHash, keys: JSON.stringify(keys) },
    update: { keys: JSON.stringify(keys) },
  });

  return NextResponse.json({ message: "Subscribed" });
}
