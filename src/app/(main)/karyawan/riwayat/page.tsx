"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertTriangle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Riwayat Absensi</h1>

      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="font-semibold text-gray-800">{monthNames[selectedMonth - 1]} {selectedYear}</span>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {records.length === 0 ? (
        <Card className="border-0">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada riwayat absensi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const d = new Date(rec.tanggal);
            const dayName = dayNames[d.getDay()];
            const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

            return (
              <Card key={rec.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center">
                        <span className="text-[10px] font-medium text-emerald-600">{dayName}</span>
                        <span className="text-lg font-bold text-emerald-700">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{dateStr}</p>
                        {rec.kategoriAbsensi ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              className="border-0 text-xs"
                              style={rec.kategoriAbsensi.warnaLabel ? {
                                backgroundColor: rec.kategoriAbsensi.warnaLabel + "20",
                                color: rec.kategoriAbsensi.warnaLabel,
                              } : {
                                backgroundColor: "#ecfdf5",
                                color: "#059669",
                              }}
                            >
                              {rec.kategoriAbsensi.kode}
                            </Badge>
                            <span className="text-xs text-gray-500">{rec.kategoriAbsensi.keterangan}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {rec.waktuCheckin
                                ? (() => { const d = new Date(rec.waktuCheckin); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; })()
                                : "--:--"}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {rec.waktuCheckout
                                ? (() => { const d = new Date(rec.waktuCheckout); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; })()
                                : "--:--"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!rec.kategoriAbsensi && (
                      <div className="text-right">
                        {rec.status === "TEPAT_WAKTU" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
                            <CheckCircle className="w-3 h-3 mr-1" /> Tepat Waktu
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-0 hover:bg-amber-100">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {rec.menitTerlambat}m
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500 px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
