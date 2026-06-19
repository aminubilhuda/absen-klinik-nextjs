"use client";

import { useState, useEffect } from "react";
import { Download, Search, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface UserItem {
  id: string;
  nama: string;
}

interface RecordItem {
  id: string;
  user: { nama: string };
  tanggal: string;
  waktuCheckin?: string;
  waktuCheckout?: string;
  status: string;
  menitTerlambat?: number;
  jarakCheckin?: number;
}

export default function AdminLaporanPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetch("/api/users?role=KARYAWAN")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []));
  }, []);

  useEffect(() => {
    setRecords([]);
  }, [filters]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal memuat data");
        setRecords([]);
        return;
      }
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      toast.error("Terjadi kesalahan saat memuat data");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function exportData(format: "xlsx" | "pdf") {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, format }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Gagal mengekspor data");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-absensi.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Berhasil mengekspor ${format.toUpperCase()}`);
    } catch {
      toast.error("Terjadi kesalahan saat mengekspor");
    }
  }

  const summary = {
    hadir: records.filter((r) => r.waktuCheckin && r.status === "TEPAT_WAKTU").length,
    terlambat: records.filter((r) => r.status === "TERLAMBAT").length,
    alpha: records.filter((r) => !r.waktuCheckin).length,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Laporan Kehadiran</h1>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Label>Karyawan</Label>
            <Select value={filters.userId || null} onValueChange={(v) => setFilters({ ...filters, userId: v ?? "" })} items={users.map(u => ({ value: u.id, label: u.nama }))}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Semua karyawan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua karyawan</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Memuat..." : "Tampilkan"}
          </Button>
        </CardContent>
      </Card>

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-0 bg-emerald-50">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{summary.hadir}</p>
                <p className="text-xs text-emerald-600">Hadir</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-amber-50">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-amber-700">{summary.terlambat}</p>
                <p className="text-xs text-amber-600">Terlambat</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-red-50">
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-red-600">{summary.alpha}</p>
                <p className="text-xs text-red-500">Alpha</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
              onClick={() => exportData("xlsx")}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
              onClick={() => exportData("pdf")}
            >
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
          </div>

          <Card className="border-0 shadow-sm overflow-x-auto">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jarak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.user.nama}</TableCell>
                      <TableCell>{new Date(r.tanggal).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>{r.waktuCheckin ? (() => { const d = new Date(r.waktuCheckin); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; })() : "-"}</TableCell>
                      <TableCell>{r.waktuCheckout ? (() => { const d = new Date(r.waktuCheckout); return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; })() : "-"}</TableCell>
                      <TableCell>
                        <Badge className={r.status === "TEPAT_WAKTU" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                          {r.status === "TEPAT_WAKTU" ? "Tepat Waktu" : `Terlambat ${r.menitTerlambat ?? 0}m`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.jarakCheckin ? `${r.jarakCheckin.toFixed(0)}m` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
