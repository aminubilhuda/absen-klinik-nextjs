"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, MapPin } from "lucide-react";

interface TodayData {
  checkin: boolean;
  checkout: boolean;
  waktuCheckin: string | null;
  waktuCheckout: string | null;
  status: string | null;
  menitTerlambat: number | null;
  isOnLeave: boolean;
  kategoriCuti: { id: string; kode: string; keterangan: string; warnaLabel: string } | null;
}

const statDefs = [
  { label: "Hadir", key: "hadir" as const, icon: CheckCircle, color: "text-accent-foreground", bg: "bg-accent/30" },
  { label: "Terlambat", key: "terlambat" as const, icon: AlertTriangle, color: "text-chart-3", bg: "bg-chart-3/20" },
  { label: "Izin", key: "izin" as const, icon: Calendar, color: "text-secondary-foreground", bg: "bg-secondary" },
  { label: "Alpha", key: "alpha" as const, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
];

export default function KaryawanDashboard() {
  const { data: session } = useSession();
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0, izin: 0, alpha: 0 });
  const now = new Date();
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  useEffect(() => {
    async function fetchData() {
      try {
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const [todayRes, historyRes, leaveRes, scheduleRes, hariLiburRes] = await Promise.all([
          fetch("/api/attendance/today"),
          fetch("/api/attendance/history"),
          fetch("/api/leave"),
          fetch("/api/schedule"),
          fetch(`/api/hari-libur?year=${thisYear}&month=${thisMonth + 1}`),
        ]);

        const today: TodayData = await todayRes.json();
        const history = await historyRes.json();
        const leaves = await leaveRes.json();
        const scheduleData = await scheduleRes.json();
        const hariLiburData = await hariLiburRes.json();

        setTodayData(today);

        const hadir = (history.records || []).filter(
          (r: any) => new Date(r.tanggal).getMonth() === thisMonth
            && new Date(r.tanggal).getFullYear() === thisYear
            && r.waktuCheckin != null
            && r.status === "TEPAT_WAKTU"
        ).length;

        const terlambat = (history.records || []).filter(
          (r: any) => new Date(r.tanggal).getMonth() === thisMonth
            && new Date(r.tanggal).getFullYear() === thisYear
            && r.waktuCheckin != null
            && r.status === "TERLAMBAT"
        ).length;

        let izin = 0;
        for (const l of (leaves.leaves || []) as any[]) {
          if (l.status !== "APPROVED") continue;
          const mulai = new Date(l.tanggalMulai);
          const akhir = new Date(l.tanggalAkhir);
          const bulanMulai = mulai.getMonth();
          const bulanAkhir = akhir.getMonth();
          if (bulanMulai === thisMonth && mulai.getFullYear() === thisYear) {
            const akhirBulan = new Date(thisYear, thisMonth + 1, 0);
            const akhirRange = akhir < akhirBulan ? akhir : akhirBulan;
            izin += Math.floor((akhirRange.getTime() - mulai.getTime()) / 86400000) + 1;
          } else if (bulanAkhir === thisMonth && akhir.getFullYear() === thisYear) {
            const awalBulan = new Date(thisYear, thisMonth, 1);
            izin += Math.floor((akhir.getTime() - awalBulan.getTime()) / 86400000) + 1;
          } else if (bulanMulai < thisMonth && bulanAkhir > thisMonth) {
            const hariDalamBulan = new Date(thisYear, thisMonth + 1, 0).getDate();
            izin += hariDalamBulan;
          }
        }

        const scheduleMap = new Map<string, any>((scheduleData.schedules || []).map((s: any) => [s.day, s]));
        const holidaySet = new Set(
          (hariLiburData.data || []).map((h: any) => new Date(h.tanggal).toISOString().split("T")[0])
        );
        const DAY_NAMES = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

        let hariKerja = 0;
        for (let d = 1; d < now.getDate(); d++) {
          const date = new Date(thisYear, thisMonth, d);
          if (date.getDay() === 0) continue;
          const dateStr = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (holidaySet.has(dateStr)) continue;
          const dayName = DAY_NAMES[date.getDay()];
          if (scheduleMap.get(dayName)?.isLibur) continue;
          hariKerja++;
        }

        const alpha = Math.max(0, hariKerja - hadir - terlambat - izin);

        setStats({ hadir, terlambat, izin, alpha });
      } catch {
        // gagal memuat data dashboard
      }
    }

    fetchData();
  }, []);

  const fmtWIB = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  const statusText = !todayData
    ? "Memuat..."
    : todayData.isOnLeave
      ? `Sedang cuti: ${todayData.kategoriCuti?.keterangan || "Izin"}`
      : todayData.checkout
        ? `Sudah Check-out ${fmtWIB(todayData.waktuCheckout!)}`
        : todayData.checkin
          ? `Sudah Check-in ${fmtWIB(todayData.waktuCheckin!)}`
          : "Belum Absen";

  const statusOnline = !todayData ? false : todayData.isOnLeave ? false : todayData.checkin;

  return (
    <>
      {/* Pattern 8a: Curved teal header */}
      <div className="rounded-b-4xl bg-primary pb-12">
        <div className="px-5 pt-6">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-primary-foreground/80">Selamat datang,</p>
              <p className="font-semibold text-lg text-primary-foreground">{session?.user?.name || "Karyawan"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80 mt-2">
            <Clock className="size-4" />
            <span>
              {dayNames[now.getDay()]}, {now.getDate()} {monthNames[now.getMonth()]} {now.getFullYear()}
            </span>
          </div>
        </div>
      </div>

      {/* Floating content */}
      <div className="px-5 -mt-4 space-y-5">
        {/* Status card */}
        <div className="rounded-4xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-accent">
              <MapPin className="size-4.5 text-accent-foreground" />
              <span className={`absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-card ${statusOnline ? "bg-chart-2" : "bg-chart-3"}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Status Hari Ini</p>
              <p className="truncate text-sm font-medium text-card-foreground">{statusText}</p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statDefs.map((stat) => (
            <div key={stat.label} className="rounded-4xl bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`size-10 ${stat.bg} rounded-2xl flex items-center justify-center`}>
                  <stat.icon className={`size-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground">{stats[stat.key]}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
