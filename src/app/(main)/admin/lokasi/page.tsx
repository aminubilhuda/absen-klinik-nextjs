"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Save, Navigation } from "lucide-react";
import { useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), { ssr: false });


function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    map.flyTo(center, map.getZoom());
  }, [center[0], center[1]]);

  return null;
}

export default function AdminLokasiPage() {
  const [setting, setSetting] = useState({ latitude: -6.2, longitude: 106.8, radiusMeter: 100, namaKlinik: "" });
  const [marker, setMarker] = useState<[number, number]>([-6.2, 106.8]);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/clinic-setting")
      .then((r) => r.json())
      .then((data) => {
        if (data.latitude) {
          setSetting(data);
          setMarker([data.latitude, data.longitude]);
        }
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/clinic-setting", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...setting, latitude: marker[0], longitude: marker[1] }),
    });
    if (res.ok) toast.success("Lokasi klinik disimpan");
    else toast.error("Gagal menyimpan");
    setSaving(false);
  }

  function handleFindLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser ini");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMarker([latitude, longitude]);
        setSetting((prev) => ({ ...prev, latitude, longitude }));
        toast.success("Lokasi ditemukan");
        setLocating(false);
      },
      () => {
        toast.error("Gagal mendapatkan lokasi. Periksa izin lokasi.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Lokasi Klinik</h1>

      <Card className="border-0 shadow-sm p-0 overflow-hidden rounded-2xl h-64">
        <MapContainer center={marker} zoom={16} className="h-full w-full" scrollWheelZoom={true}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            position={marker}
            draggable={true}
            ref={markerRef}
            eventHandlers={{
              dragend: () => {
                const m = markerRef.current;
                if (m) {
                  const latlng = m.getLatLng();
                  setMarker([latlng.lat, latlng.lng]);
                }
              },
            }}
          />
          <Circle center={marker} radius={setting.radiusMeter} pathOptions={{ color: "#059669", fillOpacity: 0.1 }} />
          <MapUpdater center={marker} />
        </MapContainer>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Nama Klinik</Label>
            <Input
              value={setting.namaKlinik}
              onChange={(e) => setSetting({ ...setting, namaKlinik: e.target.value })}
              placeholder="Nama klinik..."
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input value={marker[0].toFixed(6)} readOnly className="h-11 bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input value={marker[1].toFixed(6)} readOnly className="h-11 bg-gray-50" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Radius (meter)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={setting.radiusMeter}
                onChange={(e) => setSetting({ ...setting, radiusMeter: parseInt(e.target.value) || 0 })}
                min={10}
                max={1000}
                className="h-11"
              />
              <span className="text-sm text-gray-500">m</span>
            </div>
          </div>

          <Button
            onClick={handleFindLocation}
            disabled={locating}
            variant="outline"
            className="w-full h-11"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {locating ? "Mencari..." : "Temukan Lokasi Saya"}
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Menyimpan..." : "Simpan Lokasi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
