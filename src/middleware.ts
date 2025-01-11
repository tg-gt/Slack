import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/sign-in'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static files
  if (publicPaths.includes(pathname) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // For all other routes, let the client-side auth handle it
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 