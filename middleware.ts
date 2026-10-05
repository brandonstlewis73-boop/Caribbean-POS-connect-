import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";
import { unsafeRequestReason } from "@/lib/request-security";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/online", "/store", "/track", "/privacy", "/contact"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const headers = { "Cache-Control": "private, no-store" };
    const reason = unsafeRequestReason(request, pathname);
    if (reason) return NextResponse.json({ error: reason }, { status: 403, headers });
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 8 * 1024 * 1024) return NextResponse.json({ error: "Request is too large." }, { status: 413, headers });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  if (pathname === "/" || pathname.startsWith("/_next/") || PUBLIC_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  try {
    if (!token) throw new Error("Missing session");
    await verifySession(token);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)", "/api/:path*"]
};
