# Prompt: Laporan Perhitungan Presensi Bulanan (SIJEMPOL)

Gunakan prompt ini untuk membuat/memodifikasi fitur laporan presensi bulanan pada aplikasi, mengikuti format laporan resmi Pemerintah Kabupaten Tuban.

## Instruksi untuk AI / Developer

Buatkan modul/halaman laporan dengan struktur dan tampilan sebagai berikut:

### 1. Header Laporan
- Logo instansi (logo Pemerintah Kabupaten Tuban) di kiri atas, ukuran proporsional (±80x80px).
- Judul instansi: **"PEMERINTAH KABUPATEN TUBAN"** — huruf besar, bold, rata kiri sejajar logo.
- Judul laporan di tengah halaman:
  - Baris 1: **"Laporan Perhitungan Presensi Bulanan"**
  - Baris 2: **"[Nama Bulan] [Tahun]"** (contoh: April 2026)
- Garis pembatas tebal (horizontal rule) di bawah header.
- Informasi unit kerja: **"Nama Unit Kerja : [NAMA PUSKESMAS/UNIT]"** — ditampilkan rata kiri, di bawah judul, sebelum tabel.
- Timestamp cetak di pojok kanan atas tabel/halaman (footer cetak), format: `Cetak pada [Hari], [Tanggal] [Bulan] [Tahun] [HH:MM]` (contoh: "Cetak pada Selasa, 5 Mei 2026 08:36").

### 2. Struktur Tabel Utama
Tabel dengan kolom-kolom sebagai berikut:

| Kolom | Deskripsi |
|---|---|
| No. | Nomor urut pegawai |
| Pegawai | NIP (baris atas) dan Nama Pegawai (baris bawah), dalam satu sel |
| Tgl/Bln (1 s/d akhir bulan) | Satu kolom per tanggal dalam bulan tersebut, header berisi nomor tanggal/bulan (contoh: 1/4, 2/4, ... 30/4) |
| TJK | Total Jam Kerja (akumulasi jam kerja efektif pegawai selama sebulan) |
| KJK | Kekurangan Jam Kerja (selisih kekurangan dari target jam kerja) |
| TOTAL KJK | Total akumulasi kekurangan jam kerja |
| TJL | Total Jam Lembur |
| TKS | Tanpa Keterangan Sah (jumlah hari tidak hadir tanpa keterangan) |

**Catatan kolom tanggal:**
- Setiap kolom tanggal menampilkan salah satu dari:
  - Centang (✔) berwarna hijau/hitam — jika pegawai hadir penuh/sesuai jadwal tanpa catatan jam.
  - Jam kerja aktual (format: `XJ YM`, misal `6J 50M` = 6 jam 50 menit) — jika ada data jam kerja tercatat dari mesin presensi.
  - Kode absensi (lihat tabel kategori di bagian 3) dengan badge berwarna hijau, contoh: `DL`, `CTHN`, `DBW`, `CALP`, `DK`, `CBSLN`, `IJ`.
  - Sel kosong / warna abu-abu — untuk tanggal yang tidak ada jadwal kerja (libur/weekend).
  - Sel berwarna merah (pink/magenta) — untuk highlight tanggal tertentu (misal: hari libur nasional atau status khusus, perlu dikonfirmasi maknanya pada legenda "Kode Warna").
- Beberapa sel bisa menampilkan kombinasi (jam kerja + kode), contoh: pegawai dengan campuran jam kerja aktual dan beberapa hari cuti tahunan (CTHN) dalam bulan yang sama.

### 3. Legenda / Keterangan Kode (Footer Laporan)
Tampilkan 3 kelompok legenda di akhir laporan:

**a. Kategori Absensi** (tabel kode → keterangan), contoh isi:
| Kode | Keterangan |
|---|---|
| TB | Tugas Belajar |
| MFTB | Mesin Fingerprint tidak berfungsi/data jari tidak terbaca |
| JP | PIKET |
| DL | Dinas Luar |
| DT | Dispensasi Dinas |
| CSKT | Cuti Sakit |
| CBSLN | Cuti Bersalin |
| CALP | Cuti Alasan Penting |
| LD | Lepas Dinas |
| WFH | Maintenance |
| DBW | Diklat/Bimtek/Workshop |
| CTHN | Cuti Tahunan |
| CBSR | Cuti Besar |
| UP | Upacara |
| SPT | Surat Perintah Tugas |
| KBBS | Kerja Bakti/Bakti Sosial/Kegiatan Pagi-Sore |
| wfh_2 | Pelaksanaan WFH |
| HJT | HJT 732 |
| IJ | Ijin |
| DK | Dispensasi Pribadi |
| SE | Surat Edaran |

> Daftar kode bersifat dinamis — ambil dari master data kategori absensi pada sistem, jangan di-hardcode.

**b. Kode Total** (penjelasan kolom ringkasan di ujung tabel):
| Kode | Keterangan |
|---|---|
| TJK | Total Jam Kerja |
| KJK | Kekurangan Jam Kerja |
| TJL | Total Jam Lembur |
| TKS | Tanpa Keterangan Sah |

**c. Kode Warna** (legenda warna sel pada tabel):
| Warna | Keterangan |
|---|---|
| (abu-abu/kosong) | Tidak Ada Jadwal |
| (warna libur, mis. abu gelap) | Hari Libur |
| (warna lembur, mis. kuning/oranye) | Lembur diluar Jadwal |
| (warna hijau) | Absensi (kode kategori tercatat) |

### 4. Perilaku & Fitur Tambahan yang Perlu Diimplementasikan
- Filter/parameter laporan: pilih **Unit Kerja**, **Bulan**, dan **Tahun** sebelum generate laporan.
- Laporan harus bisa menampilkan banyak pegawai sekaligus (multi-row, dengan pagination antar-halaman saat export ke PDF — header tabel berulang di setiap halaman baru).
- Tabel harus scrollable secara horizontal di tampilan web (karena jumlah kolom tanggal bisa sampai 31).
- Tombol export ke **PDF** dan/atau **Excel**.
- Saat export, sertakan timestamp cetak otomatis (waktu generate laporan) di bagian footer/header halaman.
- Data jam kerja harian per pegawai diambil dari rekap mesin fingerprint/presensi, dikonversi ke format `XJ YM` (X jam Y menit).
- Total kolom TJK/KJK/TOTAL KJK/TJL/TKS dihitung otomatis berdasarkan akumulasi data harian dan target jam kerja bulanan (contoh acuan: 160 jam/bulan).
- Validasi: jika data presensi tidak tersedia untuk suatu tanggal namun pegawai punya jadwal, tandai sebagai TKS (Tanpa Keterangan Sah).

### 5. Gaya Visual
- Font tabel kecil dan rapat (untuk menampung banyak kolom), gunakan font sans-serif standar (Arial/Calibri).
- Header tabel: background abu-abu muda, bold, rata tengah.
- Border tipis warna abu-abu (#CCCCCC) di semua sel.
- Badge kode absensi: latar hijau muda, teks hijau tua/hitam, rounded corner kecil, posisi di tengah sel.
- Centang kehadiran: ikon centang hitam/hijau kecil di tengah sel.
- Orientasi halaman saat export PDF: **Landscape** (karena banyak kolom).

---

**Ringkasan permintaan singkat (jika hanya butuh satu kalimat prompt):**

> "Buatkan/modifikasi halaman laporan presensi bulanan dengan header logo + nama instansi, judul 'Laporan Perhitungan Presensi Bulanan [Bulan] [Tahun]', info unit kerja, tabel pegawai (No, NIP+Nama, kolom per tanggal berisi centang/jam kerja/kode absensi berwarna, kolom ringkasan TJK/KJK/TOTAL KJK/TJL/TKS), dan footer berupa 3 legenda (Kategori Absensi, Kode Total, Kode Warna), lengkap dengan timestamp cetak, filter unit kerja/bulan/tahun, serta export ke PDF orientasi landscape."
