"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    nama: "",
    email: "",
    noHp: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess("Registrasi berhasil! Silakan tunggu persetujuan admin.");
    setTimeout(() => router.push("/login"), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-2">
          <UserPlus className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-emerald-900">Daftar Akun</h1>
        <p className="text-sm text-gray-500">Daftar sebagai karyawan puskesmas</p>
      </div>

      <Card className="border-0 shadow-lg shadow-emerald-100/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Registrasi</CardTitle>
          <CardDescription>Isi data diri Anda dengan benar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                placeholder="Andi Pratama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noHp">No. HP</Label>
              <Input
                id="noHp"
                type="tel"
                placeholder="08123456789"
                value={form.noHp}
                onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
            )}
            {success && (
              <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">{success}</div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-base"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Daftar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-6">
          <p className="text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-emerald-600 font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
