export interface User {
  id: string;
  nama: string;
  email: string;
  noHp?: string;
  role: "KARYAWAN" | "ADMIN";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "DEACTIVATED";
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  tanggal: string;
  waktuCheckin?: string;
  latCheckin?: number;
  lngCheckin?: number;
  jarakCheckin?: number;
  waktuCheckout?: string;
  latCheckout?: number;
  lngCheckout?: number;
  jarakCheckout?: number;
  status: "TEPAT_WAKTU" | "TERLAMBAT";
  menitTerlambat?: number;
  kategoriAbsensiId?: string;
  fotoCheckin?: string;
  fotoCheckout?: string;
  user?: User;
  kategoriAbsensi?: KategoriAbsensi;
}

export interface ClinicSetting {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  namaKlinik: string;
}

export interface WorkSchedule {
  id: string;
  day: string;
  jamMasuk?: string;
  jamKeluar?: string;
  isLibur: boolean;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  kategoriAbsensiId: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  lampiranUrl?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  catatanAdmin?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  user?: User;
  kategoriAbsensi?: KategoriAbsensi;
}

export interface UnitKerja {
  id: string;
  nama: string;
  createdAt: string;
}

export interface KategoriAbsensi {
  id: string;
  kode: string;
  keterangan: string;
  warnaLabel?: string;
  isIzin: boolean;
}

export interface HariLibur {
  id: string;
  tanggal: string;
  keterangan: string;
  createdAt: string;
}

export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: "KARYAWAN" | "ADMIN";
    status: string;
  };
}
