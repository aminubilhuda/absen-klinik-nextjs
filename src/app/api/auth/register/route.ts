export const runtime = "nodejs";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, email, password, noHp } = body;

    if (!nama || !email || !password) {
      return NextResponse.json({ error: "Field wajib harus diisi" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        nama,
        email,
        passwordHash,
        noHp: noHp || null,
        role: "KARYAWAN",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      message: "Registrasi berhasil, menunggu approval admin",
      user: { id: user.id, nama: user.nama, email: user.email },
    });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
