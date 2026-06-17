"use client";

import { BottomNav } from "./BottomNav";
import { Toaster } from "@/components/ui/sonner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-emerald-50/30">
      <main className="pb-20 pt-2 max-w-lg mx-auto px-4">{children}</main>
      <BottomNav />
      <Toaster position="top-center" richColors />
    </div>
  );
}
