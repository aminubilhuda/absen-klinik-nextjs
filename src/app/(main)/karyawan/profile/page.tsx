"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Save, X, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <>
      {/* Pattern 8a: Curved teal header with avatar */}
      <div className="rounded-b-4xl bg-primary pb-12">
        <div className="px-5 pt-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-primary-foreground">Profil Saya</h1>
          {!editing ? (
            <Button
              variant="ghost"
              size="sm"
              className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-xl font-medium"
              onClick={() => setEditing(true)}
            >
              <svg className="size-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Edit
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setEditing(false)}
            >
              <X className="size-4 mr-1" /> Batal
            </Button>
          )}
        </div>
      </div>

      {/* Floating content */}
      <div className="px-5 -mt-12 space-y-5">
        {/* Avatar card — floating on top */}
        <div className="flex flex-col items-center">
          <div className="rounded-full p-1 bg-card shadow-sm">
            <Avatar className="size-20">
              <AvatarFallback className="text-2xl font-bold bg-accent/30 text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <h2 className="text-lg font-semibold text-foreground mt-3">{user?.name}</h2>
          <Badge className="mt-1.5 bg-accent/30 text-accent-foreground border-0">
            <Shield className="size-3 mr-1" />
            {(user as any)?.role || "KARYAWAN"}
          </Badge>
        </div>

        {/* Info card */}
        <div className="rounded-4xl bg-card p-5 shadow-sm space-y-4">
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
            <Input value={user?.email || ""} disabled className="h-11 bg-muted cursor-not-allowed text-muted-foreground" />
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
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
            >
              <Save className="size-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          )}
        </div>

        {/* Password card */}
        <div className="rounded-4xl bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Ubah Password</h2>
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
            <Lock className="size-4 mr-2" />
            {savingPassword ? "Menyimpan..." : "Ubah Password"}
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-14 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-base font-medium"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-5 mr-2" />
          Keluar
        </Button>
      </div>
    </>
  );
}
