"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, X, Loader2, RefreshCw, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  loading: boolean;
  info: {
    namaKlinik: string;
    jarak: number | null;
    radiusMeter: number;
    inRange: boolean;
  };
}

function getCameraError(error: unknown): { message: string; detail: string } {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError":
        return {
          message: "Izin kamera ditolak",
          detail: "Buka Pengaturan Browser > Privasi & Keamanan > Setelan situs > Kamera, lalu izinkan situs ini.",
        };
      case "NotFoundError":
        return {
          message: "Tidak ada kamera ditemukan",
          detail: "Pastikan perangkat memiliki kamera yang tersedia.",
        };
      case "NotReadableError":
        return {
          message: "Kamera sedang digunakan",
          detail: "Tutup aplikasi lain yang sedang menggunakan kamera, lalu coba lagi.",
        };
      case "OverconstrainedError":
        return {
          message: "Kamera tidak mendukung",
          detail: "Kamera perangkat tidak mendukung resolusi yang diminta.",
        };
    }
  }
  return {
    message: "Kamera tidak dapat diakses",
    detail: "Pastikan izin kamera diberikan di browser.",
  };
}

export default function CameraCapture({ onCapture, onClose, loading, info }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<{ message: string; detail: string } | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []);

  async function startCamera(mode: "user" | "environment") {
    setError(null);
    setRetrying(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: 1280, height: 720 },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      setError(getCameraError(err));
    } finally {
      setRetrying(false);
    }
  }

  function toggleCamera() {
    const newMode = facingMode === "user" ? "environment" : "user";
    stopCamera();
    setFacingMode(newMode);
    startCamera(newMode);
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX_WIDTH = 800;
    const scale = Math.min(MAX_WIDTH / video.videoWidth, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.6);

    stopCamera();
    onCapture(base64);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 text-white z-10">
        <button onClick={() => { stopCamera(); onClose(); }} className="p-1">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm font-medium">Ambil Foto Absensi</span>
        <button onClick={toggleCamera} className="p-1" title="Ganti kamera">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm px-6 text-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6 text-white/60" />
            </div>
            <p className="font-medium">{error.message}</p>
            <p className="text-white/60 text-xs leading-relaxed">{error.detail}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-white/30 text-white hover:bg-white/10"
              onClick={() => startCamera(facingMode)}
              disabled={retrying}
            >
              {retrying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Coba Lagi
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "[transform:scaleX(-1)]" : ""}`}
          />
        )}
      </div>

      {/* Info Overlay */}
      <div className="bg-white rounded-t-2xl px-5 py-4 pb-8 space-y-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${info.inRange ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium text-gray-800">{info.namaKlinik}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {info.jarak !== null && (
            <>
              <Navigation className="w-3 h-3" />
              <span>
                {info.inRange
                  ? `Anda berada dalam radius presensi (${Math.round(info.jarak)}m / ${info.radiusMeter}m)`
                  : `Anda di luar radius (${Math.round(info.jarak)}m / ${info.radiusMeter}m)`}
              </span>
            </>
          )}
        </div>
        <Button
          onClick={capture}
          disabled={loading || !!error}
          className="w-full h-14 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 mr-2" />
          )}
          {loading ? "Memproses..." : "Ambil Foto"}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
