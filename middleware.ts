import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "es", "fr", "de"] as const;
type Locale = typeof locales[number];
const defaultLocale: Locale = "en";

export function middleware(request: NextRequest) {
  // Check if the request has a locale prefix
  const pathname = request.nextUrl.pathname;
  const localePrefix = locales.find(locale => pathname.startsWith(`/${locale}`));

  // If no locale prefix, redirect to default locale
  if (!localePrefix && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt (and other static files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};