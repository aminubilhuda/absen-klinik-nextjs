import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-muted to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
          <WifiOff className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Anda Sedang Offline</h1>
        <p className="text-sm text-muted-foreground/80">
          Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <Link
          href="/karyawan/absen"
          className="inline-block px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          Coba Lagi
        </Link>
      </div>
    </div>
  );
}
