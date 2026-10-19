import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public admin routes like the login page and public assets
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // 2. Protect Admin Pages (/admin, /admin/sheets, /admin/branding, etc.)
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("admin_session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect Admin API routes (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get("admin_session")?.value;
    const authHeader = request.headers.get("authorization");
    const customHeader = request.headers.get("x-admin-token");

    const hasCredential =
      !!sessionCookie ||
      (authHeader && authHeader.startsWith("Bearer ")) ||
      !!customHeader;

    if (!hasCredential) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Administrator session required." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
