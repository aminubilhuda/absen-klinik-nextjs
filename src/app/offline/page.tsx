import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Anda Sedang Offline</h1>
        <p className="text-sm text-gray-500">
          Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <Link
          href="/karyawan/absen"
          className="inline-block px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
        >
          Coba Lagi
        </Link>
      </div>
    </div>
  );
}
