"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface UserItem {
  id: string;
  nama: string;
  email: string;
  noHp?: string;
  role: string;
  status: string;
  unitKerjaId?: string | null;
  createdAt: string;
}

export default function AdminKaryawanPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unitKerjaList, setUnitKerjaList] = useState<{ id: string; nama: string }[]>([]);

  useEffect(() => {
    fetch(`/api/users?page=${page}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      });
  }, [page]);

  useEffect(() => {
    fetch("/api/unit-kerja")
      .then((r) => r.json())
      .then((res) => setUnitKerjaList(res.data || []));
  }, []);

  async function handleAction(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/users/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: action === "approve" ? "ACTIVE" : "REJECTED" } : u))
      );
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Yakin ingin menonaktifkan karyawan ini?")) return;
    const res = await fetch(`/api/users/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "DEACTIVATED" } : u))
      );
    }
  }

  const filtered = users.filter(
    (u) => u.nama.toLowerCase().includes(filter.toLowerCase()) || u.email.toLowerCase().includes(filter.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-chart-3/20 text-chart-3",
      ACTIVE: "bg-accent/30 text-accent-foreground",
      REJECTED: "bg-destructive/10 text-destructive",
      DEACTIVATED: "bg-muted text-muted-foreground/60",
    };
    return map[s] || "bg-muted";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground">Data Karyawan</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <Input
          placeholder="Cari nama atau email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 h-11 bg-card border-border"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <Card key={user.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-accent/30 text-accent-foreground text-sm">
                    {user.nama.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.nama}</p>
                  <p className="text-xs text-muted-foreground/80 truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${statusBadge(user.status)} border-0 text-xs`}>
                      {user.status}
                    </Badge>
                    {user.unitKerjaId && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground/60 border-border">
                        {unitKerjaList.find((u) => u.id === user.unitKerjaId)?.nama || "-"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={user.unitKerjaId || ""}
                    onValueChange={async (v) => {
                      const val = v === "" ? null : v;
                      const res = await fetch(`/api/users/${user.id}/approve`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ unitKerjaId: val }),
                      });
                      if (res.ok) {
                        toast.success("Unit kerja diperbarui");
                        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, unitKerjaId: val } : u));
                      } else {
                        toast.error("Gagal memperbarui unit kerja");
                      }
                    }}
                    items={unitKerjaList.map(uk => ({ value: uk.id, label: uk.nama }))}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="Unit Kerja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tanpa Unit</SelectItem>
                      {unitKerjaList.map((uk) => (
                        <SelectItem key={uk.id} value={uk.id} className="text-xs">{uk.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {user.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 rounded-lg"
                    onClick={() => handleAction(user.id, "approve")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => handleAction(user.id, "reject")}
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Tolak
                  </Button>
                </div>
              )}
              {user.status === "ACTIVE" && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-border text-muted-foreground/60 rounded-lg"
                    onClick={() => handleDeactivate(user.id)}
                  >
                    Nonaktifkan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="border-0">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground/80">Tidak ada data karyawan</p>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground/60 px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
