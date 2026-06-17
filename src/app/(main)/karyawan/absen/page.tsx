"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Navigation, CheckCircle, XCircle, Loader2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { haversineDistance } from "@/lib/haversine";

interface TodayData {
  checkin: boolean;
  checkout: boolean;
  waktuCheckin: string | null;
  waktuCheckout: string | null;
  status: string | null;
  menitTerlambat: number | null;
  jarakCheckin: number | null;
  jarakCheckout: number | null;
}

interface ClinicInfo {
  latitude: number;
  longitude: number;
  radiusMeter: number;
  namaKlinik: string;
}

export default function AbsenPage() {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLoc, setGettingLoc] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [todayData, setTodayData] = useState<TodayData>({
    checkin: false,
    checkout: false,
    waktuCheckin: null,
    waktuCheckout: null,
    status: null,
    menitTerlambat: null,
    jarakCheckin: null,
    jarakCheckout: null,
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
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGettingLoc(false);
    }
  }, []);

  useEffect(() => {
    if (userLoc && clinic) {
      const dist = haversineDistance(userLoc.lat, userLoc.lng, clinic.latitude, clinic.longitude);
      setDistance(dist);
    }
  }, [userLoc, clinic]);

  const handleAbsen = useCallback(
    async (type: "checkin" | "checkout") => {
      if (!userLoc) return;
      setLoading(true);
      setResult(null);

      try {
        const res = await fetch(`/api/attendance/${type}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: userLoc.lat,
            longitude: userLoc.lng,
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
      }
    },
    [userLoc]
  );

  const inRange = distance !== null && clinic ? distance <= clinic.radiusMeter : false;

  const formatTime = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Absen Hari Ini</h1>

      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">{clinic?.namaKlinik || "Klinik"}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-100">Jarak</p>
            <p className="text-xl font-bold">
              {distance !== null ? `${Math.round(distance)}m` : "--"}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-100">Radius</p>
            <p className="text-xl font-bold">{clinic?.radiusMeter || "--"}m</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          {gettingLoc ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : userLoc ? (
            <Navigation className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-emerald-100">
            {gettingLoc
              ? "Mendapatkan lokasi..."
              : userLoc
              ? `Akurasi GPS: ${Math.round(userLoc.accuracy)}m`
              : "Lokasi tidak tersedia"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => handleAbsen("checkin")}
          disabled={loading || todayData.checkin || !userLoc || gettingLoc}
          className={`h-14 text-base font-semibold rounded-xl ${
            todayData.checkin
              ? "bg-gray-100 text-gray-400"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : todayData.checkin ? (
            "Sudah Check-in"
          ) : (
            "Absen Masuk"
          )}
        </Button>
        <Button
          onClick={() => handleAbsen("checkout")}
          disabled={loading || !todayData.checkin || todayData.checkout || !userLoc || gettingLoc}
          variant={todayData.checkout ? "outline" : "default"}
          className={`h-14 text-base font-semibold rounded-xl ${
            todayData.checkout
              ? "bg-gray-100 text-gray-400"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : todayData.checkout ? (
            "Sudah Check-out"
          ) : (
            "Absen Keluar"
          )}
        </Button>
      </div>

      {result && (
        <Card className={`border-0 ${result.success ? "bg-emerald-50" : "bg-red-50"}`}>
          <CardContent className="p-4 flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`font-medium ${result.success ? "text-emerald-700" : "text-red-600"}`}>
                {result.message}
              </p>
              {!result.success && distance !== null && clinic && (
                <p className="text-sm text-gray-500 mt-1">
                  Anda berada {Math.round(distance)}m dari klinik (maks {clinic.radiusMeter}m)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                todayData.checkin
                  ? todayData.status === "TERLAMBAT"
                    ? "bg-amber-100"
                    : "bg-emerald-100"
                  : "bg-gray-100"
              }`}>
                {todayData.checkin ? (
                  todayData.status === "TERLAMBAT" ? (
                    <AlertTriangle className={`w-4 h-4 ${
                      todayData.checkin
                        ? todayData.status === "TERLAMBAT"
                          ? "text-amber-600"
                          : "text-emerald-600"
                        : "text-gray-400"
                    }`} />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  )
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Check-in</p>
                <p className="font-semibold">
                  {todayData.checkin
                    ? formatTime(todayData.waktuCheckin)
                    : "Belum check-in"}
                </p>
              </div>
              {todayData.checkin && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-xs font-medium ${
                    todayData.status === "TERLAMBAT" ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {todayData.status === "TERLAMBAT"
                      ? `Terlambat ${todayData.menitTerlambat} mnt`
                      : "Tepat Waktu"}
                  </p>
                  {todayData.jarakCheckin !== null && (
                    <p className="text-[10px] text-gray-400">{todayData.jarakCheckin}m</p>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                todayData.checkout ? "bg-blue-100" : "bg-gray-100"
              }`}>
                {todayData.checkout ? (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Check-out</p>
                <p className="font-semibold">
                  {todayData.checkout
                    ? formatTime(todayData.waktuCheckout)
                    : todayData.checkin
                      ? "Belum check-out"
                      : "Belum check-in"}
                </p>
              </div>
              {todayData.checkout && todayData.jarakCheckout !== null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400">{todayData.jarakCheckout}m</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
