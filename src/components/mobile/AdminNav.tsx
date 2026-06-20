"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Building2, MapPin, Calendar, CalendarRange, FileText, Tags, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/karyawan", label: "Karyawan", icon: Users },
  { href: "/admin/unit-kerja", label: "Unit Kerja", icon: Building2 },
  { href: "/admin/lokasi", label: "Lokasi", icon: MapPin },
  { href: "/admin/jadwal", label: "Jadwal", icon: Calendar },
  { href: "/admin/hari-libur", label: "Hari Libur", icon: CalendarRange },
  { href: "/admin/izin", label: "Izin", icon: FileText },
  { href: "/admin/kategori-absensi", label: "Kategori Absensi", icon: Tags },
  { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/admin/laporan/rekap-jam-kerja", label: "Presensi Bulanan", icon: Clock },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (pathname.startsWith(item.href + "/") &&
            !navItems.some(
              (o) => o.href !== item.href && pathname.startsWith(o.href) && o.href.length > item.href.length
            ));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent/30"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminHeader() {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-accent/30 rounded-xl flex items-center justify-center">
          <Leaf className="w-4 h-4 text-accent-foreground" />
        </div>
        <h1 className="font-bold text-primary">Admin Panel</h1>
      </div>
      <Link
        href="/api/auth/signout"
        className="text-sm text-muted-foreground/80 hover:text-destructive"
      >
        Keluar
      </Link>
    </div>
  );
}
