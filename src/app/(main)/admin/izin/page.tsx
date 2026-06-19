"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, MessageSquare, Search, Paperclip, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface KategoriItem {
  id: string;
  kode: string;
  keterangan: string;
}

interface LeaveItem {
  id: string;
  user: { nama: string; email: string };
  kategoriAbsensi?: KategoriItem;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  status: string;
  catatanAdmin?: string;
  lampiranUrl?: string;
}

export default function AdminIzinPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LeaveItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/leave")
      .then((r) => r.json())
      .then((data) => setLeaves(data.leaves || []));
  }, []);

  async function handleReview(id: string, status: string) {
    const res = await fetch(`/api/leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, catatanAdmin: catatan }),
    });
    if (res.ok) {
      toast.success(status === "APPROVED" ? "Izin disetujui" : "Izin ditolak");
      setDialogOpen(false);
      setSelected(null);
      setCatatan("");
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status, catatanAdmin: catatan } : l))
      );
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal memproses");
    }
  }

  const filtered = leaves.filter(
    (l) =>
      l.user.nama.toLowerCase().includes(search.toLowerCase()) ||
      (l.kategoriAbsensi?.kode || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.kategoriAbsensi?.keterangan || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    if (s === "APPROVED") return "bg-emerald-100 text-emerald-700";
    if (s === "REJECTED") return "bg-red-100 text-red-600";
    return "bg-amber-100 text-amber-700";
  };

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("id-ID");
  }

  function LampiranPreview({ url }: { url: string }) {
    const isPdf = url.endsWith(".pdf");
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline"
      >
        {isPdf ? (
          <FileText className="w-3.5 h-3.5" />
        ) : (
          <img src={url} alt="lampiran" className="w-8 h-8 rounded object-cover" />
        )}
        <span>Lihat Lampiran</span>
      </a>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Pengajuan Izin</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cari..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((leave) => (
          <Card key={leave.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{leave.user.nama}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                      {leave.kategoriAbsensi?.kode || "-"}
                    </Badge>
                    <Badge className={`${statusBadge(leave.status)} border-0 text-xs`}>{leave.status}</Badge>
                  </div>
                </div>
                {leave.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg shrink-0"
                    onClick={() => {
                      setSelected(leave);
                      setCatatan(leave.catatanAdmin || "");
                      setDialogOpen(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" /> Review
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-600">{leave.alasan}</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-gray-400">
                  {formatDate(leave.tanggalMulai)} — {formatDate(leave.tanggalAkhir)}
                </p>
                {leave.lampiranUrl && <LampiranPreview url={leave.lampiranUrl} />}
              </div>
              {leave.catatanAdmin && (
                <p className="text-xs text-gray-500 mt-2 italic">
                  Catatan: {leave.catatanAdmin}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setSelected(null); setCatatan(""); } }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Review Pengajuan</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{selected.user.nama}</strong> — {selected.kategoriAbsensi?.kode || "-"} ({selected.kategoriAbsensi?.keterangan || ""})
              </p>
              <p className="text-sm text-gray-600">{selected.alasan}</p>
              <p className="text-xs text-gray-400">
                {formatDate(selected.tanggalMulai)} — {formatDate(selected.tanggalAkhir)}
              </p>
              {selected.lampiranUrl && (
                <div className="pt-1">
                  <p className="text-xs text-gray-500 mb-1">Lampiran:</p>
                  {selected.lampiranUrl.endsWith(".pdf") ? (
                    <a
                      href={selected.lampiranUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                    >
                      <FileText className="w-4 h-4" /> Buka Lampiran
                    </a>
                  ) : (
                    <a href={selected.lampiranUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selected.lampiranUrl}
                        alt="lampiran"
                        className="max-h-40 rounded-lg object-cover border"
                      />
                    </a>
                  )}
                </div>
              )}
              <Textarea
                placeholder="Catatan (opsional)..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleReview(selected.id, "APPROVED")}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleReview(selected.id, "REJECTED")}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Tolak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
