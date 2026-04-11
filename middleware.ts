import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sf_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const host = (request.headers.get("host") || "").split(":")[0]?.toLowerCase();

  const appHost = "app.strateggyapp.com";
  const publicHosts = new Set(["strateggyapp.com", "www.strateggyapp.com"]);

  const isPublicHost = publicHosts.has(host);
  const isAppHost =
    host === appHost || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host === "";

  if (isPublicHost) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }

    if (pathname.startsWith("/privacy")) return NextResponse.next();
    if (pathname.startsWith("/landing")) return NextResponse.next();
    if (pathname.startsWith("/brand")) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.hostname = appHost;
    url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return NextResponse.next();
  if (pathname.startsWith("/privacy")) return NextResponse.next();

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (!isAppHost) return NextResponse.next();
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
