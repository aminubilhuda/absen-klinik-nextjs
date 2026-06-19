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

  // Seed Kategori Absensi
  const kategoriAbsensi = [
    // Existing codes (non-izin)
    { kode: "TB", keterangan: "Tugas Belajar" },
    { kode: "MFTB", keterangan: "Mesin Fingerprint tidak berfungsi/data jari tidak terbaca" },
    { kode: "JP", keterangan: "PIKET" },
    { kode: "DL", keterangan: "Dinas Luar" },
    { kode: "DT", keterangan: "Dispensasi Dinas" },
    { kode: "CSKT", keterangan: "Cuti Sakit" },
    { kode: "CBSLN", keterangan: "Cuti Bersalin" },
    { kode: "CALP", keterangan: "Cuti Alasan Penting" },
    { kode: "LD", keterangan: "Lepas Dinas" },
    { kode: "WFH", keterangan: "Maintenance" },
    { kode: "DBW", keterangan: "Diklat/Bimtek/Workshop" },
    { kode: "CTHN", keterangan: "Cuti Tahunan" },
    { kode: "CBSR", keterangan: "Cuti Besar" },
    { kode: "UP", keterangan: "Upacara" },
    { kode: "SPT", keterangan: "Surat Perintah Tugas" },
    { kode: "KBBS", keterangan: "Kerja Bakti/Bakti Sosial/Kegiatan Pagi-Sore" },
    { kode: "wfh_2", keterangan: "Pelaksanaan WFH" },
    { kode: "HJT", keterangan: "HJT 732" },
    { kode: "IJ", keterangan: "Ijin" },
    { kode: "DK", keterangan: "Dispensasi Pribadi" },
    { kode: "SE", keterangan: "Surat Edaran" },
    // Izin categories (isIzin: true)
    { kode: "I", keterangan: "Izin", isIzin: true },
    { kode: "S", keterangan: "Sakit", isIzin: true },
    { kode: "C", keterangan: "Cuti", isIzin: true },
  ];

  for (const k of kategoriAbsensi) {
    await prisma.kategoriAbsensi.upsert({
      where: { kode: k.kode },
      update: { isIzin: k.isIzin || false },
      create: { kode: k.kode, keterangan: k.keterangan, isIzin: k.isIzin || false },
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
