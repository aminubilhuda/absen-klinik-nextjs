"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface HariLiburItem {
  id: string;
  tanggal: string;
  keterangan: string;
  createdAt: string;
}

const TAHUN_LIST = Array.from({ length: 11 }, (_, i) => 2020 + i);
const BULAN_LIST = [
  { value: "", label: "Semua Bulan" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][i] })),
];

export default function AdminHariLiburPage() {
  const [items, setItems] = useState<HariLiburItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTanggal, setFormTanggal] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  function loadData() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterYear) params.set("year", filterYear);
    if (filterMonth) params.set("month", filterMonth);

    fetch(`/api/hari-libur?${params}`)
      .then((r) => r.json())
      .then((res) => setItems(res.data || []))
      .catch(() => toast.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [filterYear, filterMonth]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/hari-libur/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahun: parseInt(filterYear) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Sinkronisasi berhasil");
        loadData();
      } else {
        toast.error(data.error || "Gagal sinkronisasi");
      }
    } catch {
      toast.error("Gagal sinkronisasi");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!formTanggal || !formKeterangan) {
      toast.error("Semua field wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/hari-libur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal: formTanggal, keterangan: formKeterangan }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Hari libur berhasil ditambahkan");
        setDialogOpen(false);
        setFormTanggal("");
        setFormKeterangan("");
        loadData();
      } else {
        toast.error(data.error || "Gagal menambah");
      }
    } catch {
      toast.error("Gagal menambah hari libur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus hari libur ini?")) return;
    try {
      const res = await fetch(`/api/hari-libur/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Hari libur berhasil dihapus");
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error("Gagal menghapus");
      }
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function isWeekend(dateStr: string) {
    const day = new Date(dateStr).getDay();
    return day === 0;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Hari Libur Nasional</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-accent text-accent-foreground"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Menyinkronkan..." : "Sync Libur Nasional"}
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3 mb-4">
            <div className="w-40">
              <Label>Tahun</Label>
              <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? String(new Date().getFullYear()))}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAHUN_LIST.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label>Bulan</Label>
              <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v ?? "")} items={BULAN_LIST.slice(1).map(b => ({ value: b.value, label: b.label }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Semua Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_LIST.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="w-20 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground/60">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground/60">
                      Belum ada data hari libur. Klik "Sync Libur Nasional" untuk mengambil data dari API.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className={isWeekend(item.tanggal) ? "text-destructive" : ""}>
                          {formatDate(item.tanggal)}
                        </span>
                        {isWeekend(item.tanggal) && (
                          <Badge variant="outline" className="ml-2 text-[10px] text-destructive border-destructive/30">
                            Minggu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.keterangan}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Hari Libur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input
                type="text"
                placeholder="Contoh: Cuti Bersama Idul Fitri"
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
              />
            </div>
          </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
