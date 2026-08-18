import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Basic rate limiting headers (informational)
  response.headers.set('X-RateLimit-Policy', 'see-docs');
  
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
