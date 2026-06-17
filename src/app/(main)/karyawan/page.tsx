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
        const [todayRes, historyRes, leaveRes] = await Promise.all([
          fetch("/api/attendance/today"),
          fetch("/api/attendance/history"),
          fetch("/api/leave"),
        ]);

        const today: TodayData = await todayRes.json();
        const history = await historyRes.json();
        const leaves = await leaveRes.json();

        setTodayData(today);

        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const hadir = (history.records || []).filter(
          (r: any) => new Date(r.tanggal).getMonth() === thisMonth
            && new Date(r.tanggal).getFullYear() === thisYear
            && r.status === "TEPAT_WAKTU"
        ).length;

        const terlambat = (history.records || []).filter(
          (r: any) => new Date(r.tanggal).getMonth() === thisMonth
            && new Date(r.tanggal).getFullYear() === thisYear
            && r.status === "TERLAMBAT"
        ).length;

        const izin = (leaves.leaves || []).filter(
          (l: any) => new Date(l.tanggalMulai).getMonth() === thisMonth
            && new Date(l.tanggalMulai).getFullYear() === thisYear
            && l.status === "APPROVED"
        ).length;

        setStats({ hadir, terlambat, izin, alpha: 0 });
      } catch (e) {
        console.error(e);
      }
    }

    fetchData();
  }, []);

  const statusText = !todayData
    ? "Memuat..."
    : todayData.checkout
      ? `Sudah Check-out ${new Date(todayData.waktuCheckout!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
      : todayData.checkin
        ? `Sudah Check-in ${new Date(todayData.waktuCheckin!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
        : "Belum Absen";

  const statusOnline = !todayData ? false : todayData.checkin;

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
