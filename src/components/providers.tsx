"use client";

import { SessionProvider } from "next-auth/react";
import PWARegister from "@/components/pwa-register";
import PWAInstallPrompt from "@/components/pwa-install-prompt";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PWAInstallPrompt />
      <PWARegister />
      <SessionProvider>{children}</SessionProvider>
    </>
  );
}
