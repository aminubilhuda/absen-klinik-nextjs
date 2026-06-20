"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface KategoriInfo {
  id: string;
  kode: string;
  keterangan: string;
  warnaLabel?: string;
}

interface AttendanceRecord {
  id: string;
  tanggal: string;
  waktuCheckin?: string;
  waktuCheckout?: string;
  status: string;
  menitTerlambat?: number;
  kategoriAbsensiId?: string;
  kategoriAbsensi?: KategoriInfo;
}

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export default function RiwayatPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/history?page=${page}&limit=30&month=${selectedMonth}&year=${selectedYear}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      });
  }, [page, selectedMonth, selectedYear]);

  function prevMonth() {
    setPage(1);
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    setPage(1);
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="size-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Pattern 8a: Curved teal header */}
      <div className="rounded-b-4xl bg-primary pb-12">
        <div className="px-5 pt-6">
          <h1 className="text-lg font-semibold text-primary-foreground">Riwayat Absensi</h1>
          <p className="text-sm text-primary-foreground/70 mt-1">Catatan kehadiran Anda</p>
        </div>
      </div>

      {/* Floating content */}
      <div className="px-5 -mt-4 space-y-4">

        {/* Month picker */}
        <div className="rounded-2xl bg-card border border-border px-4 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="size-5 text-muted-foreground" />
            </button>
            <span className="font-semibold text-foreground">{monthNames[selectedMonth - 1]} {selectedYear}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Record list */}
        {records.length === 0 ? (
          <div className="rounded-4xl bg-card shadow-sm p-8 text-center">
            <Calendar className="size-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada riwayat absensi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const d = new Date(rec.tanggal);
              const dayName = dayNames[d.getDay()];
              const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

              return (
                <div key={rec.id} className="rounded-4xl bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-12 bg-accent/30 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-[10px] font-medium text-accent-foreground">{dayName}</span>
                        <span className="text-lg font-bold text-accent-foreground">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{dateStr}</p>
                        {rec.kategoriAbsensi ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              className="border-0 text-xs"
                              style={rec.kategoriAbsensi.warnaLabel ? {
                                backgroundColor: rec.kategoriAbsensi.warnaLabel + "20",
                                color: rec.kategoriAbsensi.warnaLabel,
                              } : {
                                backgroundColor: "var(--accent)",
                                color: "var(--accent-foreground)",
                              }}
                            >
                              {rec.kategoriAbsensi.kode}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{rec.kategoriAbsensi.keterangan}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {rec.waktuCheckin
                                ? formatTime(rec.waktuCheckin)
                                : "--:--"}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {rec.waktuCheckout
                                ? formatTime(rec.waktuCheckout)
                                : "--:--"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!rec.kategoriAbsensi && (
                      <div className="text-right">
                        {rec.status === "TEPAT_WAKTU" ? (
                          <Badge className="bg-accent text-accent-foreground border-0">
                            <CheckCircle className="size-3 mr-1" /> Tepat Waktu
                          </Badge>
                        ) : (
                          <Badge className="bg-chart-3/20 text-chart-3 border-0">
                            <AlertTriangle className="size-3 mr-1" /> {rec.menitTerlambat}m
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 pb-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
