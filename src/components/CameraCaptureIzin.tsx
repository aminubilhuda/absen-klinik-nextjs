"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureIzinProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export default function CameraCaptureIzin({ onCapture, onClose }: CameraCaptureIzinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, []);

  async function startCamera(mode: "user" | "environment") {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: 1280, height: 720 },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch {
      setError("Kamera tidak dapat diakses.");
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

    setCapturing(true);

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
      <div className="flex items-center justify-between p-3 text-white z-10">
        <button onClick={() => { stopCamera(); onClose(); }} className="p-1">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm font-medium">Ambil Foto</span>
        <button onClick={toggleCamera} className="p-1" title="Ganti kamera">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-6 text-center">
            {error}
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

      <div className="bg-white rounded-t-2xl px-5 py-4 pb-8 space-y-3 safe-area-bottom">
        <Button
          onClick={capture}
          disabled={capturing || !!error}
          className="w-full h-14 text-base font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
        >
          {capturing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 mr-2" />
          )}
          {capturing ? "Memproses..." : "Ambil Foto"}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
