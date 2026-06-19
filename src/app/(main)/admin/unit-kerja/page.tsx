"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
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

interface UnitKerjaItem {
  id: string;
  nama: string;
  createdAt: string;
}

export default function AdminUnitKerjaPage() {
  const [items, setItems] = useState<UnitKerjaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<UnitKerjaItem | null>(null);
  const [formNama, setFormNama] = useState("");
  const [saving, setSaving] = useState(false);

  function loadData() {
    setLoading(true);
    fetch("/api/unit-kerja")
      .then((r) => r.json())
      .then((res) => setItems(res.data || []))
      .catch(() => toast.error("Gagal memuat data"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setEditItem(null);
    setFormNama("");
    setDialogOpen(true);
  }

  function openEdit(item: UnitKerjaItem) {
    setEditItem(item);
    setFormNama(item.nama);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formNama.trim()) {
      toast.error("Nama unit kerja wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const url = editItem ? `/api/unit-kerja/${editItem.id}` : "/api/unit-kerja";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: formNama.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editItem ? "Unit kerja diubah" : "Unit kerja ditambahkan");
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
    if (!confirm("Yakin ingin menghapus unit kerja ini?")) return;
    try {
      const res = await fetch(`/api/unit-kerja/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Unit kerja berhasil dihapus");
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error(data.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Unit Kerja</h1>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={openAdd}
        >
          <Plus className="w-4 h-4 mr-1" /> Tambah
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Nama Unit Kerja</TableHead>
                <TableHead className="w-28 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada unit kerja
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{item.nama}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                        >
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Unit Kerja" : "Tambah Unit Kerja"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Unit Kerja</Label>
              <Input
                type="text"
                placeholder="Contoh: Puskesmas Palang"
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSave}
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
