"use client";

import { AdminNav, AdminHeader } from "@/components/mobile/AdminNav";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-emerald-50/30">
      <div className="max-w-lg mx-auto px-4">
        <AdminHeader />
        <AdminNav />
        <main className="py-4">{children}</main>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
