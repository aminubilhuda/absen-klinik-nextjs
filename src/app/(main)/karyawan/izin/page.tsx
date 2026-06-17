"use client";

import { useState, useEffect } from "react";
import { Plus, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaveItem {
  id: string;
  jenis: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  status: string;
  catatanAdmin?: string;
}

export default function IzinPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    jenis: "IZIN",
    tanggalMulai: "",
    tanggalAkhir: "",
    alasan: "",
  });

  useEffect(() => {
    fetch("/api/leave")
      .then((r) => r.json())
      .then((data) => setLeaves(data.leaves || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ jenis: "IZIN", tanggalMulai: "", tanggalAkhir: "", alasan: "" });
      fetch("/api/leave")
        .then((r) => r.json())
        .then((data) => setLeaves(data.leaves || []));
    }
    setLoading(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Izin / Cuti</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" />}>
            <Plus className="w-4 h-4 mr-1" /> Ajukan
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Ajukan Izin / Cuti</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4 px-1">
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v ?? "" })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IZIN">Izin</SelectItem>
                    <SelectItem value="SAKIT">Sakit</SelectItem>
                    <SelectItem value="CUTI">Cuti</SelectItem>
                  </SelectContent>
                </Select>
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
              <Button
                type="submit"
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? "Mengirim..." : "Kirim Pengajuan"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

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
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                        {item.jenis}
                      </Badge>
                      <Badge className={`${statusColor(item.status)} text-xs`}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-2">{item.alasan}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.tanggalMulai).toLocaleDateString("id-ID")} — {new Date(item.tanggalAkhir).toLocaleDateString("id-ID")}
                    </p>
                    {item.catatanAdmin && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Catatan admin: {item.catatanAdmin}
                      </p>
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
