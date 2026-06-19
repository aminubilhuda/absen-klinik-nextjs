"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Tags, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

interface Item {
  id: string;
  kode: string;
  keterangan: string;
  warnaLabel: string | null;
  isIzin: boolean;
}

export default function AdminKategoriAbsensiPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ kode: "", keterangan: "", warnaLabel: "", isIzin: false });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function loadData() {
    setLoading(true);
    fetch(`/api/kategori-absensi?page=${page}&limit=20&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((res) => {
        setItems(res.data || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => toast.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [page, search]);

  function openAdd() {
    setEditItem(null);
    setForm({ kode: "", keterangan: "", warnaLabel: "", isIzin: false });
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditItem(item);
    setForm({ kode: item.kode, keterangan: item.keterangan, warnaLabel: item.warnaLabel || "", isIzin: item.isIzin });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.kode.trim() || !form.keterangan.trim()) {
      toast.error("Kode dan keterangan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/kategori-absensi/${editItem.id}` : "/api/kategori-absensi";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editItem ? "Kategori diubah" : "Kategori ditambahkan");
        setDialogOpen(false);
        loadData();
      } else {
        toast.error(data.error || "Gagal menyimpan");
      }
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus kategori ini?")) return;
    try {
      const res = await fetch(`/api/kategori-absensi/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Kategori berhasil dihapus");
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">Kategori Absensi</h1>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Input
            placeholder="Cari kode atau keterangan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="w-20">Warna</TableHead>
                <TableHead className="w-16 text-center">Izin</TableHead>
                <TableHead className="w-28 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                    <Tags className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada kategori
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono font-medium">{item.kode}</TableCell>
                    <TableCell>{item.keterangan}</TableCell>
                    <TableCell>
                      {item.warnaLabel ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: item.warnaLabel }}
                          />
                          <span className="text-xs text-gray-500">{item.warnaLabel}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isIzin ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.isIzin ? "Ya" : "Tidak"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kode</Label>
                <Input
                  placeholder="Contoh: DL"
                  value={form.kode}
                  onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Warna Label</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.warnaLabel || "#000000"}
                    onChange={(e) => setForm({ ...form, warnaLabel: e.target.value })}
                    className="w-12 h-11 p-1"
                  />
                  <Input
                    placeholder="#000000"
                    value={form.warnaLabel}
                    onChange={(e) => setForm({ ...form, warnaLabel: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input
                placeholder="Contoh: Dinas Luar"
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isIzin}
                onChange={(e) => setForm({ ...form, isIzin: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium">Kategori izin (muncul di form pengajuan izin)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
