import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);

  // Create admin
  await prisma.user.upsert({
    where: { email: "admin@puskesmas.com" },
    update: {},
    create: {
      nama: "Admin Puskesmas",
      email: "admin@puskesmas.com",
      passwordHash: adminPassword,
      noHp: "081234567890",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Create default schedules
  const days = [
    { day: "SENIN" as const, jamMasuk: "07:00", jamKeluar: "14:00", isLibur: false },
    { day: "SELASA" as const, jamMasuk: "07:00", jamKeluar: "14:00", isLibur: false },
    { day: "RABU" as const, jamMasuk: "07:00", jamKeluar: "14:00", isLibur: false },
    { day: "KAMIS" as const, jamMasuk: "07:00", jamKeluar: "14:00", isLibur: false },
    { day: "JUMAT" as const, jamMasuk: "07:00", jamKeluar: "11:00", isLibur: false },
    { day: "SABTU" as const, jamMasuk: "07:00", jamKeluar: "12:30", isLibur: false },
    { day: "MINGGU" as const, jamMasuk: null, jamKeluar: null, isLibur: true },
  ];

  for (const d of days) {
    await prisma.workSchedule.upsert({
      where: { day: d.day },
      update: d,
      create: d,
    });
  }

  // Create default clinic setting
  await prisma.clinicSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      latitude: -6.2,
      longitude: 106.8,
      radiusMeter: 100,
      namaKlinik: "Puskesmas Sehat",
    },
  });

  console.log("Seed berhasil!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
