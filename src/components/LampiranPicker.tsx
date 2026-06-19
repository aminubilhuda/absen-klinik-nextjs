"use client";

import { useRef } from "react";
import { Camera, FileImage, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LampiranResult {
  base64: string;
  fileName: string;
  mimeType: string;
}

interface LampiranPickerProps {
  onCapture: (result: LampiranResult) => void;
  onClose: () => void;
}

export default function LampiranPicker({ onCapture, onClose }: LampiranPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File terlalu besar. Maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onCapture({
        base64: reader.result as string,
        fileName: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleCamera() {
    onClose();
    setTimeout(() => {
      const event = new CustomEvent("open-camera-izin");
      window.dispatchEvent(event);
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Lampirkan File</span>
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <Button
          variant="outline"
          className="w-full h-14 justify-start gap-3 text-base rounded-xl"
          onClick={handleCamera}
        >
          <Camera className="w-5 h-5 text-emerald-600" />
          Ambil Foto
        </Button>

        <Button
          variant="outline"
          className="w-full h-14 justify-start gap-3 text-base rounded-xl"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileImage className="w-5 h-5 text-emerald-600" />
          Pilih File
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFilePick}
        />

        <p className="text-xs text-gray-400 text-center">
          Format: gambar (JPG/PNG) atau PDF. Maks 5MB.
        </p>
      </div>
    </div>
  );
}

export type { LampiranResult };
