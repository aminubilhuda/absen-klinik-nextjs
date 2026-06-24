import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/providers";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const geistSans = localFont({
  src: [
    { path: "../../public/fonts/geist-sans/Geist-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/geist-sans/Geist-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/geist-sans/Geist-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../../public/fonts/geist-sans/Geist-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    { path: "../../public/fonts/geist-mono/GeistMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/geist-mono/GeistMono-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/geist-mono/GeistMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-geist-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const setting = await prisma.clinicSetting.findFirst();
  const name = setting?.namaKlinik || "Absensi Puskesmas";
  return {
    title: name,
    description: `Sistem Absensi ${name} Berbasis Lokasi`,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "oklch(0.58 0.11 195)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
