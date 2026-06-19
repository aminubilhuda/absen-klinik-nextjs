"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  { label: "Hadir", key: "hadir" as const, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Terlambat", key: "terlambat" as const, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Izin", key: "izin" as const, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Alpha", key: "alpha" as const, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
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
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-emerald-100">Selamat datang,</p>
            <p className="font-semibold text-lg">{session?.user?.name || "Karyawan"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-100">
          <Clock className="w-4 h-4" />
          <span>
            {dayNames[now.getDay()]}, {now.getDate()} {monthNames[now.getMonth()]} {now.getFullYear()}
          </span>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${statusOnline ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <div>
              <p className="text-sm text-gray-500">Status Hari Ini</p>
              <p className="font-semibold text-gray-800">{statusText}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {statDefs.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats[stat.key]}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
