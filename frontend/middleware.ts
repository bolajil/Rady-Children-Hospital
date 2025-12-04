import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes (login page) without auth
  const publicPaths = ['/login'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Read auth cookie
  const token = req.cookies.get('auth_token')?.value;

  // If no token, redirect to /login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Token exists → continue
  return NextResponse.next();
}

// Apply middleware to all pages except API and static assets
export const config = {
  matcher: [
    // run for all paths except these prefixes
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};
