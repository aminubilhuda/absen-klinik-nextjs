"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Clock, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/karyawan", label: "Beranda", icon: Home },
  { href: "/karyawan/riwayat", label: "Riwayat", icon: Clock },
  { href: "/karyawan/absen", label: "Absen", icon: MapPin },
  { href: "/karyawan/izin", label: "Izin", icon: FileText },
  { href: "/karyawan/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-emerald-100 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/karyawan"
              ? pathname === "/karyawan"
              : pathname.startsWith(item.href);

          const isAbsen = item.href === "/karyawan/absen";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200",
                isAbsen && "relative",
                isActive
                  ? "text-emerald-600"
                  : "text-gray-400 hover:text-emerald-500"
              )}
            >
              {isAbsen ? (
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full -mt-4 shadow-lg transition-all duration-200",
                    isActive
                      ? "bg-emerald-600 text-white shadow-emerald-200"
                      : "bg-emerald-500 text-white shadow-emerald-200"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
              ) : (
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isAbsen && "mt-1",
                  isAbsen && "-mb-2"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
