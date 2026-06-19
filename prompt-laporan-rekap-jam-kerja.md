# Prompt: Fitur Laporan Rekap Jam Kerja Harian Pegawai

Gunakan prompt di bawah ini untuk diberikan ke developer atau AI coding assistant (misalnya Claude Code, Cursor, dll) agar membangun fitur laporan sesuai kebutuhan.

---

## PROMPT

Buatkan saya fitur **Laporan Rekap Jam Kerja Harian Pegawai** pada aplikasi saya, dengan spesifikasi sebagai berikut:

### 1. Orientasi & Layout Halaman
- Orientasi kertas: **Landscape** (disarankan ukuran F4/Legal atau A4 Landscape, karena kolom tanggal cukup banyak).
- Header laporan terdiri dari:
  - Placeholder `[LOGO]` di sisi kiri header.
  - Judul aplikasi/instansi di tengah, contoh: `Nama Aplikasi`.
  - Garis horizontal pembatas di bawah header.
- Di bawah header, tampilkan informasi:
  - `Nama Unit Kerja: [diisi otomatis dari data unit kerja yang login/dipilih]` — contoh: "Puskesmas Palang".
  - (Opsional) Tambahkan info **Bulan & Tahun** laporan, misalnya "Periode: Juni 2026", karena tabel ini adalah rekap bulanan.

### 2. Struktur Tabel
Tabel memiliki 3 baris header bertingkat (merged cell) dan body data per pegawai:

**Baris Header 1:**
| No | Pegawai | Total Jam Kerja Harian (merged ke semua kolom tanggal) | Total (merged 2 kolom: TJK & KJK) |

**Baris Header 2:**
| (kosong) | Tanggal dan bulan | tgl/bulan (1 kolom per hari dalam bulan tsb) | TJK | KJK |

**Baris Body:**
| No urut | Nama Pegawai | Jam kerja harian per tanggal (format contoh: `7J20M`, `5J35M`) | Total Jam Kerja (TJK) | Kekurangan Jam Kerja (KJK) |

**Catatan kolom tanggal:**
- Jumlah kolom tanggal = jumlah hari dalam bulan yang dipilih (28–31 kolom).
- Setiap kolom diberi label tanggal (format header bisa `1`, `2`, `3`, dst, atau `tgl/bulan` sesuai kebutuhan tampilan).
- Format isi sel jam kerja: `[Jam]J[Menit]M`, contoh `7J20M` = 7 Jam 20 Menit. Sel kosong/`0` jika tidak ada data presensi.

### 3. Logika Pewarnaan Otomatis pada Kolom Tanggal
Terapkan pewarnaan **otomatis berbasis tanggal**, bukan input manual:

| Warna | Kondisi | Sumber Data |
|---|---|---|
| 🔴 **Merah** | Tanggal tersebut adalah **hari libur nasional** Indonesia (termasuk cuti bersama) | Ambil dari API/kalender hari libur nasional Indonesia (misalnya API Hari Libur Nasional Kemenag/Setkab, atau library kalender Indonesia). Sebaiknya disimpan di tabel referensi `hari_libur` di database (tanggal, keterangan) agar bisa diupdate tiap tahun. |
| 🟡 **Kuning** | Tanggal tersebut jatuh pada **hari Minggu** | Dihitung otomatis dari `DAYOFWEEK(tanggal)` — tidak perlu sumber eksternal. |
| ⚪ Putih/Default | Hari kerja biasa (Senin–Sabtu, bukan libur nasional) | — |

**Prioritas warna:** Jika tanggal adalah hari Minggu **dan** sekaligus hari libur nasional, warna yang ditampilkan adalah **Merah** (hari libur nasional menang/prioritas lebih tinggi daripada Minggu).

### 4. Logika Perhitungan TJK (Total Jam Kerja)
- TJK = akumulasi total jam kerja aktual pegawai tersebut selama satu bulan (sum semua jam kerja harian yang tercatat, dikonversi dan ditotal dalam format Jam & Menit, misal `150J30M`).
- Hari libur nasional (merah) dan hari Minggu (kuning) **tidak dihitung** sebagai jam kerja wajib, sehingga tidak menyumbang ke kekurangan jam kerja walau kosong.

### 5. Logika Perhitungan KJK (Kekurangan Jam Kerja)
- KJK = `Total Jam Kerja Wajib (sesuai jadwal/shift) - Total Jam Kerja Aktual (TJK)`, dengan minimum hasil 0 (tidak boleh negatif/lebih dianggap pengurang).
- **Aturan keterlambatan:** Jika pegawai **datang terlambat** dari jam masuk yang ditentukan (sesuai jadwal/shift kerja unit tersebut), maka selisih waktu keterlambatan tersebut **otomatis masuk sebagai penambah nilai KJK** pada hari itu.
- Demikian pula jika pegawai pulang lebih cepat dari jadwal (opsional, sesuaikan dengan kebijakan instansi — boleh dikonfirmasi ke pengguna apakah pulang cepat juga dihitung KJK).
- KJK dihitung otomatis dari selisih antara jam kerja seharusnya (berdasarkan jadwal/shift pegawai) vs jam kerja aktual hasil presensi (absen masuk/keluar), bukan input manual.

### 6. Sumber Data
- **Data pegawai**: dari modul Master Pegawai (Nama, Unit Kerja).
- **Data presensi harian**: dari modul Absensi/Presensi (jam masuk, jam keluar, status hadir/izin/sakit/alpha).
- **Data jadwal/shift kerja**: dari modul Jadwal Kerja/Shift, untuk menentukan jam kerja wajib per hari per pegawai.
- **Data hari libur nasional**: dari tabel referensi kalender libur (perlu diisi/sync tiap tahun, idealnya via integrasi API resmi pemerintah atau input admin tahunan).

### 7. Parameter Filter Laporan
Sediakan filter di atas tabel (boleh di luar area cetak) untuk:
- Pilih **Unit Kerja**.
- Pilih **Bulan** dan **Tahun**.
- Tombol **Cetak / Export** ke PDF dan/atau Excel, dengan orientasi landscape tetap terjaga saat export.

### 8. Output yang Diharapkan
- Tampilan **preview di web** sesuai struktur tabel di atas.
- Tombol **Export PDF** (landscape) dan **Export Excel** dengan styling warna (merah/kuning) ikut terbawa ke file export.
- Baris otomatis bertambah sesuai jumlah pegawai di unit kerja terpilih (tidak hardcode 23 baris).

---

### Catatan Tambahan untuk Developer
- Pastikan logika pewarnaan dan perhitungan KJK berjalan di **backend/server-side** (bukan hanya tampilan), supaya hasil export PDF/Excel konsisten dengan tampilan web.
- Sediakan kemampuan **override manual** oleh admin untuk kasus khusus (misal: tanggal merah lokal/cuti bersama yang belum tercatat di API, atau koreksi presensi pegawai), dengan log siapa yang mengubah.
- Pertimbangkan menambahkan baris terakhir berupa **Total/Rekap unit kerja** (total TJK & KJK semua pegawai) jika dibutuhkan untuk laporan ke atasan.

---

*Catatan: contoh angka pada gambar acuan (misal `7J2M`, `7J15M`, `5J35M`, `0M`) tampaknya data dummy/sample, bukan nilai final, jadi tidak perlu disamakan persis — yang penting format `[Jam]J[Menit]M` dan logika di atas diikuti.*
