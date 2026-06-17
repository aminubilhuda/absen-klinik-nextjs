"use client";

import { SessionProvider } from "next-auth/react";
import PWARegister from "@/components/pwa-register";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PWARegister />
      <SessionProvider>{children}</SessionProvider>
    </>
  );
}
