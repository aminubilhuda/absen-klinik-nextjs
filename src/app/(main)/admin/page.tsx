"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle2, Clock, UserPlus, Leaf, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  totalKaryawan: number;
  hadirHariIni: number;
  pendingLeaves: number;
  pendingUsers: number;
}

export default function AdminDashboard() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [stats, setStats] = useState<Stats>({
    totalKaryawan: 0,
    hadirHariIni: 0,
    pendingLeaves: 0,
    pendingUsers: 0,
  });

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  const cards = [
    { label: "Total Karyawan", value: stats.totalKaryawan, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hadir Hari Ini", value: stats.hadirHariIni, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pengajuan Pending", value: stats.pendingLeaves, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Registrasi Baru", value: stats.pendingUsers, icon: UserPlus, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <Leaf className="w-6 h-6" />
          <h1 className="text-lg font-bold">Dashboard Admin</h1>
        </div>
        <p className="text-emerald-100 text-sm mt-1">Kelola data kehadiran dan karyawan</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-emerald-50">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Sistem berjalan normal</p>
            <p className="text-xs text-emerald-600">{time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}, {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
