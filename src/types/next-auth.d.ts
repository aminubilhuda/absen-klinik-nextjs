import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "KARYAWAN" | "ADMIN";
      status: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "KARYAWAN" | "ADMIN";
    status: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "KARYAWAN" | "ADMIN";
    status: string;
  }
}
