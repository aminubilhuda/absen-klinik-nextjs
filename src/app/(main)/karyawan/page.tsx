"use client";

import { useSession } from "next-auth/react";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Hadir", value: 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Terlambat", value: 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Izin", value: 0, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Alpha", value: 0, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
];

export default function KaryawanDashboard() {
  const { data: session } = useSession();
  const now = new Date();
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <p className="text-sm text-gray-500">Status Hari Ini</p>
              <p className="font-semibold text-gray-800">Belum Absen</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
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
