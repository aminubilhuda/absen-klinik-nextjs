"use client";

import { useEffect, useState } from "react";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ScheduleItem {
  id: string;
  day: string;
  jamMasuk?: string;
  jamKeluar?: string;
  batasAwalMasuk?: string;
  batasAkhirMasuk?: string;
  batasAwalKeluar?: string;
  batasAkhirKeluar?: string;
  isLibur: boolean;
}

const dayOrder = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU", "MINGGU"];
const dayNames: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu", KAMIS: "Kamis",
  JUMAT: "Jumat", SABTU: "Sabtu", MINGGU: "Minggu",
};

export default function AdminJadwalPage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.schedules || []).sort(
          (a: ScheduleItem, b: ScheduleItem) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
        );
        setSchedules(sorted);
      });
  }, []);

  function updateSchedule(id: string, field: string, value: any) {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedules }),
    });
    if (res.ok) toast.success("Jadwal berhasil disimpan");
    else toast.error("Gagal menyimpan");
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Jadwal Kerja</h1>

      <div className="space-y-3">
        {schedules.map((s) => (
          <Card key={s.id} className={`border-0 shadow-sm ${s.isLibur ? "bg-muted" : ""}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/30 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="font-semibold">{dayNames[s.day]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground/60">Libur</Label>
                  <Switch
                    id={`libur-${s.id}`}
                    checked={s.isLibur}
                    onCheckedChange={(v) => updateSchedule(s.id, "isLibur", v)}
                  />
                </div>
              </div>
              {!s.isLibur && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Jam Masuk</Label>
                    <Input
                      type="time"
                      value={s.jamMasuk || "07:00"}
                      onChange={(e) => updateSchedule(s.id, "jamMasuk", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Jam Keluar</Label>
                    <Input
                      type="time"
                      value={s.jamKeluar || "14:00"}
                      onChange={(e) => updateSchedule(s.id, "jamKeluar", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Batas Awal Absen Masuk</Label>
                    <Input
                      type="time"
                      value={s.batasAwalMasuk || "06:00"}
                      onChange={(e) => updateSchedule(s.id, "batasAwalMasuk", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Batas Akhir Absen Masuk</Label>
                    <Input
                      type="time"
                      value={s.batasAkhirMasuk || "08:00"}
                      onChange={(e) => updateSchedule(s.id, "batasAkhirMasuk", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Batas Awal Absen Pulang</Label>
                    <Input
                      type="time"
                      value={s.batasAwalKeluar || "14:00"}
                      onChange={(e) => updateSchedule(s.id, "batasAwalKeluar", e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/60">Batas Akhir Absen Pulang</Label>
                    <Input
                      type="time"
                      value={s.batasAkhirKeluar || "17:00"}
                      onChange={(e) => updateSchedule(s.id, "batasAkhirKeluar", e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length > 0 && (
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 bg-primary hover:bg-primary/90"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan Jadwal"}
        </Button>
      )}
    </div>
  );
}
