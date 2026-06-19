"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminNav, AdminHeader } from "@/components/mobile/AdminNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.replace("/karyawan/absen");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  if (!session || session.user.role !== "ADMIN") return null;

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
