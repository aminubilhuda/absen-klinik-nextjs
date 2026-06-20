"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, CheckCircle, XCircle, Clock, Paperclip, X, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);

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

  const statusConfig = {
    APPROVED: { icon: CheckCircle, className: "bg-accent text-accent-foreground" },
    REJECTED: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
    PENDING: { icon: Clock, className: "bg-muted text-muted-foreground" },
  };

  function getStatusConfig(status: string) {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID");
  }

  function openPreview(url: string) {
    const isPdf = url.toLowerCase().endsWith(".pdf");
    setPreviewType(isPdf ? "pdf" : "image");
    setPreviewUrl(url);
  }

  return (
    <>
      {/* Pattern 8a: Curved teal header */}
      <div className="rounded-b-4xl bg-primary pb-12">
        <div className="px-5 pt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-primary-foreground flex-1">Izin / Cuti</h1>
            <Button
              size="sm"
              className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-2xl"
              onClick={openAdd}
            >
              <Plus className="size-4 mr-1" /> Ajukan
            </Button>
          </div>
          <p className="text-sm text-primary-foreground/70 mt-1">Kelola pengajuan izin dan cuti Anda</p>
        </div>
      </div>

      {/* Floating content */}
      <div className="px-5 -mt-4 space-y-4">

        {/* Form Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-4xl">
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
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {lampiran.mimeType === "application/pdf" ? (
                      <FileText className="size-5 text-destructive" />
                    ) : (
                      <img src={lampiran.base64} alt="preview" className="size-10 rounded object-cover" />
                    )}
                    <span className="text-sm text-muted-foreground truncate flex-1">{lampiran.fileName}</span>
                    <button type="button" onClick={() => setLampiran(null)} className="p-1">
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-start gap-2 text-sm text-muted-foreground"
                    onClick={() => setShowPicker(true)}
                  >
                    <Paperclip className="size-4" /> Tambah Lampiran
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
                disabled={loading}
              >
                {loading ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Kirim Pengajuan"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>

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

        {/* List */}
        {leaves.length === 0 ? (
          <div className="rounded-4xl bg-card shadow-sm p-8 text-center">
            <FileText className="size-12 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada pengajuan izin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((item) => {
              const status = getStatusConfig(item.status);
              const StatusIcon = status.icon;

              return (
                <div key={item.id} className="rounded-4xl bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className="bg-accent/30 text-accent-foreground border-0 text-xs">
                          {item.kategoriAbsensi?.kode || "-"}
                        </Badge>
                        <Badge className={`${status.className} border-0 text-xs`}>
                          {item.status}
                        </Badge>
                        {item.status === "PENDING" && (
                          <div className="flex items-center gap-1 ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{item.alasan}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(item.tanggalMulai)} — {formatDate(item.tanggalAkhir)}
                      </p>
                      {item.catatanAdmin && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Catatan admin: {item.catatanAdmin}
                        </p>
                      )}
                      {item.lampiranUrl && (
                        <button
                          onClick={() => openPreview(item.lampiranUrl!)}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                        >
                          <Paperclip className="size-3" />
                          Lihat Lampiran
                        </button>
                      )}
                    </div>
                    <StatusIcon className="size-5 shrink-0 ml-2" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lampiran Preview Modal */}
        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-card flex flex-col">
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <button onClick={() => { setPreviewUrl(null); setPreviewType(null); }} className="p-2 -ml-2 rounded-lg hover:bg-muted">
                <ArrowLeft className="size-5 text-foreground" />
              </button>
              <span className="text-sm font-semibold flex-1 text-foreground">Preview Lampiran</span>
              <button onClick={() => { setPreviewUrl(null); setPreviewType(null); }} className="p-2 -mr-2 rounded-lg hover:bg-muted">
                <X className="size-5 text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {previewType === "pdf" ? (
                <iframe src={previewUrl} className="w-full h-full border-0" />
              ) : (
                <img src={previewUrl} alt="Lampiran" className="w-full h-auto object-contain" />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
