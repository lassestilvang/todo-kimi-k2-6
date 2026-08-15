import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Locale } from './src/i18n/config';

const locales = ['en', 'es', 'fr', 'de'] as const;
const defaultLocale: Locale = 'en';

export function middleware(request: NextRequest) {
  // Check if the request has a locale prefix
  const pathname = request.nextUrl.pathname;
  const localePrefix = locales.find(locale =>
    pathname.startsWith(`/${locale}`)
  );

  // If no locale prefix, redirect to default locale
  // But don't redirect API routes, static files, or root path for home page
  if (
    !localePrefix &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/register')
  ) {
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
     * - auth, login, register (authentication pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|auth|login|register).*)',
  ],
};
