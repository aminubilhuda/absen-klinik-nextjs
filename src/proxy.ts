import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get("authjs.session-token")?.value ||
                  request.cookies.get("__Secure-authjs.session-token")?.value;

  const isPublic = publicRoutes.some((r) => pathname.startsWith(r));

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session && !pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
