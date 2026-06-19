"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UnitKerjaItem {
  id: string;
  nama: string;
}

interface DayInfo {
  tanggal: number;
  namaHari: string;
  isLiburNasional: boolean;
  isMinggu: boolean;
  keteranganLibur?: string;
}

interface UserReport {
  userId: string;
  nama: string;
  harian: (string | null)[];
  tjk: string;
  kjk: string;
  tjkMenit: number;
  kjkMenit: number;
}

interface ReportData {
  unitKerja: UnitKerjaItem | null;
  bulan: number;
  tahun: number;
  totalHari: number;
  daftarHari: DayInfo[];
  data: UserReport[];
}

const BULAN_INDONESIA = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TAHUN_LIST = Array.from({ length: 11 }, (_, i) => 2020 + i);

export default function RekapJamKerjaPage() {
  const [unitKerjaList, setUnitKerjaList] = useState<UnitKerjaItem[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [filters, setFilters] = useState({
    unitKerjaId: "",
    bulan: String(new Date().getMonth() + 1),
    tahun: String(new Date().getFullYear()),
  });

  useEffect(() => {
    fetch("/api/unit-kerja")
      .then((r) => r.json())
      .then((res) => setUnitKerjaList(res.data || []))
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/reports/rekap-jam-kerja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal memuat laporan");
        return;
      }
      const data = await res.json();
      setReport(data);
    } catch {
      toast.error("Terjadi kesalahan saat memuat laporan");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  async function exportReport(format: "pdf" | "xlsx") {
    const setter = format === "pdf" ? setExportingPdf : setExportingXlsx;
    setter(true);
    try {
      const res = await fetch("/api/reports/rekap-jam-kerja/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mengekspor");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-jam-kerja-${filters.bulan}-${filters.tahun}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Berhasil mengekspor ${format.toUpperCase()}`);
    } catch {
      toast.error("Gagal mengekspor laporan");
    } finally {
      setter(false);
    }
  }

  function getCellClass(hari: DayInfo): string {
    if (hari.isLiburNasional) return "bg-red-100 text-red-700";
    if (hari.isMinggu) return "bg-yellow-50 text-yellow-700";
    return "";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Rekap Jam Kerja Harian Pegawai</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Unit Kerja</Label>
              <Select
                value={filters.unitKerjaId || null}
                onValueChange={(v) => setFilters({ ...filters, unitKerjaId: v ?? "" })}
                items={unitKerjaList.map(uk => ({ value: uk.id, label: uk.nama }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Semua Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Unit</SelectItem>
                  {unitKerjaList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select
                value={filters.bulan}
                onValueChange={(v) => setFilters({ ...filters, bulan: v ?? "1" })}
                items={BULAN_INDONESIA.slice(1).map((nama, i) => ({ value: String(i + 1), label: nama }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_INDONESIA.map((nama, i) =>
                    i > 0 ? (
                      <SelectItem key={i} value={String(i)}>{nama}</SelectItem>
                    ) : null
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Select
                value={filters.tahun}
                onValueChange={(v) => setFilters({ ...filters, tahun: v ?? String(new Date().getFullYear()) })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAHUN_LIST.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memuat...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />Tampilkan</>
            )}
          </Button>
        </CardContent>
      </Card>

      {report && report.data.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {report.unitKerja ? `Unit Kerja: ${report.unitKerja.nama}` : "Semua Unit"} &middot;{" "}
              {BULAN_INDONESIA[report.bulan]} {report.tahun} &middot;{" "}
              {report.data.length} pegawai
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-700"
                onClick={() => exportReport("xlsx")}
                disabled={exportingXlsx}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {exportingXlsx ? "..." : "Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-700"
                onClick={() => exportReport("pdf")}
                disabled={exportingPdf}
              >
                <FileText className="w-4 h-4 mr-1" />
                {exportingPdf ? "..." : "PDF"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th rowSpan={2} className="px-2 py-2 border-r text-center font-semibold text-gray-700 w-10">No</th>
                  <th rowSpan={2} className="px-3 py-2 border-r text-left font-semibold text-gray-700 min-w-[150px]">Pegawai</th>
                  <th colSpan={report.totalHari} className="px-2 py-2 border-r text-center font-semibold text-gray-700">
                    Total Jam Kerja Harian
                  </th>
                  <th colSpan={2} className="px-2 py-2 text-center font-semibold text-gray-700">Total</th>
                </tr>
                <tr className="bg-gray-50 border-b">
                  {report.daftarHari.map((hari) => (
                    <th
                      key={hari.tanggal}
                      className={`px-1 py-1 border-r text-center font-medium text-gray-600 min-w-[48px] ${getCellClass(hari)}`}
                    >
                      <div>{hari.tanggal}</div>
                      <div className="text-[10px] opacity-60">{hari.namaHari.slice(0, 3)}</div>
                    </th>
                  ))}
                  <th className="px-2 py-1 border-r text-center font-semibold text-gray-700 min-w-[60px]">TJK</th>
                  <th className="px-2 py-1 text-center font-semibold text-gray-700 min-w-[60px]">KJK</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((row, i) => (
                  <tr key={row.userId} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5 border-r text-center text-gray-500">{i + 1}</td>
                    <td className="px-3 py-1.5 border-r font-medium text-gray-800 whitespace-nowrap">{row.nama}</td>
                    {row.harian.map((jam, j) => {
                      const hari = report.daftarHari[j];
                      return (
                        <td
                          key={j}
                          className={`px-1 py-1.5 border-r text-center ${jam ? "text-gray-800" : "text-gray-400"} ${getCellClass(hari)}`}
                        >
                          {jam || "-"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 border-r text-center font-semibold text-emerald-700">{row.tjk}</td>
                    <td className={`px-2 py-1.5 text-center font-semibold ${row.kjkMenit > 0 ? "text-red-600" : "text-gray-500"}`}>
                      {row.kjk}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {report && report.data.length === 0 && !loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-gray-400">
            Tidak ada data pegawai untuk periode ini
          </CardContent>
        </Card>
      )}
    </div>
  );
}
