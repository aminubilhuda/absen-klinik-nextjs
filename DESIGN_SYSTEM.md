# SehatHadir — Sistem Desain & Konteks Agent AI

> File ini adalah "kontrak desain" lengkap untuk aplikasi absensi puskesmas **SehatHadir**.
> Tempelkan seluruh isi file ini ke agent AI Anda (v0, Cursor, Claude, ChatGPT, dll) sebagai
> konteks agar ia bisa **meniru UI ini secara konsisten** — gaya visual, pola komponen, dan
> struktur layout mobile-first.

---

## 0. Cara Memakai File Ini Dengan Agent AI

Tempelkan blok berikut di awal prompt Anda:

```
Kamu adalah asisten frontend. Ikuti SISTEM DESAIN di bawah ini SECARA KETAT untuk setiap
komponen/halaman yang kamu buat. Jangan menambah warna, font, atau radius di luar token
yang sudah didefinisikan. Selalu mobile-first. Gunakan Next.js App Router + Tailwind CSS v4
+ shadcn/ui + lucide-react.

[lalu tempel seluruh isi DESIGN_SYSTEM.md di sini]

Tugas: <jelaskan halaman/komponen yang kamu mau>
```

Aturan emas untuk agent:
- **Jangan pernah** memakai warna mentah (`text-white`, `bg-black`, hex). Selalu pakai token semantik.
- **Maksimal 5 warna**, 2 font. Tema utama = **teal medis**. Jangan pakai ungu/violet.
- **Mobile-first**: rancang untuk lebar 385px dulu, lalu tingkatkan.
- Sudut membulat besar (`rounded-2xl`/`rounded-4xl`), bayangan halus (`shadow-sm`).
- Ikon hanya dari **lucide-react**, ukuran 16/18/20/24px. Jangan emoji.

---

## 1. Identitas Produk

| Atribut | Nilai |
|---|---|
| Nama | SehatHadir |
| Domain | Absensi pegawai puskesmas (community health center) |
| Bahasa UI | Indonesia (`lang="id"`, locale `id-ID`) |
| Fitur inti | Absen masuk/pulang, verifikasi wajah (kamera), verifikasi lokasi GPS, riwayat, pengajuan izin |
| Nuansa | Bersih, terpercaya, medis/pemerintahan namun modern |
| Platform | Web mobile-first (PWA-ready) |

---

## 2. Stack Teknis

- **Framework**: Next.js (App Router), React 19
- **Styling**: Tailwind CSS v4 (token via `@theme inline` di `globals.css`, TANPA `tailwind.config.js`)
- **Komponen**: shadcn/ui (hanya `Button` yang dipakai di basis; tambah lain via CLI)
- **Ikon**: `lucide-react`
- **Font**: `Geist` (sans) + `Geist Mono` (mono) via `next/font/google`
- **Util**: `cn()` dari `lib/utils` untuk menggabung className

---

## 3. Token Warna (WAJIB)

Tema warna didefinisikan di `app/globals.css` memakai **OKLCH**. Mode terang sebagai default.
Primary = teal medis. Accent = hijau mint. Gunakan SELALU lewat kelas semantik Tailwind
(`bg-primary`, `text-muted-foreground`, dst).

```css
:root {
  color-scheme: light;
  --background: oklch(0.98 0.008 200);      /* off-white kebiruan */
  --foreground: oklch(0.22 0.03 220);       /* teks utama gelap */
  --card: oklch(1 0 0);                      /* kartu putih */
  --card-foreground: oklch(0.22 0.03 220);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.03 220);
  --primary: oklch(0.58 0.11 195);           /* TEAL MEDIS — warna brand */
  --primary-foreground: oklch(0.99 0.01 195);
  --secondary: oklch(0.95 0.02 195);         /* teal sangat muda */
  --secondary-foreground: oklch(0.4 0.07 200);
  --muted: oklch(0.96 0.01 200);
  --muted-foreground: oklch(0.52 0.03 220);
  --accent: oklch(0.93 0.04 165);            /* HIJAU MINT — aksen sukses/lokasi */
  --accent-foreground: oklch(0.38 0.08 175);
  --destructive: oklch(0.58 0.2 25);         /* merah peringatan */
  --border: oklch(0.91 0.012 200);
  --input: oklch(0.91 0.012 200);
  --ring: oklch(0.58 0.11 195);
  --chart-1: oklch(0.58 0.11 195);           /* teal */
  --chart-2: oklch(0.65 0.13 165);           /* hijau */
  --chart-3: oklch(0.7 0.12 90);             /* kuning (terlambat) */
  --chart-4: oklch(0.62 0.16 35);            /* oranye/merah (alpha) */
  --chart-5: oklch(0.55 0.14 280);
  --radius: 1rem;                            /* basis radius besar */
}
```

**Peta penggunaan warna:**

| Token | Dipakai untuk |
|---|---|
| `primary` | Header backdrop, tombol utama, status aktif nav, garis pindai wajah |
| `primary-foreground` | Teks/ikon di atas primary |
| `accent` / `accent-foreground` | Badge sukses, status lokasi terverifikasi, kartu "Masuk", state "Hadir" |
| `secondary` | Tombol absen pulang, kartu "Pulang" |
| `muted` / `muted-foreground` | Latar lembut, teks sekunder, placeholder |
| `card` | Semua permukaan kartu |
| `destructive` | Status "Ditolak"/"Alpha", error |
| `chart-3` (kuning) | Status "Terlambat" |

> Catatan: blok `.dark` bawaan template masih netral abu-abu. Jika butuh dark mode bertema,
> turunkan varian teal-nya; default proyek ini fokus mode terang.

---

## 4. Skala Radius

Radius diturunkan dari `--radius: 1rem` di `@theme inline`:

| Kelas | Nilai | Pemakaian |
|---|---|---|
| `rounded-2xl` | ~1.8rem | Tombol, kartu kecil, kotak info |
| `rounded-3xl` | ~2.2rem | Viewport kamera |
| `rounded-4xl` | ~2.6rem | Kartu jam utama, header lengkung bawah, bottom sheet |
| `rounded-full` | — | Pill, badge, avatar, tombol ikon |

Konsistensi: permukaan besar = `rounded-4xl`, kontrol = `rounded-2xl`, label = `rounded-full`.

---

## 5. Tipografi

- **Font sans (default & heading)**: Geist → kelas `font-sans`
- **Font mono (angka jam, waktu)**: Geist Mono → kelas `font-mono`
- Angka waktu SELALU `font-mono` + `tabular-nums` agar tidak bergeser.

| Elemen | Kelas |
|---|---|
| Jam besar (live clock) | `font-mono text-5xl font-semibold tracking-tight tabular-nums` |
| Judul halaman/sheet | `text-lg font-semibold` |
| Judul section | `font-semibold` |
| Teks tubuh | default (`text-sm`/`text-base`), `leading-relaxed` bila panjang |
| Teks sekunder | `text-xs`/`text-sm text-muted-foreground` |

Pakai `text-balance` untuk judul dan `text-pretty` untuk paragraf agar pemenggalan rapi.

---

## 6. Bahasa Visual & Pola Layout

1. **Header lengkung teal**: blok `bg-primary` dengan `rounded-b-4xl` di puncak halaman.
   Kartu konten utama "naik" menimpa header dengan margin negatif (`-mt-2`).
2. **Kartu mengambang**: `bg-card` + `rounded-4xl` + `shadow-sm` + padding `p-5`.
3. **Kotak info dalam kartu**: `rounded-2xl` dengan `bg-muted/50` atau `bg-accent/60`, padding `px-4 py-3`.
4. **Pill status**: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium`.
5. **Spacing**: pakai `gap-*` (jangan campur margin + gap). Padding horizontal halaman `px-5`.
6. **Grid ringkas**: dua kolom info pakai `grid grid-cols-2 gap-3`.
7. **Tombol aksi besar**: tinggi `h-14` (utama) / `h-13` (sheet), `rounded-2xl`, `text-base font-semibold`, ikon lucide di kiri.
8. **Indikator titik aktif**: titik kecil `bg-chart-2` dengan `ring-2 ring-card` untuk status "online/terdeteksi".

---

## 7. Inventaris Komponen

Semua komponen ada di `components/attendance/`. Halaman tunggal di `app/page.tsx`
mengontrol tab aktif (`beranda | riwayat | absen | izin | profil`) lewat `useState`.

| Komponen | Fungsi | Pola kunci |
|---|---|---|
| `top-bar.tsx` | Sapaan + avatar di header teal | teks `primary-foreground`, avatar `rounded-full` |
| `clock-card.tsx` | Jam server live, shift pill, status lokasi, ringkasan masuk/pulang, tombol absen | kartu `rounded-4xl -mt-2`, jam `font-mono text-5xl` |
| `face-scan-sheet.tsx` | Bottom sheet verifikasi wajah via kamera + konfirmasi lokasi | fase `intro→scanning→verifying→done`, oval guide, garis `animate-[scanline_...]` |
| `monthly-summary.tsx` | Kartu rekap bulanan (Hadir/Terlambat/Izin/Alpha) | grid statistik, angka berwarna per status |
| `history-list.tsx` | 3 entri riwayat terbaru di beranda + "Lihat semua" | list `rounded-2xl`, badge status |
| `history-page.tsx` | Tab Riwayat: pemilih bulan, ringkasan, chip filter status, daftar | filter via `useState`, chip `rounded-full` aktif `bg-primary` |
| `izin-page.tsx` | Tab Izin: form pengajuan (jenis, tanggal, alasan, lampiran) + riwayat pengajuan | jenis izin sebagai chip, badge status `menunggu/disetujui/ditolak` |
| `bottom-nav.tsx` | Navigasi bawah 5 tab, tombol "Absen" menonjol di tengah | fixed bottom, ikon aktif `text-primary`, tombol tengah lingkaran teal timbul |

---

## 8. Pola Komponen Acuan (copy-paste)

### 8a. Header lengkung + kartu naik

```tsx
<div className="rounded-b-4xl bg-primary pb-10">
  <TopBar />
</div>
<div className="px-5">
  <div className="-mt-2 rounded-4xl bg-card p-5 shadow-sm">{/* konten */}</div>
</div>
```

### 8b. Pill status (shift)

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
  <ShieldCheck className="size-3.5" />
  Pagi · 07:30–14:30
</span>
```

### 8c. Baris status lokasi (dengan titik aktif)

```tsx
<div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-accent">
    <MapPin className="size-4.5 text-accent-foreground" />
    <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-chart-2 ring-2 ring-card" />
  </span>
  <div className="min-w-0">
    <p className="truncate text-sm font-medium text-card-foreground">Puskesmas Melati Indah</p>
    <p className="text-xs text-muted-foreground">Lokasi terdeteksi · dalam radius 100 m</p>
  </div>
</div>
```

### 8d. Tombol aksi utama

```tsx
<Button size="lg" className="h-14 w-full rounded-2xl text-base font-semibold">
  <Fingerprint className="size-5" />
  Absen Masuk
</Button>
```

### 8e. Animasi garis pindai (keyframe di globals.css)

```css
@keyframes scanline {
  0% { top: 8%; }
  50% { top: 92%; }
  100% { top: 8%; }
}
```
```tsx
<div className="absolute inset-x-0 h-0.5 animate-[scanline_2.4s_ease-in-out_infinite] bg-primary-foreground shadow-[0_0_12px_2px] shadow-primary-foreground" />
```

### 8f. Akses kamera depan (verifikasi wajah)

```tsx
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: "user" },
  audio: false,
})
videoRef.current.srcObject = stream
// video pakai kelas "-scale-x-100" agar efek cermin
```

---

## 9. Pola State & Status

**Mesin status absen** (di `app/page.tsx`):
`belum masuk → (scan) → sudah masuk → (scan) → sudah pulang → "Absensi Hari Ini Selesai"`

**Warna badge status kehadiran:**

| Status | Warna |
|---|---|
| Hadir | `bg-accent text-accent-foreground` (hijau mint) |
| Terlambat | nuansa `chart-3` (kuning) |
| Izin/Sakit/Cuti/Dinas | `bg-secondary text-secondary-foreground` (teal muda) |
| Alpha / Ditolak | nuansa `destructive` (merah) |
| Menunggu (izin) | `bg-muted text-muted-foreground` |
| Disetujui (izin) | `bg-accent text-accent-foreground` |

---

## 10. Aksesibilitas & Mobile

- Target sentuh ≥ 44px (tombol `h-13`/`h-14`, tombol ikon `p-2` dalam `rounded-full`).
- Tombol ikon-saja wajib `aria-label` (mis. tombol tutup sheet `aria-label="Tutup"`).
- Gambar dekoratif `alt=""`; avatar punya `alt` deskriptif.
- Kontras: jika ganti `bg-*`, WAJIB ganti `text-*` pasangannya.
- `lang="id"`, format tanggal/jam pakai `toLocaleString("id-ID", ...)`.
- Bottom nav `fixed`; beri padding bawah pada konten agar tidak tertutup.

---

## 11. Checklist "Sudah Mirip Belum?"

- [ ] Header teal melengkung di bawah (`rounded-b-4xl bg-primary`)
- [ ] Kartu putih membulat besar dengan bayangan halus, naik menimpa header
- [ ] Jam besar `font-mono` + `tabular-nums`
- [ ] Status lokasi dengan ikon pin + titik hijau aktif
- [ ] Tombol aksi tinggi penuh-lebar dengan ikon lucide
- [ ] Bottom nav 5 tab, tombol Absen lingkaran teal menonjol di tengah
- [ ] Hanya token warna semantik (tanpa hex/putih-hitam mentah)
- [ ] Maksimal 5 warna, tema teal, tanpa ungu
- [ ] Semua teks UI berbahasa Indonesia
