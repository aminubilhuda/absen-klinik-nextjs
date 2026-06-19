import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "ADMIN") redirect("/admin");
    redirect("/karyawan/absen");
  }
  redirect("/login");
}
