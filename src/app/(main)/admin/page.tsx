"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle2, Clock, UserPlus } from "lucide-react";

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
    { label: "Total Karyawan", value: stats.totalKaryawan, icon: Users, color: "text-secondary-foreground", bg: "bg-secondary" },
    { label: "Hadir Hari Ini", value: stats.hadirHariIni, icon: CheckCircle2, color: "text-accent-foreground", bg: "bg-accent/30" },
    { label: "Pengajuan Pending", value: stats.pendingLeaves, icon: Clock, color: "text-chart-3", bg: "bg-chart-3/20" },
    { label: "Registrasi Baru", value: stats.pendingUsers, icon: UserPlus, color: "text-muted-foreground", bg: "bg-muted" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-lg font-bold">Dashboard Admin</h1>
        </div>
        <p className="text-primary-foreground/70 text-sm mt-1">Kelola data kehadiran dan karyawan</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-4xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`size-10 ${card.bg} rounded-2xl flex items-center justify-center`}>
                <card.icon className={`size-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-card-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-4xl bg-accent/20 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-accent/40 flex items-center justify-center">
            <CheckCircle2 className="size-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-accent-foreground">Sistem berjalan normal</p>
            <p className="text-xs text-muted-foreground">{time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}, {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</p>
          </div>
        </div>
      </div>
    </div>
  );
}
