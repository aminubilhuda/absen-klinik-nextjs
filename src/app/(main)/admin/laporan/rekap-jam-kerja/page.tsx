"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, FileSpreadsheet, FileText, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface UnitKerjaItem {
  id: string;
  nama: string;
}

interface UserItem {
  id: string;
  nama: string;
  nip?: string | null;
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
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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
    fetch("/api/users?role=KARYAWAN&limit=100")
      .then((r) => r.json())
      .then((res) => setUserList(res.users || []))
      .catch(() => {});
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-picker")) setShowUserDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function sendRequest(d: any) {
    return fetch("/api/reports/rekap-jam-kerja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await sendRequest({ ...filters, userId: selectedUsers.length > 0 ? selectedUsers : undefined });
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
  }, [filters, selectedUsers]);

  async function exportReport(format: "pdf" | "xlsx") {
    const setter = format === "pdf" ? setExportingPdf : setExportingXlsx;
    setter(true);
    try {
      const res = await fetch("/api/reports/rekap-jam-kerja/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, userId: selectedUsers.length > 0 ? selectedUsers : undefined, format }),
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
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent/30">
          <Check className="w-3 h-3 text-accent-foreground" />
        </span>
      );
    }
    if (cell.type === "hours") {
      return <span className="text-foreground text-[10px]">{cell.value}</span>;
    }
    if (cell.type === "code") {
      return (
        <span className="inline-block px-1 rounded text-[9px] font-medium bg-accent/30 text-accent-foreground">
          {cell.value}
        </span>
      );
    }
    if (cell.type === "holiday" || cell.type === "sunday" || cell.type === "liburJadwal") {
      return <span className="text-muted-foreground/30">-</span>;
    }
    return null;
  }

  function getCellClass(cell: DayCell, hari: DayInfo): string {
    if (cell.type === "holiday") return "bg-destructive/10";
    if (cell.type === "sunday") return "bg-chart-3/10";
    if (cell.type === "liburJadwal") return "bg-muted";
    if (cell.type === "code" || cell.type === "checkmark") return "bg-accent/30";
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
          {/* Filter pegawai */}
          <div className="space-y-2 user-picker">
            <Label>Pegawai (opsional — pilih 1 atau lebih)</Label>
            <div className="relative">
              <div
                className="min-h-[44px] rounded-xl border border-input bg-background px-3 py-1.5 flex flex-wrap gap-1 cursor-text"
                onClick={() => setShowUserDropdown(true)}
              >
                {selectedUsers.map((uid) => {
                  const u = userList.find((x) => x.id === uid);
                  return u ? (
                    <span key={uid} className="inline-flex items-center gap-1 bg-accent/30 text-accent-foreground text-xs font-medium px-2 py-1 rounded-full">
                      {u.nama}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedUsers((prev) => prev.filter((id) => id !== uid)); }}
                        className="hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ) : null;
                })}
                <input
                  placeholder={selectedUsers.length === 0 ? "Cari nama pegawai..." : ""}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onFocus={() => setShowUserDropdown(true)}
                  className="flex-1 border-0 bg-transparent text-sm outline-none min-w-[120px] py-1"
                />
              </div>
              {showUserDropdown && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                  {userList
                    .filter((u) => u.nama.toLowerCase().includes(userSearch.toLowerCase()))
                    .map((u) => {
                      const isSelected = selectedUsers.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/30 flex items-center justify-between ${
                            isSelected ? "bg-accent/20" : ""
                          }`}
                          onClick={() => {
                            setSelectedUsers((prev) =>
                              isSelected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                            );
                            setUserSearch("");
                          }}
                        >
                          <span>{u.nama}</span>
                          {isSelected && <Check className="size-4 text-accent-foreground" />}
                        </button>
                      );
                    })}
                  {userList.filter((u) => u.nama.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground/60">Tidak ditemukan</div>
                  )}
                </div>
              )}
            </div>
            {selectedUsers.length > 0 && (
              <button
                className="text-xs text-muted-foreground/60 hover:text-destructive"
                onClick={() => setSelectedUsers([])}
              >
                Hapus semua
              </button>
            )}
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary/90"
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
          <div className="text-center border-b-2 border-foreground/80 pb-3">
            <h2 className="text-sm font-bold text-foreground uppercase">Pemerintah Kabupaten Tuban</h2>
            <h1 className="text-base font-bold text-foreground mt-1">Laporan Perhitungan Presensi Bulanan</h1>
            <p className="text-sm font-semibold text-foreground/80">
              {BULAN_INDONESIA[report.bulan]} {report.tahun}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Nama Unit Kerja : <strong>{report.unitKerja ? report.unitKerja.nama : "Semua Unit"}</strong>
            </span>
            <span className="text-muted-foreground/60">{cetakStr}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground/80">
              {report.data.length} pegawai
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-accent text-accent-foreground"
                onClick={() => exportReport("xlsx")}
                disabled={exportingXlsx}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {exportingXlsx ? "..." : "Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-accent text-accent-foreground"
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
                <tr className="bg-muted border-b">
                  <th rowSpan={2} className="px-1 py-1.5 border-r text-center font-semibold text-foreground/80 w-8">No</th>
                  <th rowSpan={2} className="px-2 py-1.5 border-r text-left font-semibold text-foreground/80 min-w-[140px]">Pegawai</th>
                  <th colSpan={report.totalHari} className="px-1 py-1.5 border-r text-center font-semibold text-foreground/80 text-xs">
                    Total Jam Kerja Harian ({BULAN_INDONESIA[report.bulan]} {report.tahun})
                  </th>
                  <th colSpan={5} className="px-1 py-1.5 text-center font-semibold text-foreground/80 text-xs">Ringkasan</th>
                </tr>
                <tr className="bg-muted border-b">
                  {report.daftarHari.map((hari) => {
                    let cls = "px-0.5 py-1 border-r text-center font-medium text-muted-foreground min-w-[32px]";
                    if (hari.isLiburNasional) cls += " bg-destructive/10 text-destructive";
                    else if (hari.isMinggu) cls += " bg-chart-3/10 text-chart-3";
                    return (
                      <th key={hari.tanggal} className={cls}>
                        <div className="text-[10px] leading-tight">{hari.tanggal}/{report.bulan}</div>
                        <div className="text-[8px] opacity-60 leading-tight">{hari.namaHari.slice(0, 3)}</div>
                      </th>
                    );
                  })}
                  <th className="px-1 py-1 border-r text-center font-semibold text-foreground/80 min-w-[40px] text-[10px]">TJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-foreground/80 min-w-[40px] text-[10px]">KJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-foreground/80 min-w-[44px] text-[10px]">TOTAL KJK</th>
                  <th className="px-1 py-1 border-r text-center font-semibold text-foreground/80 min-w-[40px] text-[10px]">TJL</th>
                  <th className="px-1 py-1 text-center font-semibold text-foreground/80 min-w-[32px] text-[10px]">TKS</th>
                </tr>
              </thead>
              <tbody>
                {report.data.map((row, i) => (
                  <tr key={row.userId} className="border-b hover:bg-muted">
                    <td className="px-1 py-1 border-r text-center text-muted-foreground/60 text-[10px]">{i + 1}</td>
                    <td className="px-2 py-1 border-r text-foreground whitespace-nowrap">
                      {row.nip && <div className="text-[10px] text-muted-foreground/60">{row.nip}</div>}
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
                    <td className="px-1 py-1 border-r text-center font-semibold text-accent-foreground text-[10px]">{row.tjk}</td>
                    <td className={`px-1 py-1 border-r text-center font-semibold text-[10px] ${row.kjkMenit > 0 ? "text-destructive" : "text-muted-foreground/60"}`}>
                      {row.kjk}
                    </td>
                    <td className={`px-1 py-1 border-r text-center font-semibold text-[10px] ${row.kjkMenit > 0 ? "text-destructive" : "text-muted-foreground/60"}`}>
                      {row.totalKjk}
                    </td>
                    <td className="px-1 py-1 border-r text-center font-semibold text-accent-foreground text-[10px]">{row.tjl}</td>
                    <td className={`px-1 py-1 text-center font-semibold text-[10px] ${row.tks > 0 ? "text-destructive" : "text-muted-foreground/60"}`}>
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
                <h3 className="font-bold text-foreground/80 mb-1 text-xs">a. Kategori Absensi</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left px-1 py-0.5 font-semibold w-16">Kode</th>
                      <th className="text-left px-1 py-0.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.kategoriList.map((k) => (
                      <tr key={k.id} className="border-b border-border">
                        <td className="px-1 py-0.5 font-mono text-accent-foreground">{k.kode}</td>
                        <td className="px-1 py-0.5 text-muted-foreground">{k.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-3">
                <h3 className="font-bold text-foreground/80 mb-1 text-xs">b. Kode Total</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted border-b">
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
                      <tr key={kode} className="border-b border-border">
                        <td className="px-1 py-0.5 font-mono text-foreground">{kode}</td>
                        <td className="px-1 py-0.5 text-muted-foreground">{ket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border">
              <CardContent className="p-3">
                <h3 className="font-bold text-foreground/80 mb-1 text-xs">c. Kode Warna</h3>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left px-1 py-0.5 font-semibold w-16">Warna</th>
                      <th className="text-left px-1 py-0.5 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { warna: "bg-muted", label: "Abu-abu", ket: "Tidak Ada Jadwal" },
                      { warna: "bg-destructive/10", label: "Merah", ket: "Hari Libur" },
                      { warna: "bg-chart-3/10", label: "Kuning", ket: "Hari Minggu" },
                      { warna: "bg-accent/30", label: "Hijau", ket: "Absensi (kode kategori tercatat)" },
                    ].map((item) => (
                      <tr key={item.label} className="border-b border-border">
                        <td className="px-1 py-0.5">
                          <span className={`inline-block w-3 h-3 rounded ${item.warna} border border-border align-middle`}></span>
                          <span className="ml-1 text-foreground/80">{item.label}</span>
                        </td>
                        <td className="px-1 py-0.5 text-muted-foreground">{item.ket}</td>
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
          <CardContent className="p-8 text-center text-muted-foreground/60">
            Tidak ada data pegawai untuk periode ini
          </CardContent>
        </Card>
      )}
    </div>
  );
}
