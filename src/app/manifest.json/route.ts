import { prisma } from "@/lib/prisma";

export async function GET() {
  const setting = await prisma.clinicSetting.findFirst();
  const name = setting?.namaKlinik || "Absensi Puskesmas";

  return Response.json({
    name,
    short_name: name,
    description: `Sistem Absensi ${name} Berbasis Lokasi`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f0fdf4",
    theme_color: "#059669",
    lang: "id-ID",
    dir: "ltr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  });
}
