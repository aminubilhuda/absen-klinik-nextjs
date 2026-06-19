export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/prisma");
  const body = await req.json();
  const { endpoint, keys, userId } = body;
  const endpointHash = createHash("sha256").update(endpoint).digest("hex");

  const sub = await prisma.pushSubscription.upsert({
    where: { userId_endpointHash: { userId, endpointHash } },
    create: { userId, endpoint, endpointHash, keys: JSON.stringify(keys) },
    update: { keys: JSON.stringify(keys) },
  });

  return NextResponse.json({ message: "Subscribed" });
}
