"use client";

import { AdminNav, AdminHeader } from "@/components/mobile/AdminNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        nav[data-bottom-nav] { display: none !important; }
      `}</style>

      <AdminSidebar />

      {/* Mobile */}
      <div className="md:hidden">
        <div className="max-w-lg mx-auto px-4">
          <AdminHeader />
          <AdminNav />
        </div>
        <div className="max-w-lg mx-auto px-4">
          <div className="py-4">{children}</div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="fixed inset-0 left-64 bg-emerald-50/30 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <main>{children}</main>
          </div>
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </>
  );
}
