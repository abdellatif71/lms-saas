import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';

const handleLocale = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/dashboard')) {
    const sessionCookie =
      request.cookies.get('authjs.session-token')?.value ??
      request.cookies.get('__Secure-authjs.session-token')?.value;

    if (!sessionCookie) {
      const segments = pathname.split('/').filter(Boolean);
      const locale = ['ar', 'fr', 'en'].includes(segments.at(0) ?? '') ? (segments.at(0) ?? 'en') : 'en';
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return handleLocale(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
