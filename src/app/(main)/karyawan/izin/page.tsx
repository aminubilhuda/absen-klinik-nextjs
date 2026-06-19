"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, CheckCircle, XCircle, Clock, Paperclip, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import CameraCaptureIzin from "@/components/CameraCaptureIzin";
import LampiranPicker from "@/components/LampiranPicker";

interface KategoriItem {
  id: string;
  kode: string;
  keterangan: string;
}

interface LampiranResult {
  base64: string;
  fileName: string;
  mimeType: string;
}

interface LeaveItem {
  id: string;
  kategoriAbsensiId: string;
  kategoriAbsensi: KategoriItem;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  status: string;
  catatanAdmin?: string;
  lampiranUrl?: string;
}

export default function IzinPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    kategoriAbsensiId: "",
    tanggalMulai: "",
    tanggalAkhir: "",
    alasan: "",
  });
  const [lampiran, setLampiran] = useState<LampiranResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchLeaves = useCallback(() => {
    fetch("/api/leave")
      .then((r) => r.json())
      .then((data) => setLeaves(data.leaves || []));
  }, []);

  useEffect(() => {
    fetchLeaves();
    fetch("/api/kategori-absensi?isIzin=true")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.data || []).map((k: any) => ({ id: k.id, kode: k.kode, keterangan: k.keterangan }));
        setKategoriList(list);
      });
  }, [fetchLeaves]);

  useEffect(() => {
    function onOpenCamera() {
      setShowPicker(false);
      setShowCamera(true);
    }
    window.addEventListener("open-camera-izin", onOpenCamera);
    return () => window.removeEventListener("open-camera-izin", onOpenCamera);
  }, []);

  function openAdd() {
    setEditId(null);
    setForm({ kategoriAbsensiId: "", tanggalMulai: "", tanggalAkhir: "", alasan: "" });
    setLampiran(null);
    setOpen(true);
  }

  function openEdit(item: LeaveItem) {
    setEditId(item.id);
    setForm({
      kategoriAbsensiId: item.kategoriAbsensiId || "",
      tanggalMulai: item.tanggalMulai.split("T")[0],
      tanggalAkhir: item.tanggalAkhir.split("T")[0],
      alasan: item.alasan,
    });
    setLampiran(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kategoriAbsensiId) {
      toast.error("Pilih jenis izin");
      return;
    }
    if (form.tanggalAkhir < form.tanggalMulai) {
      toast.error("Tanggal akhir tidak boleh sebelum tanggal mulai");
      return;
    }
    setLoading(true);
    const isEdit = !!editId;
    const url = isEdit ? `/api/leave/${editId}` : "/api/leave";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lampiran }),
    });
    if (res.ok) {
      toast.success(isEdit ? "Pengajuan berhasil diubah" : "Pengajuan berhasil dikirim");
      setOpen(false);
      setEditId(null);
      setForm({ kategoriAbsensiId: "", tanggalMulai: "", tanggalAkhir: "", alasan: "" });
      setLampiran(null);
      fetchLeaves();
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal menyimpan pengajuan");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus pengajuan ini?")) return;
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pengajuan berhasil dihapus");
      fetchLeaves();
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal menghapus pengajuan");
    }
  }

  const statusIcon = (s: string) => {
    if (s === "APPROVED") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (s === "REJECTED") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusColor = (s: string) => {
    if (s === "APPROVED") return "bg-emerald-100 text-emerald-700 border-0";
    if (s === "REJECTED") return "bg-red-100 text-red-600 border-0";
    return "bg-amber-100 text-amber-700 border-0";
  };

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Izin / Cuti</h1>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Ajukan
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{editId ? "Ubah Pengajuan" : "Ajukan Izin / Cuti"}</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4 px-1">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <select
                  value={form.kategoriAbsensiId}
                  onChange={(e) => setForm({ ...form, kategoriAbsensiId: e.target.value })}
                  required
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Pilih jenis</option>
                  {kategoriList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.kode} — {k.keterangan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={form.tanggalMulai}
                    onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Akhir</Label>
                  <Input
                    type="date"
                    value={form.tanggalAkhir}
                    onChange={(e) => setForm({ ...form, tanggalAkhir: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alasan</Label>
                <Textarea
                  placeholder="Tuliskan alasan pengajuan..."
                  value={form.alasan}
                  onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                  required
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Lampiran (opsional)</Label>
                {lampiran ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    {lampiran.mimeType === "application/pdf" ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : (
                      <img src={lampiran.base64} alt="preview" className="w-10 h-10 rounded object-cover" />
                    )}
                    <span className="text-sm text-gray-600 truncate flex-1">{lampiran.fileName}</span>
                    <button type="button" onClick={() => setLampiran(null)} className="p-1">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-start gap-2 text-sm text-gray-500"
                    onClick={() => setShowPicker(true)}
                  >
                    <Paperclip className="w-4 h-4" /> Tambah Lampiran
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Kirim Pengajuan"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Lampiran Picker Overlay */}
      {showPicker && !showCamera && (
        <LampiranPicker
          onCapture={(result) => {
            setLampiran(result);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Camera Overlay */}
      {showCamera && (
        <CameraCaptureIzin
          onCapture={(base64) => {
            setLampiran({ base64, fileName: "foto.jpg", mimeType: "image/jpeg" });
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {leaves.length === 0 ? (
        <Card className="border-0">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada pengajuan izin</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaves.map((item) => (
            <Card key={item.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                        {item.kategoriAbsensi?.kode || "-"}
                      </Badge>
                      <Badge className={`${statusColor(item.status)} text-xs`}>
                        {item.status}
                      </Badge>
                      {item.status === "PENDING" && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-2">{item.alasan}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(item.tanggalMulai)} — {formatDate(item.tanggalAkhir)}
                    </p>
                    {item.catatanAdmin && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Catatan admin: {item.catatanAdmin}
                      </p>
                    )}
                    {item.lampiranUrl && (
                      <a
                        href={item.lampiranUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:underline"
                      >
                        <Paperclip className="w-3 h-3" />
                        Lihat Lampiran
                      </a>
                    )}
                  </div>
                  {statusIcon(item.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
