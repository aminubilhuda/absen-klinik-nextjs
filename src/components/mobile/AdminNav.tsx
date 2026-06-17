"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, MapPin, Calendar, FileText, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/karyawan", label: "Karyawan", icon: Users },
  { href: "/admin/lokasi", label: "Lokasi", icon: MapPin },
  { href: "/admin/jadwal", label: "Jadwal", icon: Calendar },
  { href: "/admin/izin", label: "Izin", icon: FileText },
  { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-emerald-600 text-white"
                : "bg-white text-gray-600 hover:bg-emerald-50"
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
        <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Leaf className="w-4 h-4 text-emerald-600" />
        </div>
        <h1 className="font-bold text-emerald-900">Admin Panel</h1>
      </div>
      <Link
        href="/api/auth/signout"
        className="text-sm text-gray-500 hover:text-red-500"
      >
        Keluar
      </Link>
    </div>
  );
}
