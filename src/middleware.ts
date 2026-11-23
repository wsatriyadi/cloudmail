import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Di belakang reverse proxy, request.url memakai host internal Next
// (localhost:3000). Bangun origin publik dari header proxy agar redirect
// tidak mengarah ke localhost.
function publicOrigin(request: NextRequest) {
  const firstValue = (value: string | null) => value?.split(",")[0]?.trim();
  const host =
    firstValue(request.headers.get("x-forwarded-host")) ??
    firstValue(request.headers.get("host"));
  const proto =
    firstValue(request.headers.get("x-forwarded-proto")) ??
    (request.nextUrl.protocol === "https:" ? "https" : "http");

  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/generate") ||
    pathname.startsWith("/api/inbox") ||
    pathname.startsWith("/api/internal") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Protect dashboard routes — check for session token
  if (pathname.startsWith("/dashboard")) {
    const token =
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value;

    if (!token) {
      const loginUrl = new URL("/login", publicOrigin(request));
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
