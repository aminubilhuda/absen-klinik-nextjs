"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Navigation, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Fingerprint, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import CameraCapture from "@/components/CameraCapture";

interface ScheduleInfo {
  jamMasuk: string | null;
  jamKeluar: string | null;
  batasAwalMasuk: string | null;
  batasAkhirMasuk: string | null;
  batasAwalKeluar: string | null;
  batasAkhirKeluar: string | null;
  isLibur: boolean;
}

interface TodayData {
  checkin: boolean;
  checkout: boolean;
  waktuCheckin: string | null;
  waktuCheckout: string | null;
  status: string | null;
  menitTerlambat: number | null;
  jarakCheckin: number | null;
  jarakCheckout: number | null;
  fotoCheckin: string | null;
  fotoCheckout: string | null;
  isOnLeave: boolean;
  kategoriCuti: { id: string; kode: string; keterangan: string; warnaLabel?: string } | null;
  schedule: ScheduleInfo | null;
}

interface ClinicInfo {
  latitude: number;
  longitude: number;
  radiusMeter: number;
  namaKlinik: string;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function formatWIB(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Bandingkan waktu "HH:mm" WIB sekarang dengan rentang [awal, akhir] WIB. Kembalikan true jika dalam rentang. */
function isTimeInRange(awal: string | null, akhir: string | null): boolean {
  if (!awal || !akhir) return true;
  const now = new Date();
  // Convert to WIB (UTC+7) untuk perbandingan
  const wib = new Date(now.getTime() + 7 * 3600000);
  const nowMin = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  const [ah, am] = awal.split(":").map(Number);
  const [bh, bm] = akhir.split(":").map(Number);
  const awalMin = ah * 60 + am;
  const akhirMin = bh * 60 + bm;
  return nowMin >= awalMin && nowMin <= akhirMin;
}

export default function AbsenPage() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLoc, setGettingLoc] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [absenType, setAbsenType] = useState<"checkin" | "checkout" | null>(null);
  const [todayData, setTodayData] = useState<TodayData>({
    checkin: false,
    checkout: false,
    waktuCheckin: null,
    waktuCheckout: null,
    status: null,
    menitTerlambat: null,
    jarakCheckin: null,
    jarakCheckout: null,
    fotoCheckin: null,
    fotoCheckout: null,
    isOnLeave: false,
    kategoriCuti: null,
    schedule: null,
  });

  const fetchToday = () => {
    fetch("/api/attendance/today")
      .then((r) => r.json())
      .then(setTodayData);
  };

  useEffect(() => {
    fetch("/api/clinic-setting").then((r) => r.json()).then(setClinic);
    fetchToday();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserLoc(loc);
          setGettingLoc(false);
        },
        () => setGettingLoc(false),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGettingLoc(false);
    }
  }, []);

  useEffect(() => {
    if (userLoc && clinic) {
      const { haversineDistance } = require("@/lib/haversine");
      const dist = haversineDistance(userLoc.lat, userLoc.lng, clinic.latitude, clinic.longitude);
      setDistance(dist);
    }
  }, [userLoc, clinic]);

  const handleAbsenClick = useCallback((type: "checkin" | "checkout") => {
    setAbsenType(type);
    setShowCamera(true);
    setResult(null);
  }, []);

  const handlePhotoCapture = useCallback(async (base64: string) => {
    if (!absenType || !userLoc) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/attendance/${absenType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLoc.lat,
          longitude: userLoc.lng,
          foto: base64,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({ success: true, message: data.message });
        fetchToday();
      }
    } catch {
      setResult({ success: false, message: "Gagal menghubungi server" });
    } finally {
      setLoading(false);
      setShowCamera(false);
      setAbsenType(null);
    }
  }, [absenType, userLoc]);

  const inRange = distance !== null && clinic ? distance <= clinic.radiusMeter : false;

  // Cek apakah absen masuk bisa dilakukan berdasarkan batas waktu
  const { schedule } = todayData;
  const masukBisa = schedule?.batasAwalMasuk && schedule?.batasAkhirMasuk
    ? isTimeInRange(schedule.batasAwalMasuk, schedule.batasAkhirMasuk)
    : true;
  const keluarBisa = schedule?.batasAwalKeluar && schedule?.batasAkhirKeluar
    ? isTimeInRange(schedule.batasAwalKeluar, schedule.batasAkhirKeluar)
    : true;
  const isHariLibur = schedule?.isLibur ?? false;

  return (
    <>
      {/* Pattern 8a: Curved teal header — simple title */}
      <div className="rounded-b-4xl bg-primary pb-12">
        <div className="px-5 pt-6">
          <h1 className="text-lg font-semibold text-primary-foreground">Absen Hari Ini</h1>
          <p className="text-sm text-primary-foreground/70 mt-1">{clinic?.namaKlinik || "Absensi Puskesmas"}</p>
        </div>
      </div>

      {/* Floating content */}
      <div className="px-5 -mt-4 space-y-4">

        {/* Pattern 8c: Location status card */}
        <div className="rounded-4xl bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-accent">
              <MapPin className="size-4.5 text-accent-foreground" />
              <span className={`absolute -right-0.5 -top-0.5 size-3 rounded-full ring-2 ring-card ${inRange ? "bg-chart-2" : "bg-chart-3"}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-card-foreground truncate">{clinic?.namaKlinik || "Absensi Puskesmas"}</p>
              <p className="text-xs text-muted-foreground">
                {gettingLoc
                  ? "Mendapatkan lokasi..."
                  : userLoc
                  ? `Dalam radius ${distance !== null ? Math.round(distance) : "--"}m / ${clinic?.radiusMeter || "--"}m`
                  : "Lokasi tidak tersedia"}
                {!gettingLoc && userLoc && ` · ${Math.round(userLoc.accuracy)}m`}
              </p>
            </div>
          </div>
          {userLoc && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Jarak</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {distance !== null ? `${Math.round(distance)}m` : "--"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Radius</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{clinic?.radiusMeter || "--"}m</p>
              </div>
            </div>
          )}
        </div>

        {/* Jadwal info card */}
        {schedule && !isHariLibur && (
          <div className="rounded-4xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="size-4 text-accent-foreground" />
              <span className="text-xs font-medium text-foreground">Jadwal Hari Ini</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="block text-[10px] text-muted-foreground/70 mb-0.5">Absen Masuk</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{schedule.batasAwalMasuk || "—"} – {schedule.batasAkhirMasuk || "—"} <span className="text-[10px] font-normal text-muted-foreground/60">WIB</span></span>
              </div>
              <div className="rounded-2xl bg-muted/40 px-3 py-2.5">
                <span className="block text-[10px] text-muted-foreground/70 mb-0.5">Absen Pulang</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{schedule.batasAwalKeluar || "—"} – {schedule.batasAkhirKeluar || "—"} <span className="text-[10px] font-normal text-muted-foreground/60">WIB</span></span>
              </div>
            </div>
          </div>
        )}

        {/* Hari libur notification */}
        {!todayData.isOnLeave && isHariLibur && (
          <div className="rounded-4xl bg-chart-3/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-chart-3/20 flex items-center justify-center shrink-0">
                <TimerOff className="size-4 text-chart-3" />
              </div>
              <div>
                <p className="font-medium text-chart-3">Hari ini libur</p>
                <p className="text-sm text-chart-3/70">Tidak ada jadwal absen untuk hari ini</p>
              </div>
            </div>
          </div>
        )}

        {/* Leave notification */}
        {todayData.isOnLeave && (
          <div className="rounded-4xl bg-accent/20 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-accent/40 flex items-center justify-center shrink-0">
                <CheckCircle className="size-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-accent-foreground">Anda sedang dalam masa cuti/izin</p>
                <p className="text-sm text-muted-foreground">
                  {todayData.kategoriCuti?.keterangan || "Cuti"}
                  {todayData.kategoriCuti?.kode ? ` (${todayData.kategoriCuti.kode})` : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Check-in / Check-out buttons and time status */}
        {!todayData.isOnLeave && !isHariLibur && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleAbsenClick("checkin")}
              disabled={loading || todayData.checkin || !userLoc || gettingLoc || !masukBisa}
              className={`h-14 w-full rounded-2xl text-base font-semibold ${
                todayData.checkin
                  ? "bg-muted text-muted-foreground"
                  : masukBisa
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : todayData.checkin ? (
                "Sudah Check-in"
              ) : !masukBisa ? (
                <>
                  <TimerOff className="size-4" />
                  Di Luar Jam
                </>
              ) : (
                <>
                  <Fingerprint className="size-5" />
                  Absen Masuk
                </>
              )}
            </Button>
            <Button
              onClick={() => handleAbsenClick("checkout")}
              disabled={loading || !todayData.checkin || !userLoc || gettingLoc || !keluarBisa}
              className={`h-14 w-full rounded-2xl text-base font-semibold ${
                todayData.checkout
                  ? "bg-chart-3/20 text-chart-3 hover:bg-chart-3/30"
                  : keluarBisa
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : !todayData.checkin ? (
                <>
                  <Fingerprint className="size-5" />
                  Absen Keluar
                </>
              ) : !keluarBisa ? (
                <>
                  <TimerOff className="size-4" />
                  Di Luar Jam
                </>
              ) : (
                <>
                  <Fingerprint className="size-5" />
                  {todayData.checkout ? "Absen Keluar (Lembur)" : "Absen Keluar"}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className={`rounded-4xl p-5 shadow-sm ${result.success ? "bg-accent/20" : "bg-destructive/10"}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="size-5 text-accent-foreground mt-0.5 shrink-0" />
              ) : (
                <XCircle className="size-5 text-destructive mt-0.5 shrink-0" />
              )}
              <div>
                <p className={`font-medium ${result.success ? "text-accent-foreground" : "text-destructive"}`}>
                  {result.message}
                </p>
                {!result.success && distance !== null && clinic && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Anda berada {Math.round(distance)}m dari puskesmas (maks {clinic.radiusMeter}m)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Check-in/out status card */}
        <div className="rounded-4xl bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            <div className="p-5 flex items-center gap-3">
              <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                todayData.checkin
                  ? todayData.status === "TERLAMBAT"
                    ? "bg-chart-3/20"
                    : "bg-accent/30"
                  : "bg-muted"
              }`}>
                {todayData.checkin ? (
                  todayData.status === "TERLAMBAT" ? (
                    <AlertTriangle className="size-4.5 text-chart-3" />
                  ) : (
                    <CheckCircle className="size-4.5 text-accent-foreground" />
                  )
                ) : (
                  <Clock className="size-4.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-semibold text-foreground">
                  {todayData.checkin
                    ? formatTime(todayData.waktuCheckin)
                    : "Belum check-in"}
                </p>
              </div>
              {todayData.checkin && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-xs font-medium ${
                    todayData.status === "TERLAMBAT" ? "text-chart-3" : "text-accent-foreground"
                  }`}>
                    {todayData.status === "TERLAMBAT"
                      ? `Terlambat ${todayData.menitTerlambat} mnt`
                      : "Tepat Waktu"}
                  </p>
                  {todayData.jarakCheckin !== null && (
                    <p className="text-[10px] text-muted-foreground">{todayData.jarakCheckin}m</p>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 flex items-center gap-3">
              <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                todayData.checkout ? "bg-accent/30" : "bg-muted"
              }`}>
                {todayData.checkout ? (
                  <CheckCircle className="size-4.5 text-accent-foreground" />
                ) : (
                  <Clock className="size-4.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-semibold text-foreground">
                  {todayData.checkout
                    ? formatTime(todayData.waktuCheckout)
                    : todayData.checkin
                      ? "Belum check-out"
                      : "Belum check-in"}
                </p>
              </div>
              {todayData.checkout && todayData.jarakCheckout !== null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">{todayData.jarakCheckout}m</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Overlay */}
      {showCamera && clinic && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => { setShowCamera(false); setAbsenType(null); }}
          loading={loading}
          info={{
            namaKlinik: clinic.namaKlinik,
            jarak: distance,
            radiusMeter: clinic.radiusMeter,
            inRange,
          }}
        />
      )}
    </>
  );
}
