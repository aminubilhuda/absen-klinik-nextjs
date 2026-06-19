"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, FileSpreadsheet, FileText, Loader2, Check } from "lucide-react";
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

interface DayCell {
  type: "checkmark" | "hours" | "code" | "empty" | "holiday" | "sunday" | "liburJadwal";
  value: string | null;
  codeLabel?: string;
  warnaLabel?: string;
}

interface KategoriItem {
  id: string;
  kode: string;
  keterangan: string;
}

interface UserReport {
  userId: string;
  nip: string | null;
  nama: string;
  harian: DayCell[];
  tjk: string;
  kjk: string;
  totalKjk: string;
  tjl: string;
  tks: number;
  tjkMenit: number;
  kjkMenit: number;
  tjlMenit: number;
}

interface ReportData {
  unitKerja: UnitKerjaItem | null;
  clinicName: string;
  bulan: number;
  tahun: number;
  totalHari: number;
  daftarHari: DayInfo[];
  kategoriList: KategoriItem[];
  data: UserReport[];
}

const BULAN_INDONESIA = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const HARI_INDONESIA = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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
      a.download = `laporan-presensi-${filters.bulan}-${filters.tahun}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Berhasil mengekspor ${format.toUpperCase()}`);
    } catch {
      toast.error("Gagal mengekspor laporan");
    } finally {
      setter(false);
    }
  }

  function getCellDisplay(cell: DayCell, hari: DayInfo) {
    if (cell.type === "checkmark") {
      return (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
          <Check className="w-3 h-3 text-green-600" />
        </span>
      );
    }
    if (cell.type === "hours") {
      return <span className="text-gray-800 text-[10px]">{cell.value}</span>;
    }
    if (cell.type === "code") {
      return (
        <span className="inline-block px-1 rounded text-[9px] font-medium bg-green-100 text-green-800">
          {cell.value}
        </span>
      );
    }
    if (cell.type === "holiday" || cell.type === "sunday" || cell.type === "liburJadwal") {
      return <span className="text-gray-300">-</span>;
    }
    return null;
  }

  function getCellClass(cell: DayCell, hari: DayInfo): string {
    if (cell.type === "holiday") return "bg-red-100";
    if (cell.type === "sunday") return "bg-yellow-50";
    if (cell.type === "liburJadwal") return "bg-gray-100";
    if (cell.type === "code" || cell.type === "checkmark") return "bg-green-50";
    return "";
  }

  const now = new Date();
  const cetakStr = `Cetak pada ${HARI_INDONESIA[now.getDay()]}, ${now.getDate()} ${BULAN_INDONESIA[now.getMonth() + 1]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
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
          {/* REPORT HEADER */}
          <div className="text-center border-b-2 border-gray-800 pb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase">Pemerintah Kabupaten Tuban</h2>
            <h1 className="text-base font-bold text-gray-900 mt-1">Laporan Perhitungan Presensi Bulanan</h1>
            <p className="text-sm font-semibold text-gray-700">
              {BULAN_INDONESIA[report.bulan]} {report.tahun}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Nama Unit Kerja : <strong>{report.unitKerja ? report.unitKerja.nama : "Semua Unit"}</strong>
            </span>
            <span className="text-gray-400">{cetakStr}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
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

          {/* MAIN TABLE */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th rowSpan={2} className="px-1 py-1.5 border-r text-center font-semibold text-gray-700 w-8">No</th>
                  <th rowSpan={2} className="px-2 py-1.5 border-r text-left font-semibold text-gray-700 min-w-[140px]">Pegawai</th>
                  <th colSpan={report.totalHari} className="px-1 py-1.5 border-r text-center font-semibold text-gray-700 text-xs">
                    Total Jam Kerja Harian ({BULAN_INDONESIA[report.bulan]} {report.tahun})
                  </th>
                  <th colSpan={5} className="px-1 py-1.5 text-center font-semibold text-gray-700 text-xs">Ringkasan</th>
                </tr>
                <tr className="bg-gray-50 border-b">
                  {report.daftarHari.map((hari) => {
                    let cls = "px-0.5 py-1 border-r text-center font-medium text-gray-600 min-w-[32px]";
                    if (hari.isLiburNasional) cls += " bg-red-100 text-red-700";
                    else if (hari.isMinggu) cls += " bg-yellow-50 text-yellow-700";
                    return (
                      <th key={hari.tanggal} className={cls}>
                        <div className="text-[10px] leading-tight">{hari.tanggal}/{report.bulan}</div>
                        <div className="text-[8px] opacity-60 leading-tight">{hari.namaHari.slice(0, 3)}</div>
                      </th>
                    );
                  })}
                  <th className="px-1 py-1 border-r text-center font-semibold text-gray-700 min-w-[40px] text-[10px]">TJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-gray-700 min-w-[40px] text-[10px]">KJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-gray-700 min-w-[44px] text-[10px]">TOTAL KJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-gray-700 min-w-[40px] text-[10px]">TJL</th>
                  <th className="px-1 py-1 text-center font-semibold text-gray-700 min-w-[32px] text-[10px]">TKS</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((row, i) => (
                  <tr key={row.userId} className="border-b hover:bg-gray-50">
                    <td className="px-1 py-1 border-r text-center text-gray-500 text-[10px]">{i + 1}</td>
                    <td className="px-2 py-1 border-r text-gray-800 whitespace-nowrap">
                      {row.nip && <div className="text-[10px] text-gray-400">{row.nip}</div>}
                      <div className="text-xs font-medium">{row.nama}</div>
                    </td>
                    {row.harian.map((cell, j) => {
                      const hari = report.daftarHari[j];
                      return (
                        <td
                          key={j}
                          className={`px-0.5 py-1 border-r text-center align-middle ${getCellClass(cell, hari)}`}
                        >
                          {getCellDisplay(cell, hari)}
                        </td>
                      );
                    })}
                    <td className="px-1 py-1 border-r text-center font-semibold text-emerald-700 text-[10px]">{row.tjk}</td>
                    <td className={`px-1 py-1 border-r text-center font-semibold text-[10px] ${row.kjkMenit > 0 ? "text-red-600" : "text-gray-500"}`}>
                      {row.kjk}
                    </td>
                    <td className={`px-1 py-1 border-r text-center font-semibold text-[10px] ${row.kjkMenit > 0 ? "text-red-600" : "text-gray-500"}`}>
                      {row.totalKjk}
                    </td>
                    <td className="px-1 py-1 border-r text-center font-semibold text-blue-600 text-[10px]">{row.tjl}</td>
                    <td className={`px-1 py-1 text-center font-semibold text-[10px] ${row.tks > 0 ? "text-red-600" : "text-gray-500"}`}>
                      {row.tks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* LEGENDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
            <Card className="border">
              <CardContent className="p-3">
                <h3 className="font-bold text-gray-700 mb-1 text-xs">a. Kategori Absensi</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-1 py-0.5 font-semibold w-16">Kode</th>
                      <th className="text-left px-1 py-0.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.kategoriList.map((k) => (
                      <tr key={k.id} className="border-b border-gray-100">
                        <td className="px-1 py-0.5 font-mono text-green-700">{k.kode}</td>
                        <td className="px-1 py-0.5 text-gray-600">{k.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-3">
                <h3 className="font-bold text-gray-700 mb-1 text-xs">b. Kode Total</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-1 py-0.5 font-semibold w-16">Kode</th>
                      <th className="text-left px-1 py-0.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["TJK", "Total Jam Kerja"],
                      ["KJK", "Kekurangan Jam Kerja"],
                      ["TOTAL KJK", "Total Akumulasi Kekurangan Jam Kerja"],
                      ["TJL", "Total Jam Lembur"],
                      ["TKS", "Tanpa Keterangan Sah"],
                    ].map(([kode, ket]) => (
                      <tr key={kode} className="border-b border-gray-100">
                        <td className="px-1 py-0.5 font-mono text-gray-800">{kode}</td>
                        <td className="px-1 py-0.5 text-gray-600">{ket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-3">
                <h3 className="font-bold text-gray-700 mb-1 text-xs">c. Kode Warna</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-1 py-0.5 font-semibold w-16">Warna</th>
                      <th className="text-left px-1 py-0.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { warna: "bg-gray-100", label: "Abu-abu", ket: "Tidak Ada Jadwal" },
                      { warna: "bg-red-100", label: "Merah", ket: "Hari Libur" },
                      { warna: "bg-yellow-50", label: "Kuning", ket: "Hari Minggu" },
                      { warna: "bg-green-50", label: "Hijau", ket: "Absensi (kode kategori tercatat)" },
                    ].map((item) => (
                      <tr key={item.label} className="border-b border-gray-100">
                        <td className="px-1 py-0.5">
                          <span className={`inline-block w-3 h-3 rounded ${item.warna} border border-gray-300 align-middle`}></span>
                          <span className="ml-1 text-gray-700">{item.label}</span>
                        </td>
                        <td className="px-1 py-0.5 text-gray-600">{item.ket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
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
