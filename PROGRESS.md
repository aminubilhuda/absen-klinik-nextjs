# Progress — Absensi Klinik PWA

> **Updated:** 17 Juni 2026
> **Build Status:** ✅ Berhasil (TypeScript clean, compiled)

---

## 📋 Fase 1: Project Setup & Database ✅

### Init Project
- [x] `create-next-app` dengan TypeScript, App Router, Tailwind CSS v4
- [x] Next.js v16.2.9 (Turbopack)
- [x] Dependencies: Prisma 7, NextAuth v5 (beta), bcryptjs, Leaflet, shadcn/ui, framer-motion, xlsx, jspdf, date-fns, zod, zustand

### Database (Prisma)
- [x] **Prisma schema** dengan 6 models:
  - `User` — role (`KARYAWAN`/`ADMIN`), status (`PENDING`/`ACTIVE`/`REJECTED`/`DEACTIVATED`)
  - `Account` & `Session` & `VerificationToken` — untuk NextAuth adapter compatibility
  - `ClinicSetting` — singleton lokasi klinik (lat, lng, radius)
  - `WorkSchedule` — jadwal per hari (SENIN-MINGGU)
  - `Attendance` — absensi karyawan (checkin/checkout + GPS + status terlambat)
  - `LeaveRequest` — izin/cuti (approval flow)
  - `PushSubscription` — untuk Web Push notifications
- [x] Generator: `prisma-client-js` (output ke `@prisma/client`)
- [x] Database: MySQL via `mysql://` connection string
- [x] `prisma.config.ts` — Prisma 7 config dengan dotenv

### Seed Data
- [x] 1 Admin akun: `admin@klinik.com` / `admin123`
- [x] 7 jadwal kerja default (Senin-Kamis 07:00-14:00, Jumat 07:00-11:00, Sabtu 07:00-12:30, Minggu libur)
- [x] 1 ClinicSetting default (Jakarta: -6.2, 106.8, radius 100m)
- [x] Script: `npm run seed`

### Auth & Middleware
- [x] **NextAuth v5** — Credentials provider (email + password, bcrypt)
- [x] JWT session dengan role & status di token
- [x] Route protection via RBAC
- [x] **proxy.ts** (Next.js 16 — middleware replacement) dengan matcher untuk public routes

---

## 📋 Fase 2: API Routes ✅

| Route | Method | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/auth/register` | POST | Registrasi karyawan (status: PENDING) |
| `/api/attendance/checkin` | POST | Absen masuk + validasi GPS (Haversine) |
| `/api/attendance/checkout` | POST | Absen keluar + validasi GPS |
| `/api/attendance/today` | GET | Status absen hari ini |
| `/api/attendance/history` | GET | Riwayat absensi karyawan (30 hari) |
| `/api/clinic-setting` | GET/PUT | CRUD lokasi & radius klinik |
| `/api/schedule` | GET/PUT | CRUD jadwal kerja |
| `/api/leave` | GET/POST | CRUD izin/cuti (karyawan & admin) |
| `/api/leave/[id]` | PUT | Approve/reject izin oleh admin |
| `/api/users` | GET | Daftar users (admin only) |
| `/api/users/[id]/approve` | PUT | Approve/reject/deactivate user |
| `/api/reports` | GET/POST | Laporan kehadiran + export Excel/PDF |
| `/api/notifications` | GET | Statistik dashboard admin |
| `/api/push/subscribe` | POST | Subscribe push notification |

---

## 📋 Fase 3: UI Components ✅

### Mobile Components
- [x] **BottomNav** — Bottom tab bar (Beranda, Absen, Riwayat, Izin, Profil)
  - Icon Absen lebih besar dengan efek floating
  - Glass effect (backdrop-blur)
  - Active state dengan warna emerald
- [x] **AppShell** — Wrapper layout dengan BottomNav + Toaster
- [x] **AdminNav** — Horizontal scroll navigation untuk admin
- [x] **AdminHeader** — Header dengan logo + logout

### Theme (Tailwind CSS v4)
- **Primary:** `#059669` (Emerald-600)
- **Secondary:** `#10B981` (Emerald-500)
- **Accent:** `#34D399` (Emerald-400)
- **Background:** `#f0fdf4` (Emerald-50)
- Dark mode juga dikonfigurasi

### Shadcn/ui Installed
button, input, label, card, form, select, sheet, dialog, avatar, badge, table, scroll-area, separator, toast (sonner), calendar, popover, command, textarea, switch

---

## 📋 Fase 4: Halaman Auth ✅

### Login (`/login`)
- [x] Card modern dengan shadow
- [x] Email + password dengan show/hide toggle
- [x] Error handling
- [x] Link ke register

### Register (`/register`)
- [x] Form lengkap (nama, email, noHP, password)
- [x] Validasi minimal 6 karakter password
- [x] Success/error state
- [x] Auto-redirect ke login setelah sukses

---

## 📋 Fase 5: Halaman Karyawan ✅

### Dashboard (`/karyawan`)
- [x] Greeting card dengan gradient emerald
- [x] Tanggal hari ini
- [x] Status kehadiran
- [x] 4 stat card (Hadir, Terlambat, Izin, Alpha) — data placeholder

### Absen (`/karyawan/absen`)
- [x] Info card lokasi & jarak dari klinik
- [x] Tombol Absen Masuk / Absen Keluar dengan disabled state
- [x] GPS lokasi dengan geolocation API
- [x] Validasi jarak (Haversine formula)
- [x] Status checkin/checkout hari ini
- [x] Error/success feedback
- [x] Loading state (spinner)

### Riwayat (`/karyawan/riwayat`)
- [x] List absensi per hari
- [x] Status badge (Tepat Waktu / Terlambat)
- [x] Jam checkin/checkout
- [x] Empty state
- [x] Loading spinner

### Izin/Cuti (`/karyawan/izin`)
- [x] Bottom sheet form (jenis, tanggal, alasan)
- [x] Riwayat pengajuan dengan status badge
- [x] Catatan admin
- [x] Create leave request

### Profile (`/karyawan/profile`)
- [x] Avatar + inisial
- [x] Info user (nama, email, role)
- [x] Logout button

---

## 📋 Fase 6: Halaman Admin ✅

### Dashboard (`/admin`)
- [x] Statistik: total karyawan, hadir hari ini, pending pengajuan, pending registrasi
- [x] Status sistem

### Karyawan (`/admin/karyawan`)
- [x] Search filter
- [x] List user dengan status badge
- [x] Approve/reject registrasi pending
- [x] Deactivate user aktif

### Lokasi (`/admin/lokasi`)
- [x] Leaflet map interaktif dengan draggable marker
- [x] Circle radius visual
- [x] Form: nama klinik, latitude, longitude, radius
- [x] Simpan lokasi

### Jadwal (`/admin/jadwal`)
- [x] List 7 hari dengan toggle libur
- [x] Input jam masuk/keluar per hari
- [x] Simpan jadwal

### Izin (`/admin/izin`)
- [x] List semua pengajuan
- [x] Search filter
- [x] Dialog review: setujui/tolak + catatan
- [x] Status badge

### Laporan (`/admin/laporan`)
- [x] Filter: karyawan, rentang tanggal
- [x] Ringkasan: hadir, terlambat, alpha
- [x] Export Excel (.xlsx) via xlsx library
- [x] Export PDF via jspdf + jspdf-autotable

---

## 📋 Fase 7: PWA ✅

- [x] **manifest.json** — name, icons (SVG), theme_color, display: standalone
- [x] **Ikon** — SVG icons 192x192 & 512x512
- [x] **Meta tags** — theme-color, apple-touch-icon, viewport-fit=cover
- [ ] Service Worker — belum diimplementasi (perlu library `@serwist/next` atau sejenis)
- [ ] Push Notification — endpoint API sudah siap, perlu integrasi VAPID key + service worker

---

## 📋 Fase 8: Build & Testing ✅

- [x] Build sukses (TypeScript clean)
- [x] Proxy (middleware replacement) terkonfigurasi
- [x] `export const runtime = "nodejs"` di semua API routes
- [ ] Database migration: run `npm run db:migrate` (butuh MySQL running)

---

## 📂 Struktur Project

```
absen/
├── prisma/
│   ├── schema.prisma    — 6 models + enums
│   ├── seed.ts          — seed data admin + jadwal + lokasi
│   └── config.ts        — Prisma 7 config
├── src/
│   ├── app/
│   │   ├── (auth)/      — login, register
│   │   ├── (main)/
│   │   │   ├── karyawan/ — dashboard, absen, riwayat, izin, profile
│   │   │   └── admin/    — dashboard, karyawan, lokasi, jadwal, izin, laporan
│   │   └── api/          — 14 route groups
│   ├── components/
│   │   ├── mobile/       — BottomNav, AppShell, AdminNav
│   │   ├── ui/           — shadcn/ui components
│   │   └── absen/        — AttendanceMap, PulseButton (placeholder)
│   ├── lib/
│   │   ├── prisma.ts     — lazy PrismaClient proxy
│   │   ├── auth.ts       — NextAuth v5 config
│   │   ├── haversine.ts  — formula jarak GPS
│   │   └── utils.ts      — cn() utility
│   ├── types/            — TypeScript interfaces
│   ├── proxy.ts          — Next.js 16 proxy (menggantikan middleware)
│   └── middleware.ts     — (removed, migrated to proxy.ts)
├── public/
│   ├── icons/            — PWA icons
│   └── manifest.json     — PWA manifest
├── .env                  — environment variables
└── next.config.ts        — Next.js config
```

---

## 🚀 Cara Menjalankan

```bash
# 1. Setup database (pastikan MySQL running)
npm run db:push

# 2. Seed data
npm run seed

# 3. Jalankan development
npm run dev

# 4. Build production
npm run build
```

---

## 📝 Catatan untuk Lanjutan

1. **Service Worker & PWA offline** — perlu setup `@serwist/next` atau implementasi SW manual
2. **Push Notification** — generate VAPID key, update `.env`, integrasikan di trigger points
3. **Offline-sync** — implementasi IndexedDB queue untuk absen offline
4. **Deployment** — VPS + Nginx reverse proxy + SSL Certbot + PM2
5. **Database** — perlu setup MySQL + running migration + seed
6. **Leaflet** — icon marker default Leaflet perlu dikonfigurasi (issue dengan webpack bundling)
