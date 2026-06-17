"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Mail, Phone, Shield, Save, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState("");
  const [noHp, setNoHp] = useState("");
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setNama(session.user.name);
  }, [session]);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.noHp) setNoHp(data.noHp);
      });
  }, []);

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, noHp }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      setEditing(false);
      await update();
    } else {
      toast.error(data.error || "Gagal menyimpan");
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    if (!passwordLama || !passwordBaru) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/users/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passwordLama, passwordBaru }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
      setPasswordLama("");
      setPasswordBaru("");
    } else {
      toast.error(data.error || "Gagal mengubah password");
    }
    setSavingPassword(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            <X className="w-4 h-4 mr-1" /> Batal
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
        <Avatar className="w-20 h-20 border-4 border-white/30">
          <AvatarFallback className="text-2xl font-bold bg-emerald-500">{initials}</AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold mt-3">{user?.name}</h2>
        <Badge className="mt-2 bg-white/20 text-white border-0">
          <Shield className="w-3 h-3 mr-1" />
          {(user as any)?.role || "KARYAWAN"}
        </Badge>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              disabled={!editing}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="h-11 bg-gray-50 cursor-not-allowed" />
          </div>

          <div className="space-y-2">
            <Label>No. HP</Label>
            <Input
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              disabled={!editing}
              placeholder="Contoh: 08123456789"
              className="h-11"
            />
          </div>

          {editing && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Ubah Password</h2>
          </div>

          <div className="space-y-2">
            <Label>Password Lama</Label>
            <Input
              type="password"
              value={passwordLama}
              onChange={(e) => setPasswordLama(e.target.value)}
              placeholder="Masukkan password lama"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Password Baru</Label>
            <Input
              type="password"
              value={passwordBaru}
              onChange={(e) => setPasswordBaru(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="h-11"
            />
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !passwordLama || !passwordBaru}
            variant="outline"
            className="w-full h-11"
          >
            <Lock className="w-4 h-4 mr-2" />
            {savingPassword ? "Menyimpan..." : "Ubah Password"}
          </Button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Keluar
      </Button>
    </div>
  );
}
