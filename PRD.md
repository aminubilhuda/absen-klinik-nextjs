# PRD (Product Requirements Document)
## Sistem Absensi Klinik Berbasis Lokasi (GPS)

**Versi:** 1.0
**Tanggal:** 17 Juni 2026
**Status:** Draft

---

## 1. Latar Belakang & Tujuan

Klinik membutuhkan sistem absensi digital untuk menggantikan absensi manual (kertas/buku), dengan validasi lokasi berbasis GPS agar karyawan hanya bisa absen ketika berada di area klinik. Sistem ini juga menyediakan pengelolaan izin/cuti, jadwal kerja yang fleksibel per hari, serta laporan kehadiran yang bisa diekspor.

**Tujuan utama:**
- Memastikan karyawan absen secara fisik di lokasi klinik (anti-fraud lokasi).
- Mempermudah Admin/HR dalam merekap kehadiran dan mengelola pengajuan izin/cuti.
- Menyediakan akses yang mudah melalui PWA (installable, bisa dipakai semi-offline) tanpa perlu publish ke App Store/Play Store.

---

## 2. Target Pengguna & Role

| Role | Deskripsi | Akses Utama |
|---|---|---|
| **Karyawan** | Staf klinik (perawat, dokter, admin klinik, dll) | Registrasi akun, absen masuk/keluar, lihat riwayat absensi sendiri, ajukan izin/cuti, lihat status pengajuan |
| **Admin/HR** | Pengelola data kepegawaian dan kehadiran | Approve registrasi karyawan, kelola data karyawan, atur jam kerja, atur lokasi & radius klinik, approve/reject izin-cuti, lihat & export laporan kehadiran, kirim notifikasi |

> Catatan: Sistem ini dirancang untuk **single-location** (1 klinik). Tidak ada konsep multi-cabang di versi ini.

---

## 3. Tech Stack

| Komponen | Teknologi |
|---|---|
| Framework | Next.js (App Router) — full-stack, frontend + API Routes dalam satu project |
| Database | MySQL |
| ORM | Prisma |
| Autentikasi | NextAuth.js |
| Peta/Lokasi | Leaflet.js (OpenStreetMap tiles) |
| PWA | next-pwa (atau setara), installable + offline cache |
| Notifikasi | Web Push Notification (Push API + Service Worker) |
| Hosting | Self-hosted (VPS) |
| Export Laporan | Excel (.xlsx) & PDF |

---

## 4. Fitur & Requirement Fungsional

### 4.1 Autentikasi & Registrasi
- Karyawan melakukan **registrasi mandiri** (self-register) dengan mengisi data diri (nama, email, no. HP, password, dll).
- Akun karyawan berstatus **"Pending"** setelah registrasi dan **tidak bisa login/absen** sampai disetujui Admin.
- Admin menerima notifikasi/daftar permintaan registrasi baru, dapat **Approve** atau **Reject**.
- Setelah di-approve, status akun menjadi **"Active"** dan karyawan bisa login.
- Login menggunakan NextAuth.js (credentials provider: email + password, hashing dengan bcrypt/argon2).
- Role-based access control (RBAC): Karyawan vs Admin diarahkan ke dashboard berbeda sesuai role.

### 4.2 Manajemen Lokasi Klinik
- Admin mengatur **titik koordinat klinik** (latitude, longitude) melalui peta interaktif (Leaflet) — klik di peta atau cari alamat untuk menentukan titik pusat.
- Admin mengatur **radius toleransi absen** (dalam meter), nilai ini dapat diubah kapan saja oleh Admin.
- Sistem hanya menyimpan **satu titik lokasi klinik** (karena single-location).

### 4.3 Absensi (Check-in / Check-out)
- Karyawan melakukan absen masuk dan absen keluar dari halaman absensi.
- Saat absen, browser meminta izin akses GPS (Geolocation API).
- Sistem menghitung jarak antara koordinat karyawan saat itu dengan titik koordinat klinik (formula Haversine).
- **Validasi:**
  - Jika jarak ≤ radius yang ditentukan Admin → absen **berhasil**, tersimpan dengan timestamp + koordinat.
  - Jika jarak > radius → absen **ditolak**, sistem menampilkan pesan error beserta estimasi jarak dari klinik.
- Setiap record absensi menyimpan: waktu, koordinat karyawan, jarak dari klinik, status (tepat waktu/terlambat).
- Karyawan hanya bisa melakukan 1x check-in dan 1x check-out per hari (kecuali diatur lain oleh Admin).

### 4.4 Jadwal & Jam Kerja
- Admin dapat mengatur **jadwal kerja mingguan** yang berlaku untuk seluruh karyawan, dengan jam masuk & jam keluar berbeda per hari. Contoh default:
  | Hari | Jam Masuk | Jam Keluar |
  |---|---|---|
  | Senin–Kamis | 07:00 | 14:00 |
  | Jumat | 07:00 | 11:00 |
  | Sabtu | 07:00 | 12:30 |
  | Minggu | — (libur) | — |
- Jadwal ini dapat diubah sewaktu-waktu oleh Admin melalui halaman pengaturan jadwal.
- *(Catatan untuk pengembangan lanjutan/opsional, di luar versi 1.0: jadwal per-individu/per-jabatan jika suatu saat dibutuhkan.)*

### 4.5 Status Keterlambatan
- Status absen otomatis ditandai:
  - **Tepat Waktu** — check-in dilakukan pada atau sebelum jam masuk sesuai jadwal hari itu.
  - **Terlambat** — check-in dilakukan setelah jam masuk (tanpa toleransi waktu di versi 1.0; perhitungan langsung berdasarkan selisih waktu).
- Sistem mencatat **durasi keterlambatan** (dalam menit) untuk keperluan laporan.

### 4.6 Pengajuan Izin/Cuti
- Karyawan dapat mengajukan izin/cuti melalui form, dengan data: jenis (izin/sakit/cuti), tanggal mulai, tanggal akhir, alasan/keterangan, dan opsional lampiran (foto surat dokter, dll).
- Status pengajuan: **Pending → Approved/Rejected** oleh Admin.
- Karyawan dapat melihat riwayat & status pengajuannya sendiri.
- Admin dapat melihat seluruh pengajuan, memberi catatan/alasan saat reject, dan riwayat keputusan.
- Tanggal yang disetujui sebagai izin/cuti tidak dihitung sebagai alpha/tidak hadir dalam laporan kehadiran.

### 4.7 Laporan & Export
- Admin dapat melihat rekap kehadiran dengan filter: per karyawan, rentang tanggal, status (hadir/terlambat/izin/alpha).
- Laporan menampilkan ringkasan: total hadir, total terlambat, total izin/cuti, total alpha, per karyawan.
- Export laporan dalam format **Excel (.xlsx)** dan **PDF**.
- Karyawan juga dapat melihat & mengunduh riwayat kehadiran pribadinya sendiri.

### 4.8 Notifikasi (Push Notification via PWA)
- Sistem mengirim **push notification** untuk:
  - Reminder absen masuk (mendekati/saat jam masuk sesuai jadwal hari itu).
  - Reminder absen keluar (mendekati/saat jam keluar sesuai jadwal).
  - Hasil approval/reject pengajuan izin-cuti (ke karyawan).
  - Notifikasi ada registrasi/pengajuan baru yang perlu ditindak (ke Admin).
- Menggunakan Web Push API + Service Worker (memerlukan persetujuan izin notifikasi dari pengguna di browser).

### 4.9 PWA (Progressive Web App)
- Aplikasi dapat **diinstall** ke home screen (Add to Home Screen) di Android/iOS/Desktop.
- Memiliki **App Manifest** (nama, icon, theme color, dll).
- **Service Worker** untuk caching aset statis (HTML/CSS/JS) dan halaman yang sudah pernah dibuka, sehingga UI tetap bisa dimuat dalam kondisi koneksi lemah/offline.
- Aksi yang membutuhkan koneksi (absen, submit izin) akan menunggu/menampilkan pesan jika offline; idealnya request absen di-queue dan otomatis terkirim saat koneksi kembali tersedia *(detail strategi offline-sync dapat difinalisasi saat tahap teknis)*.

---

## 5. Alur Pengguna (User Flow Ringkas)

**Karyawan baru:**
1. Buka aplikasi → klik "Daftar" → isi data diri → submit.
2. Status akun "Pending" → menunggu approval Admin.
3. Setelah disetujui, menerima notifikasi → login.

**Absen harian:**
1. Karyawan login → buka halaman "Absen".
2. Klik "Absen Masuk" → browser minta izin lokasi → sistem cek jarak ke klinik.
3. Jika dalam radius → absen tersukses & tersimpan, status (tepat waktu/terlambat) langsung muncul.
4. Di akhir jam kerja, karyawan klik "Absen Keluar" dengan validasi lokasi yang sama.

**Pengajuan izin:**
1. Karyawan buka menu "Izin/Cuti" → isi form → submit.
2. Admin menerima notifikasi → review → approve/reject.
3. Karyawan menerima notifikasi hasil keputusan.

**Admin mengelola laporan:**
1. Admin buka menu "Laporan" → pilih filter (karyawan/tanggal).
2. Lihat rekap → klik export → pilih format Excel/PDF → unduh.

---

## 6. Skema Data (Awal/Tinggi-Level)

> Skema final akan dituangkan sebagai Prisma schema saat tahap development. Berikut entitas inti:

- **User** (id, nama, email, password_hash, no_hp, role [karyawan/admin], status [pending/active/rejected], created_at)
- **ClinicSetting** (id, latitude, longitude, radius_meter, nama_klinik)
- **WorkSchedule** (id, hari [senin..minggu], jam_masuk, jam_keluar, is_libur)
- **Attendance** (id, user_id, tanggal, waktu_checkin, lat_checkin, lng_checkin, waktu_checkout, lat_checkout, lng_checkout, status [tepat_waktu/terlambat], menit_terlambat)
- **LeaveRequest** (id, user_id, jenis [izin/sakit/cuti], tanggal_mulai, tanggal_akhir, alasan, lampiran_url, status [pending/approved/rejected], catatan_admin, reviewed_by, reviewed_at)
- **PushSubscription** (id, user_id, endpoint, keys) — untuk menyimpan subscription Web Push per device karyawan.

---

## 7. Requirement Non-Fungsional

- **Keamanan:** Password di-hash (bcrypt/argon2), validasi sisi server untuk semua input, proteksi route berdasarkan role (middleware Next.js), HTTPS wajib di production (untuk Geolocation API & Push API yang memang mensyaratkan secure context).
- **Akurasi Lokasi:** Mengandalkan akurasi GPS perangkat karyawan; perlu mempertimbangkan toleransi akurasi GPS (accuracy radius) bawaan browser saat validasi.
- **Performa:** Halaman absen harus ringan & cepat dimuat (mengingat dipakai setiap hari, idealnya < 2 detik di koneksi 3G/4G biasa).
- **Ketersediaan:** Karena self-hosted di VPS, perlu strategi backup database (MySQL dump terjadwal) dan monitoring uptime dasar.
- **Skalabilitas:** Dirancang untuk skala 1 klinik (puluhan karyawan); arsitektur tetap modular agar mudah dikembangkan ke multi-klinik di masa depan bila diperlukan.
- **Kompatibilitas:** PWA harus berjalan baik di Chrome/Safari Android & iOS (perhatikan perbedaan dukungan PWA/Push Notification di iOS Safari, yang masih punya beberapa batasan).

---

## 8. Batasan & Asumsi (Out of Scope untuk v1.0)

- Tidak ada fitur multi-cabang/multi-klinik.
- Tidak ada validasi tambahan seperti foto selfie atau QR code saat absen (hanya GPS).
- Tidak ada integrasi payroll/penggajian.
- Tidak ada toleransi waktu keterlambatan (grace period) — keterlambatan dihitung langsung dari jam masuk yang ditentukan.
- Tidak direncanakan publish ke Google Play/App Store (cukup PWA dari browser).

---

## 9. Pertanyaan/Hal yang Masih Perlu Difinalisasi

Beberapa keputusan kecil yang sebaiknya didiskusikan lagi sebelum/saat development:

1. Apakah dibutuhkan **grace period** (toleransi beberapa menit) sebelum status "Terlambat" diterapkan? (saat ini diasumsikan tidak ada toleransi)
2. Bagaimana strategi **offline-sync** untuk aksi absen jika sinyal benar-benar hilang saat di lokasi klinik (auto-retry, queue, atau wajib online)?
3. Apakah karyawan yang resign/nonaktif perlu fitur "deactivate" (bukan hapus) agar histori datanya tetap ada?
4. Apakah dibutuhkan halaman dashboard ringkas (statistik) untuk Admin di halaman utama, atau cukup halaman laporan saja?

---

## 10. Milestone/Tahapan Pengembangan (Saran)

| Fase | Cakupan |
|---|---|
| 1 | Setup project (Next.js, Prisma, MySQL, NextAuth) + skema database |
| 2 | Autentikasi & registrasi + approval Admin |
| 3 | Manajemen lokasi klinik (Leaflet) + jadwal kerja |
| 4 | Fitur absensi (check-in/out + validasi GPS + status terlambat) |
| 5 | Pengajuan izin/cuti + approval flow |
| 6 | Laporan & export (Excel/PDF) |
| 7 | PWA (manifest, service worker, offline cache) + Push Notification |
| 8 | Testing, hardening keamanan, deployment ke VPS |

---

*Dokumen ini adalah draft awal dan dapat berkembang seiring diskusi lebih lanjut dengan tim/stakeholder.*
