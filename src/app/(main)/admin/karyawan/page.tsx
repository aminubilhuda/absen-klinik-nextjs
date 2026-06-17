"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserItem {
  id: string;
  nama: string;
  email: string;
  noHp?: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminKaryawanPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []));
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
      PENDING: "bg-amber-100 text-amber-700",
      ACTIVE: "bg-emerald-100 text-emerald-700",
      REJECTED: "bg-red-100 text-red-600",
      DEACTIVATED: "bg-gray-100 text-gray-500",
    };
    return map[s] || "bg-gray-100";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Data Karyawan</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Cari nama atau email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 h-11 bg-white border-gray-200"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((user) => (
          <Card key={user.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {user.nama.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.nama}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <Badge className={`${statusBadge(user.status)} border-0 text-xs`}>
                  {user.status}
                </Badge>
              </div>
              {user.status === "PENDING" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    onClick={() => handleAction(user.id, "approve")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
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
                    className="w-full border-gray-200 text-gray-500 rounded-lg"
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
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Tidak ada data karyawan</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
