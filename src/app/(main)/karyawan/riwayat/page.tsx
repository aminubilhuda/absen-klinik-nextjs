"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle, AlertTriangle, XCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  id: string;
  tanggal: string;
  waktuCheckin?: string;
  waktuCheckout?: string;
  status: string;
  menitTerlambat?: number;
}

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function RiwayatPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/history?page=${page}&limit=30`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      });
  }, [page]);

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
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.waktuCheckin
                              ? new Date(rec.waktuCheckin).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "--:--"}
                          </span>
                          <span>→</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.waktuCheckout
                              ? new Date(rec.waktuCheckout).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                              : "--:--"}
                          </span>
                        </div>
                      </div>
                    </div>
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
