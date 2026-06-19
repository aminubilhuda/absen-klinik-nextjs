"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MapPin, Calendar, CalendarRange, Building2, FileText, BarChart3, Clock, Tags, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClinicName } from "@/hooks/use-clinic-name";

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

export function AdminSidebar() {
  const pathname = usePathname();
  const { name: appName } = useClinicName();

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40">
      <div className="p-5 border-b border-gray-100">
        <h1 className="text-lg font-bold text-emerald-700">{appName}</h1>
        <p className="text-xs text-gray-400 mt-0.5">Panel Administrasi</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </Link>
      </div>
    </aside>
  );
}
