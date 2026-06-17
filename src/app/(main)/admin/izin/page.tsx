"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface LeaveItem {
  id: string;
  user: { nama: string; email: string };
  jenis: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  status: string;
  catatanAdmin?: string;
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
      setCatatan("");
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status, catatanAdmin: catatan } : l))
      );
    }
  }

  const filtered = leaves.filter(
    (l) =>
      l.user.nama.toLowerCase().includes(search.toLowerCase()) ||
      l.jenis.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (s: string) => {
    if (s === "APPROVED") return "bg-emerald-100 text-emerald-700";
    if (s === "REJECTED") return "bg-red-100 text-red-600";
    return "bg-amber-100 text-amber-700";
  };

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
                <div>
                  <p className="font-medium text-sm">{leave.user.nama}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">{leave.jenis}</Badge>
                    <Badge className={`${statusBadge(leave.status)} border-0 text-xs`}>{leave.status}</Badge>
                  </div>
                </div>
                {leave.status === "PENDING" && (
                  <Dialog open={dialogOpen && selected?.id === leave.id} onOpenChange={(open) => { setDialogOpen(open); setSelected(leave); }}>
                    <DialogTrigger render={<Button size="sm" variant="outline" className="rounded-lg" />}>
                      <MessageSquare className="w-4 h-4 mr-1" /> Review
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Review Pengajuan</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <p className="text-sm">
                          <strong>{leave.user.nama}</strong> — {leave.jenis}
                        </p>
                        <p className="text-sm text-gray-600">{leave.alasan}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(leave.tanggalMulai).toLocaleDateString("id-ID")} — {new Date(leave.tanggalAkhir).toLocaleDateString("id-ID")}
                        </p>
                        <Textarea
                          placeholder="Catatan (opsional)..."
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleReview(leave.id, "APPROVED")}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleReview(leave.id, "REJECTED")}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Tolak
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
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
    </div>
  );
}
