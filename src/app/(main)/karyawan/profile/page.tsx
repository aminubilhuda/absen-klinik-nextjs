"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail, Phone, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const user = session?.user;
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profil Saya</h1>

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
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Nama</p>
                <p className="font-medium text-sm">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">No. HP</p>
                <p className="font-medium text-sm">-</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
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
